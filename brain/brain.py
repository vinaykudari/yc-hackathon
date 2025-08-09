import asyncio
from typing import Dict, Any, Optional, Tuple

from .models import (
    BrainRequest,
    BrainOutput,
    ApplyBatch,
    ApplyPayload,
    Decision,
)
from .analyzers.page_analyzer import analyze_page
from .planner import plan_tasks
from .synthesizers.css_synth import synth_css_update
from .synthesizers.js_synth import synth_js_update
from .synthesizers.html_synth import synth_html_update
from .validator import validate_decision


async def run_brain(req: BrainRequest) -> BrainOutput:
    # 1) Analyze the page
    analysis: Dict[str, Any] = analyze_page(req.page)

    # 2) Plan actions from intent and profile
    plan = plan_tasks(req.intent, req.userProfile, analysis)

    # 3) Synthesize updates in parallel
    current_css = req.siteProfile.cssPatch if req.siteProfile else ""
    current_js = req.siteProfile.jsPatch if req.siteProfile else ""
    current_html = req.siteProfile.htmlPatch if req.siteProfile else ""

    async def maybe(task):
        return await task if task else None

    css_task = (
        synth_css_update(current_css, plan, analysis, req.userProfile)
        if plan.want_css
        else None
    )
    js_task = (
        synth_js_update(current_js, plan, analysis, req.userProfile)
        if plan.want_js
        else None
    )
    html_task = (
        synth_html_update(current_html, plan, analysis, req.userProfile)
        if plan.want_html
        else None
    )

    css_res, js_res, html_res = await asyncio.gather(
        maybe(css_task), maybe(js_task), maybe(html_task)
    )

    # 4) Decisions and validation warnings
    decisions = Decision(targets=plan.targets, rationale=plan.rationale, risk=plan.risk)
    warnings = validate_decision(plan, analysis)

    # 5) Build Apply batch payloads
    batch = ApplyBatch(
        css=ApplyPayload(**css_res) if css_res else None,
        js=ApplyPayload(**js_res) if js_res else None,
        html=ApplyPayload(**html_res) if html_res else None,
    )

    return BrainOutput(decisions=decisions, warnings=warnings, applyBatch=batch)
