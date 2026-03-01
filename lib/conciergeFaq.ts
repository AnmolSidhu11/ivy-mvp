/**
 * Internal Concierge FAQ knowledge base (deterministic, no external calls).
 * Used by /api/concierge/ask. All answers are stubs – mark as "Draft – confirm with internal sources."
 */

export type FaqCategory =
  | "product_info"
  | "reimbursement_pa"
  | "compliance"
  | "call_scripting"
  | "expense_policy"
  | "crm_reminders";

export interface FaqEntry {
  category: FaqCategory;
  keywords: string[];
  answer: string;
}

const DRAFT_FOOTER = "\n\n— Draft – confirm with internal sources.";

export const FAQ_CATEGORIES: Record<FaqCategory, string> = {
  product_info: "Product info",
  reimbursement_pa: "Reimbursement / PA workflow",
  compliance: "Compliance reminders",
  call_scripting: "Call scripting / objections",
  expense_policy: "Expense policy steps",
  crm_reminders: "CRM reminders (Veeva-style)",
};

const FAQ_ENTRIES: FaqEntry[] = [
  {
    category: "product_info",
    keywords: ["indication", "indications", "dosing", "titration", "product", "approved", "label"],
    answer:
      "Use only approved indications and FDA-approved labeling in discussions. For dosing and titration, refer to the most recent PI (Prescribing Information). Do not make claims beyond approved use.",
  },
  {
    category: "reimbursement_pa",
    keywords: ["reimbursement", "prior auth", "prior authorization", "pa form", "coverage", "payer", "formulary"],
    answer:
      "Reimbursement and prior authorization workflows vary by payer. Direct HCPs to the manufacturer’s reimbursement hub or patient support program for case-specific help. Do not guarantee coverage.",
  },
  {
    category: "compliance",
    keywords: ["compliance", "phi", "patient", "off-label", "promotional", "internal only", "approved materials"],
    answer:
      "No patient or PII in field notes. Internal HCP workflow only. Use only approved claims and materials. Do not discuss off-label uses. When in doubt, route to Medical Information.",
  },
  {
    category: "call_scripting",
    keywords: ["objection", "objections", "script", "scripting", "handle", "response", "pushback", "concern"],
    answer:
      "Acknowledge the concern, stay within approved messaging, and offer to follow up with Medical Information or relevant resources. Do not make clinical claims or promise outcomes.",
  },
  {
    category: "expense_policy",
    keywords: ["expense", "meals", "receipt", "submit", "policy", "limit", "reimbursement", "claim"],
    answer:
      "Follow company expense policy: retain receipts, submit within the required window, and link expenses to approved activities. Meals must be within per-person limits and documented with purpose.",
  },
  {
    category: "crm_reminders",
    keywords: ["veeva", "crm", "log", "call", "visit", "sample", "next step", "follow-up", "touchpoint"],
    answer:
      "Log the call in Veeva (or your CRM) with the correct activity type and date. Capture key discussion points and next steps. Schedule the next touchpoint per your territory plan.",
  },
];

/**
 * Deterministic lookup: find first FAQ entry whose keywords match the question (case-insensitive).
 * Returns answer + category; if no match, returns a generic compliance-focused reply.
 */
export function lookupFaq(question: string): { answer: string; category: FaqCategory } {
  const lower = question.toLowerCase().trim();
  if (!lower) {
    return {
      answer: "Ask a question about product info, reimbursement, compliance, scripting, expense policy, or CRM. " + DRAFT_FOOTER,
      category: "compliance",
    };
  }
  for (const entry of FAQ_ENTRIES) {
    const match = entry.keywords.some((k) => lower.includes(k.toLowerCase()));
    if (match) {
      return {
        answer: entry.answer + DRAFT_FOOTER,
        category: entry.category,
      };
    }
  }
  return {
    answer:
      "This topic may require internal resources. Check the intranet or contact your manager. Do not include patient or PII in any notes." +
      DRAFT_FOOTER,
    category: "compliance",
  };
}
