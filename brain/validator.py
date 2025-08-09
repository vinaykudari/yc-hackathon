from __future__ import annotations

from typing import List, Dict, Any


def validate_decision(plan, analysis: Dict[str, Any]) -> List[str]:
    warnings: List[str] = []

    # Basic selector presence checks
    targets = plan.targets or {}
    if not targets.get("checkout") and any(
        "sticky" in (plan.css_instruction or "").lower() for _ in [0]
    ):
        warnings.append(
            "Checkout selector not confidently identified; check CSS/JS targets."
        )

    # Heuristic risk flags
    if len(plan.css_blocks) > 10:
        warnings.append("Large CSS update; consider scoping more narrowly.")

    if plan.want_html and not plan.html_ops_json:
        warnings.append("HTML updates requested but no ops generated.")

    return warnings
