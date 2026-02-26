#!/usr/bin/env python3
"""
Sync unsynced events from Postgres (events_raw + sync_status) to Snowflake.
Idempotent MERGE on event_id. Marks sync_status 'synced' or 'failed'.
Python 3.12 compatible; uses psycopg (v3) + snowflake-connector-python.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

import psycopg
import snowflake.connector

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

POSTGRES_DSN = os.getenv(
    "POSTGRES_DSN",
    "postgresql://postgres:postgres@localhost:5432/sanofi",
)
SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT")
SNOWFLAKE_USER = os.getenv("SNOWFLAKE_USER")
SNOWFLAKE_PASSWORD = os.getenv("SNOWFLAKE_PASSWORD")
SNOWFLAKE_WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE")
SNOWFLAKE_DATABASE = os.getenv("SNOWFLAKE_DATABASE")
SNOWFLAKE_SCHEMA = os.getenv("SNOWFLAKE_SCHEMA", "REP_ASSISTANT")
# Optional keypair auth (if PASSWORD not set)
SNOWFLAKE_PRIVATE_KEY_PATH = os.getenv("SNOWFLAKE_PRIVATE_KEY_PATH")
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE = os.getenv("SNOWFLAKE_PRIVATE_KEY_PASSPHRASE", "")

TABLE_MAP = {
    "CALL": "CALL_EVENTS_RAW",
    "EXPENSE": "EXPENSE_EVENTS_RAW",
    "SAFETY": "SAFETY_EVENTS_RAW",
}

MERGE_CALL = """
MERGE INTO {table} t
USING (SELECT
  %(event_id)s        AS EVENT_ID,
  %(event_type)s      AS EVENT_TYPE,
  %(idempotency_key)s AS IDEMPOTENCY_KEY,
  %(user_id)s         AS USER_ID,
  %(hcp_id)s          AS HCP_ID,
  %(source_event_ts)s AS SOURCE_EVENT_TS,
  PARSE_JSON(%(payload)s)     AS PAYLOAD,
  PARSE_JSON(%(aux_json)s)    AS COMPLIANCE,
  PARSE_JSON(%(citations)s)   AS CITATIONS
) s
ON t.EVENT_ID = s.EVENT_ID
WHEN NOT MATCHED THEN INSERT
  (EVENT_ID, EVENT_TYPE, IDEMPOTENCY_KEY, USER_ID, HCP_ID, SOURCE_EVENT_TS, PAYLOAD, COMPLIANCE, CITATIONS)
VALUES
  (s.EVENT_ID, s.EVENT_TYPE, s.IDEMPOTENCY_KEY, s.USER_ID, s.HCP_ID, s.SOURCE_EVENT_TS, s.PAYLOAD, s.COMPLIANCE, s.CITATIONS);
"""

MERGE_EXPENSE = """
MERGE INTO {table} t
USING (SELECT
  %(event_id)s        AS EVENT_ID,
  %(event_type)s      AS EVENT_TYPE,
  %(idempotency_key)s AS IDEMPOTENCY_KEY,
  %(user_id)s         AS USER_ID,
  %(hcp_id)s          AS HCP_ID,
  %(source_event_ts)s AS SOURCE_EVENT_TS,
  PARSE_JSON(%(payload)s)     AS PAYLOAD,
  PARSE_JSON(%(aux_json)s)    AS POLICY_FLAGS
) s
ON t.EVENT_ID = s.EVENT_ID
WHEN NOT MATCHED THEN INSERT
  (EVENT_ID, EVENT_TYPE, IDEMPOTENCY_KEY, USER_ID, HCP_ID, SOURCE_EVENT_TS, PAYLOAD, POLICY_FLAGS)
VALUES
  (s.EVENT_ID, s.EVENT_TYPE, s.IDEMPOTENCY_KEY, s.USER_ID, s.HCP_ID, s.SOURCE_EVENT_TS, s.PAYLOAD, s.POLICY_FLAGS);
"""

MERGE_SAFETY = """
MERGE INTO {table} t
USING (SELECT
  %(event_id)s        AS EVENT_ID,
  %(event_type)s      AS EVENT_TYPE,
  %(idempotency_key)s AS IDEMPOTENCY_KEY,
  %(user_id)s         AS USER_ID,
  %(hcp_id)s          AS HCP_ID,
  %(source_event_ts)s AS SOURCE_EVENT_TS,
  PARSE_JSON(%(payload)s)     AS PAYLOAD,
  PARSE_JSON(%(aux_json)s)    AS MIN_INFO_STATUS
) s
ON t.EVENT_ID = s.EVENT_ID
WHEN NOT MATCHED THEN INSERT
  (EVENT_ID, EVENT_TYPE, IDEMPOTENCY_KEY, USER_ID, HCP_ID, SOURCE_EVENT_TS, PAYLOAD, MIN_INFO_STATUS)
VALUES
  (s.EVENT_ID, s.EVENT_TYPE, s.IDEMPOTENCY_KEY, s.USER_ID, s.HCP_ID, s.SOURCE_EVENT_TS, s.PAYLOAD, s.MIN_INFO_STATUS);
