from typing import Dict, Any
from ..models import UserProfile


def _short_instruction(plan) -> str:
    return plan.css_instruction or "I will update styles as requested."


async def synth_css_update(
    current_code: str, plan, analysis: Dict[str, Any], profile: UserProfile
) -> Dict[str, str]:
    blocks = plan.css_blocks or []
    # Build update as only the new/changed blocks
    update = "\n".join(blocks)
    instruction = _short_instruction(plan)
    return {
        "code": current_code or "/* morph css patch */",
        "update": update,
        "instruction": instruction,
        "model": "apply",
    }
