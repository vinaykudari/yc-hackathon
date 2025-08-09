from pydantic import BaseModel


class PageContent(BaseModel):
    html: str
    js: str
    css: str

class DOMPatch(BaseModel):
    type: str  # 'insert', 'update', 'remove'
    selector: str  # CSS selector for target element
    content: str = ""  # Content to insert/update
    attributes: dict = {}  # Attributes to set
    position: str = "append"  # 'append', 'prepend', 'before', 'after'

class StylePatch(BaseModel):
    type: str  # 'add', 'update', 'remove'
    selector: str = ""  # CSS selector (empty for global styles)
    rules: dict = {}  # CSS rules to apply

class UpdatePageResponse(BaseModel):
    dom_patches: list[DOMPatch] = []
    style_patches: list[StylePatch] = []
    js_patches: list = []  # For future JS patches
    success: bool
    message: str