"""


def _pg_conn() -> psycopg.Connection:
    return psycopg.connect(POSTGRES_DSN)


def _sf_connect() -> snowflake.connector.SnowflakeConnection:
    kwargs: dict[str, Any] = {
        "account": SNOWFLAKE_ACCOUNT,
        "user": SNOWFLAKE_USER,
        "warehouse": SNOWFLAKE_WAREHOUSE,
        "database": SNOWFLAKE_DATABASE,
        "schema": SNOWFLAKE_SCHEMA,
    }
    if SNOWFLAKE_PASSWORD:
        kwargs["password"] = SNOWFLAKE_PASSWORD
    elif SNOWFLAKE_PRIVATE_KEY_PATH:
        with open(SNOWFLAKE_PRIVATE_KEY_PATH, "rb") as f:
            from cryptography.hazmat.primitives.serialization import load_pem_private_key
            from cryptography.hazmat.backends import default_backend
            passphrase = (SNOWFLAKE_PRIVATE_KEY_PASSPHRASE or "").encode() or None
            pkey = load_pem_private_key(f.read(), password=passphrase, backend=default_backend())
        kwargs["private_key"] = pkey
    else:
        raise ValueError("Set SNOWFLAKE_PASSWORD or SNOWFLAKE_PRIVATE_KEY_PATH")
    return snowflake.connector.connect(**kwargs)


def _prefix_table(event_type: str) -> str | None:
    for prefix, table in TABLE_MAP.items():
        if event_type.upper().startswith(prefix + "_"):
            return f"{SNOWFLAKE_SCHEMA}.{table}"
    return None


def fetch_unsynced(conn: psycopg.Connection, limit: int) -> list[tuple]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT e.event_id, e.event_type, e.payload_json, e.user_id, e.hcp_id,
                   e.created_at, e.idempotency_key
            FROM events_raw e
            JOIN sync_status s ON e.event_id = s.event_id
            WHERE s.status != 'synced'
            ORDER BY e.created_at ASC
            LIMIT %s
            """,
            (limit,),
        )
        return cur.fetchall()


def mark_sync_status(
    conn: psycopg.Connection,
    event_id: str,
    status: str,
    last_error: str | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE sync_status
            SET status = %s, last_error = %s, updated_at = NOW()
            WHERE event_id = %s
            """,
            (status, last_error, event_id),
        )
    conn.commit()


def run(
    limit: int,
    dry_run: bool,
) -> None:
    pg = _pg_conn()
    try:
        rows = fetch_unsynced(pg, limit)
        if not rows:
            print("No unsynced events.")
            return

        print(f"Found {len(rows)} unsynced event(s). Dry run={dry_run}.")

        if dry_run:
            for row in rows:
                event_id, event_type, _payload_json, _user_id, _hcp_id, _created_at, _idempotency_key = row
                table = _prefix_table(event_type or "")
                print(f"  [dry-run] would MERGE {event_id} ({event_type}) -> {table}")
            return

        if not SNOWFLAKE_ACCOUNT or not SNOWFLAKE_USER or not SNOWFLAKE_WAREHOUSE or not SNOWFLAKE_DATABASE:
            print(
                "Missing SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_WAREHOUSE, or SNOWFLAKE_DATABASE",
                file=sys.stderr,
            )
            sys.exit(1)

        sf_conn = _sf_connect()
        try:
            for row in rows:
                event_id, event_type, payload_json, user_id, hcp_id, created_at, idempotency_key = row
                event_id_str = str(event_id)
                table = _prefix_table(event_type or "")
                if not table:
                    print(f"  Skip {event_id_str}: unknown event_type prefix '{event_type}'")
                    mark_sync_status(pg, event_id_str, "failed", f"Unknown event_type: {event_type}")
                    continue

                payload_str = json.dumps(payload_json) if isinstance(payload_json, dict) else (payload_json or "{}")
                source_ts = created_at.isoformat() if created_at else None
                params = {
                    "event_id": event_id_str,
                    "event_type": event_type or "",
                    "idempotency_key": idempotency_key,
                    "user_id": user_id,
                    "hcp_id": hcp_id,
                    "source_event_ts": source_ts,
                    "payload": payload_str,
                    "aux_json": "{}",
                    "citations": "[]",
                }

                try:
                    with sf_conn.cursor() as cur:
                        if event_type and event_type.upper().startswith("CALL_"):
                            cur.execute(MERGE_CALL.format(table=table), params)
                        elif event_type and event_type.upper().startswith("EXPENSE_"):
                            cur.execute(MERGE_EXPENSE.format(table=table), params)
                        elif event_type and event_type.upper().startswith("SAFETY_"):
                            cur.execute(MERGE_SAFETY.format(table=table), params)
                        else:
                            mark_sync_status(pg, event_id_str, "failed", f"Unknown event_type: {event_type}")
                            continue
                    mark_sync_status(pg, event_id_str, "synced")
                    print(f"  Synced {event_id_str} -> {table}")
                except Exception as e:
                    err_msg = str(e)[:2000]
                    mark_sync_status(pg, event_id_str, "failed", err_msg)
                    print(f"  Failed {event_id_str}: {err_msg}", file=sys.stderr)
        finally:
            sf_conn.close()
    finally:
        pg.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync events from Postgres to Snowflake")
    parser.add_argument("--dry-run", action="store_true", help="Do not write to Snowflake; mark as synced in Postgres for testing")
    parser.add_argument("--limit", type=int, default=200, help="Max events per run (default 200)")
    args = parser.parse_args()
    run(limit=args.limit, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
