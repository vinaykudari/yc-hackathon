from __future__ import annotations

from typing import Dict, Any
from .models import Plan, UserProfile


def _want(scope, key: str, default: bool) -> bool:
    if not scope:
        return default
    return key in scope


def plan_tasks(intent, profile: UserProfile, analysis: Dict[str, Any]) -> Plan:
    text = (intent.text or "").lower()
    palette = analysis.get("palette", [])

    plan = Plan()

    # Default: enable css and js unless scope restricts
    plan.want_css = _want(intent.scope, "css", True)
    plan.want_js = _want(intent.scope, "js", True)
    plan.want_html = _want(intent.scope, "html", False)

    # Targets
    checkout_sel = analysis.get("targets", {}).get("checkout", ".button--checkout")
    modal_sel = analysis.get("targets", {}).get(
        "newsletter_modal", "#newsletter-modal, .newsletter-modal"
    )

    # Heuristics from intent
    if "sticky" in text or "checkout" in text:
        primary = profile.brandColors[0] if profile.brandColors else "#2bb673"
        plan.css_blocks += [
            ".morph-sticky-checkout { position: sticky; bottom: 16px; z-index: 9999; }",
            f"{checkout_sel} {{ background: {primary}; color: #fff; font-weight: 700; }}",
        ]
        from .models import JsAddClass, JsSetStyle

        plan.js_ops += [
            JsAddClass(selector=checkout_sel, class_name="morph-sticky-checkout"),
            JsSetStyle(selector=checkout_sel, style_map={"zIndex": "9999"}),
        ]
        plan.css_instruction = (
            "I will make the checkout button sticky and brand-colored."
        )
        plan.js_instruction = (
            "I will apply a sticky class and safe inline styles idempotently."
        )

    if "hide" in text and ("newsletter" in text or "modal" in text):
        from .models import JsHide

        plan.js_ops.append(JsHide(selector=modal_sel))
        plan.js_instruction = (
            plan.js_instruction or ""
        ) + " I will hide the newsletter modal."

    if "banner" in text or "insert" in text:
        plan.want_html = True
        banner_html = (
            '<div class="morph-banner" style="position:fixed;top:0;left:0;right:0;background:#111;color:#fff;padding:8px 12px;z-index:10000;text-align:center;">'
            + "This page customized by Morph"
            + "</div>"
        )
        # Represent as JSON-as-code (string) for Apply merge of ops array
        plan.html_ops_json = (
            "// ... existing code ...\n"
            "{"
            '"id": "banner-top", "selector": "body", "operation": "prepend", "html": '
            + repr(banner_html)
            + "}\n// ... existing code ..."
        )
        plan.html_instruction = "I will prepend a non-intrusive banner to body."

    plan.targets = {"checkout": checkout_sel, "newsletter_modal": modal_sel}
    plan.rationale = (
        "Planned CSS and JS operations derived from intent and detected targets."
    )
    plan.risk = "medium"

    return plan
