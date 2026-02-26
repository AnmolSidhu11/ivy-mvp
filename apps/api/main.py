from __future__ import annotations

import datetime
import json
import os
import uuid
from typing import Any, Dict, List, Optional

import psycopg
from fastapi import Depends, FastAPI
from pydantic import BaseModel

try:
    from anthropic import Anthropic  # type: ignore
except Exception:
    Anthropic = None  # type: ignore

POSTGRES_DSN = os.getenv(
    "POSTGRES_DSN",
    "postgresql://postgres:postgres@localhost:5432/sanofi",
)

app = FastAPI(title="IVY – Intelligent Visit Assistant API", version="0.1.0")


def get_conn():
    conn = psycopg.connect(POSTGRES_DSN)
    try:
        yield conn
    finally:
        conn.close()


# --- Repository ---


def append_event(
    conn: psycopg.Connection,
    event_type: str,
    payload_json: Dict[str, Any],
    user_id: Optional[str],
    hcp_id: Optional[str],
    idempotency_key: str,
) -> uuid.UUID:
    payload_str = json.dumps(payload_json)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO events_raw (event_type, payload_json, user_id, hcp_id, idempotency_key)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (idempotency_key) DO UPDATE SET event_type = EXCLUDED.event_type
            RETURNING event_id
            """,
            (event_type, payload_str, user_id, hcp_id, idempotency_key),
        )
        row = cur.fetchone()
        assert row is not None
        event_id = row[0]
        cur.execute(
            """
            INSERT INTO sync_status (event_id, status)
            VALUES (%s, 'pending')
            ON CONFLICT (event_id) DO UPDATE SET status = 'pending', updated_at = NOW()
            """,
            (event_id,),
        )
    conn.commit()
    return event_id


def save_call_draft(
    conn: psycopg.Connection,
    draft_id: uuid.UUID,
    user_id: Optional[str],
    hcp_id: Optional[str],
    event_id: uuid.UUID,
    draft_json: Dict[str, Any],
) -> None:
    draft_str = json.dumps(draft_json)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO call_drafts (draft_id, user_id, hcp_id, event_id, draft_json)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (draft_id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                hcp_id = EXCLUDED.hcp_id,
                event_id = EXCLUDED.event_id,
                draft_json = EXCLUDED.draft_json,
                updated_at = NOW()
            """,
            (draft_id, user_id, hcp_id, event_id, draft_str),
        )
    conn.commit()


def get_call_draft(
    conn: psycopg.Connection,
    draft_id: uuid.UUID,
) -> Optional[Dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT draft_id, user_id, hcp_id, event_id, draft_json, updated_at
            FROM call_drafts WHERE draft_id = %s
            """,
            (draft_id,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {
        "draft_id": str(row[0]),
        "user_id": row[1],
        "hcp_id": row[2],
        "event_id": str(row[3]),
        "draft_json": row[4],
        "updated_at": row[5].isoformat() if row[5] else None,
    }


class HealthResponse(BaseModel):
    ok: bool
    time: str


class PrecallPayload(BaseModel):
    calendar_event: Dict[str, Any]
    hcp_profile: Dict[str, Any]
    last_call_reports: List[Dict[str, Any]] = []
    product_priorities: List[str] = []
    approved_product_snippets: List[Dict[str, Any]] = []


class CallReportPayload(BaseModel):
    user_id: str
    hcp_id: str
    datetime_local: str
    channel: str
    transcript_text: str
    extracted_text_from_image: Optional[str] = None
    product_catalog: Dict[str, Any]
    required_fields_config: Dict[str, Any]
    idempotency_key: Optional[str] = None  # if omitted, derived from user_id + hcp_id + datetime_local


class ExpensePayload(BaseModel):
    receipt_text: str
    rep_note: Optional[str] = None
    policy_rules: Dict[str, Any]
    hcp_context: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = None


class CompliancePayload(BaseModel):
    call_report: Dict[str, Any]
    transcript_text: str
    compliance_knowledge_base: Optional[Dict[str, Any]] = None


def _anthropic_client() -> Optional["Anthropic"]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or Anthropic is None:
        return None
    return Anthropic(api_key=api_key)


SYSTEM_GLOBAL = """You are a pharma field sales assistant for Sanofi.
Hard rules:
1) Never provide patient-specific medical advice or individualized dosing recommendations.
2) Only use approved product claims from the provided product knowledge base. If uncertain, say you're not sure and ask to check Medical/Legal/Regulatory (MLR) approved content.
3) Always maintain fair balance: if benefits are discussed, surface relevant risk language or direct the rep to the approved risk section.
4) Minimize sensitive data: do not store patient identifiers. If detected, redact them and warn the user.
5) Output must be structured JSON whenever asked. Do not add extra keys. If required fields are missing, ask concise follow-up questions until complete.
"""

PRECALL_TASK = """TASK: Create a pre-call brief for the next scheduled HCP visit.

Return JSON:
{
  "hcp_id": "...",
  "call_objective_suggestions": [..],
  "last_interaction_summary": "...",
  "open_loops": [..],
  "recommended_products_to_focus": [..],
  "compliance_reminders": [..],
  "questions_to_ask": [..],
  "materials_to_bring": [..]
}
"""

CALLREPORT_TASK = """TASK: Convert rep's raw inputs (voice transcript + optional image OCR text + quick tags) into a compliant CallReport JSON.
Then run a required-fields checklist and ask for missing items.

