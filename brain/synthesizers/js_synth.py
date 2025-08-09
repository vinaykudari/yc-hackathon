from typing import Dict, Any
from ..models import UserProfile


def _wrap_apply(ops_src: str) -> str:
    return f"export function apply(){\n{ops_src}\n}"


def _short_instruction(plan) -> str:
    return plan.js_instruction or "I will add idempotent DOM operations."


async def synth_js_update(current_code: str, plan, analysis: Dict[str, Any], profile: UserProfile) -> Dict[str, str]:
    # Each js_op knows how to emit a safe, idempotent snippet
    ops = []
    for op in plan.js_ops or []:
        ops.append(op.emit())
    update_body = "\n".join(ops)
    update = _wrap_apply(update_body)
    instruction = _short_instruction(plan)
    return {
        "code": current_code or "export function apply(){}",
        "update": update,
        "instruction": instruction,
        "model": "apply",
    }

