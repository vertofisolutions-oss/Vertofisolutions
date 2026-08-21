"""
Deterministic categorization fallback (docs/services/reconciliation + docs/18).
Used when the ai-gateway is degraded/unavailable so the pipeline keeps working
without fabricating AI output. Returns (category, confidence) or (None, 0).
"""
from __future__ import annotations

LEDGER_CATEGORIES = [
    "Raw Materials",
    "Fuel & Transport",
    "Rent",
    "Utilities",
    "Salaries & Payroll",
    "Professional Fees",
    "Office Supplies",
    "Marketing",
    "Bank Charges",
    "Subscriptions",
    "Sales Revenue",
    "Uncategorized",
]

# Keyword → category heuristics. Conservative; only fires on clear matches.
_KEYWORDS: dict[str, str] = {
    "petrol": "Fuel & Transport",
    "diesel": "Fuel & Transport",
    "fuel": "Fuel & Transport",
    "transport": "Fuel & Transport",
    "rent": "Rent",
    "electricity": "Utilities",
    "water": "Utilities",
    "internet": "Utilities",
    "salary": "Salaries & Payroll",
    "payroll": "Salaries & Payroll",
    "consult": "Professional Fees",
    "audit": "Professional Fees",
    "stationery": "Office Supplies",
    "ads": "Marketing",
    "marketing": "Marketing",
    "bank charge": "Bank Charges",
    "subscription": "Subscriptions",
    "saas": "Subscriptions",
}


def categorize(vendor: str, description: str) -> tuple[str | None, float]:
    text = f"{vendor} {description}".lower()
    for kw, cat in _KEYWORDS.items():
        if kw in text:
            return cat, 0.75
    return None, 0.0
