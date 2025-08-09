from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel


class UserProfile(BaseModel):
    userId: str
    displayName: Optional[str] = None
    brandColors: List[str] = []
    fontPreferences: List[str] = []
    accessibility: Dict[str, Any] = {}
    tone: Optional[str] = None
    riskLevel: Literal["low", "medium", "high"] = "medium"


class SiteProfile(BaseModel):
    origin: str
    version: int = 0
    cssPatch: str = ""
    jsPatch: str = ""
    htmlPatch: str = ""  # optional serialized ops/snippet
    rules: List[Dict[str, Any]] = []


class PageContext(BaseModel):
    url: str
    origin: str
    route: Optional[str] = None
    html: str
    stylesheets: List[str] = []
    inlineStyles: List[str] = []
    scripts: List[str] = []
    meta: Dict[str, Any] = {}
    domSummary: Optional[Dict[str, Any]] = None


class Intent(BaseModel):
    text: str  # natural language prompt
    scope: Optional[List[Literal["css", "js", "html"]]] = None  # optional hint


class ApplyPayload(BaseModel):
    code: str
    update: str
    instruction: str
    model: str = "apply"


class ApplyBatch(BaseModel):
    css: Optional[ApplyPayload] = None
    js: Optional[ApplyPayload] = None
    html: Optional[ApplyPayload] = None


class Decision(BaseModel):
    targets: Dict[str, Any] = {}
    rationale: str = ""
    risk: Literal["low", "medium", "high"] = "medium"


class BrainRequest(BaseModel):
    userProfile: UserProfile
    page: PageContext
    intent: Intent
    siteProfile: Optional[SiteProfile] = None


class BrainOutput(BaseModel):
    decisions: Decision
    warnings: List[str] = []
    applyBatch: ApplyBatch


# Planning structures
class JsOp:
    """Base class for JS operations emitted into the idempotent apply() function."""

    def emit(self) -> str:
        raise NotImplementedError


class JsHide(JsOp):
    def __init__(self, selector: str, flag: str = "morphHidden") -> None:
        self.selector = selector
        self.flag = flag

    def emit(self) -> str:
        return (
            f"document.querySelectorAll('{self.selector}').forEach(el=>{{\n"
            f"  if(!el.dataset.{self.flag}){{ el.style.display='none'; el.dataset.{self.flag}='1'; }}\n"
            f"}});"
        )


class JsAddClass(JsOp):
    def __init__(
        self, selector: str, class_name: str, flag: str = "morphApplied"
    ) -> None:
        self.selector = selector
        self.class_name = class_name
        self.flag = flag

    def emit(self) -> str:
        return (
            f"document.querySelectorAll('{self.selector}').forEach(el=>{{\n"
            f"  if(!el.dataset.{self.flag}){{ el.classList.add('{self.class_name}'); el.dataset.{self.flag}='1'; }}\n"
            f"}});"
        )


class JsSetStyle(JsOp):
    def __init__(
        self, selector: str, style_map: Dict[str, str], flag: str = "morphStyled"
    ) -> None:
        self.selector = selector
        self.style_map = style_map
        self.flag = flag

    def emit(self) -> str:
        style_lines = "".join(
            [f"el.style.{k}='{v}';" for k, v in self.style_map.items()]
        )
        return (
            f"document.querySelectorAll('{self.selector}').forEach(el=>{{\n"
            f"  if(!el.dataset.{self.flag}){{ {style_lines} el.dataset.{self.flag}='1'; }}\n"
            f"}});"
        )


class Plan(BaseModel):
    want_css: bool = False
    want_js: bool = False
    want_html: bool = False
    css_blocks: List[str] = []
    js_ops: List[JsOp] = []  # runtime-only objects
    html_ops_json: str = ""
    css_instruction: Optional[str] = None
    js_instruction: Optional[str] = None
    html_instruction: Optional[str] = None
    rationale: str = ""
    risk: Literal["low", "medium", "high"] = "medium"
    targets: Dict[str, Any] = {}