Output 1: CallReport JSON (strict schema).
Output 2 (if missing fields): a short list of clarifying questions, maximum 3 at a time.
"""

EXPENSE_TASK = """TASK: Build an ExpenseReport JSON from receipt text and rep notes. Validate policy constraints and flag exceptions.

Return JSON with:
  "expense_id", "user_id", "date", "category", "amount", "currency",
  "attendees", "business_purpose", "policy_flags", "ready_to_submit", "missing_fields".
"""

COMPLIANCE_TASK = """TASK: Review the drafted CallReport JSON + the raw transcript. Use the compliance knowledge base to detect risks.

Return JSON:
{
  "is_compliant_to_submit": true|false,
  "issues": [
    {"severity":"high|medium|low","type":"fair_balance|off_label|patient_specific|privacy|expense_policy","detail":"..."}
  ],
  "required_edits": ["..."],
  "suggested_safe_rewrite": "..."
}
"""


def _claude_json(system: str, user: str) -> Dict[str, Any]:
    """
    Helper that calls Anthropic and parses JSON.
    If Anthropic is not configured, returns a simple stub response.
    """
    client = _anthropic_client()
    if client is None:
        # Stubbed response for local development without Anthropic.
        return {
            "stub": True,
            "system": system.splitlines()[0],
            "echo_user": user[:5000],
        }

    msg = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),
        max_tokens=1200,
        system=system + "\nReturn ONLY valid JSON.",
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(
        [b.text for b in msg.content if hasattr(b, "text")]  # type: ignore[attr-defined]
    )
    return json.loads(text)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """
    Lightweight health check for probes and uptime checks.
    """
    return HealthResponse(ok=True, time=datetime.datetime.now().isoformat())


@app.post("/precall")
def precall(payload: PrecallPayload) -> Dict[str, Any]:
    """
    Generate a pre-call brief JSON for the next scheduled HCP visit.
    """
    system = SYSTEM_GLOBAL + "\n\n" + PRECALL_TASK
    user = json.dumps(payload.model_dump(), indent=2)
    return _claude_json(system, user)


@app.post("/callreport")
def call_report(
    payload: CallReportPayload,
    conn: psycopg.Connection = Depends(get_conn),
) -> Dict[str, Any]:
    """
    Convert transcript + optional OCR into CallReport JSON; store draft and append CALL_REPORT_CREATED (and SAFETY_TRIGGERED if AE).
    """
    system = SYSTEM_GLOBAL + "\n\n" + CALLREPORT_TASK
    user = json.dumps(payload.model_dump(exclude_none=True), indent=2)
    report = _claude_json(system, user)

    idem = payload.idempotency_key or f"call:{payload.user_id}:{payload.hcp_id}:{payload.datetime_local}"
    event_id = append_event(
        conn,
        "CALL_REPORT_CREATED",
        report,
        payload.user_id,
        payload.hcp_id,
        idem,
    )
    draft_id = uuid.uuid4()
    save_call_draft(conn, draft_id, payload.user_id, payload.hcp_id, event_id, report)

    safety_event_id: Optional[str] = None
    compliance = report.get("compliance") or {}
    if compliance.get("adverse_event_mentioned"):
        safety_idem = f"{idem}:safety"
        safety_payload = {
            "call_report_id": report.get("call_report_id"),
            "user_id": payload.user_id,
            "hcp_id": payload.hcp_id,
            "compliance": compliance,
        }
        sid = append_event(
            conn,
            "SAFETY_TRIGGERED",
            safety_payload,
            payload.user_id,
            payload.hcp_id,
            safety_idem,
        )
        safety_event_id = str(sid)

    return {
        **report,
        "event_id": str(event_id),
        "draft_id": str(draft_id),
        **({"safety_event_id": safety_event_id} if safety_event_id else {}),
    }


@app.post("/expense")
def expense(
    payload: ExpensePayload,
    conn: psycopg.Connection = Depends(get_conn),
) -> Dict[str, Any]:
    """
    Build an ExpenseReport JSON from receipt text; append EXPENSE_SUBMITTED event.
    """
    system = SYSTEM_GLOBAL + "\n\n" + EXPENSE_TASK
    user = json.dumps(payload.model_dump(exclude_none=True), indent=2)
    expense_data = _claude_json(system, user)

    idem = payload.idempotency_key or f"expense:{hash(user) % (10**10)}"
    event_id = append_event(
        conn,
        "EXPENSE_SUBMITTED",
        expense_data,
        None,
        None,
        idem,
    )
    return {**expense_data, "event_id": str(event_id)}


@app.post("/compliance_review")
def compliance_review(payload: CompliancePayload) -> Dict[str, Any]:
    """
    Compliance verifier for drafted CallReport + raw transcript.
    """
    system = SYSTEM_GLOBAL + "\n\n" + COMPLIANCE_TASK
    user = json.dumps(payload.model_dump(), indent=2)
    return _claude_json(system, user)


if __name__ == "__main__":
    # Simple dev entrypoint: `python main.py`
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

