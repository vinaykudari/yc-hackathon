from typing import Dict, Any
from ..models import UserProfile


def _short_instruction(plan) -> str:
    return plan.html_instruction or "I will update HTML structure safely."


async def synth_html_update(
    current_code: str, plan, analysis: Dict[str, Any], profile: UserProfile
) -> Dict[str, str]:
    # Represent operations as JSON-as-code string to be merged by Morph Apply
    ops_json = plan.html_ops_json or ""
    update = ops_json
    instruction = _short_instruction(plan)
    return {
        "code": current_code or "[]",  # default: empty ops array
        "update": update,
        "instruction": instruction,
        "model": "apply",
    }
