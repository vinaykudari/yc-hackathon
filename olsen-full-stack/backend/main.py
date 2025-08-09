from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import re

app = FastAPI(title="Page Update API", version="1.0.0")

# Enable CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def add_banner_to_html(html: str) -> str:
    """Add a simple banner to the HTML content"""
    banner_html = '''
    <div id="update-banner" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background-color: #4CAF50;
        color: white;
        text-align: center;
        padding: 10px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">
        ✅ Update worked! Page has been modified.
    </div>
    '''
    
    # Try to insert after <body> tag, or at the beginning if no body tag
    if '<body' in html.lower():
        # Find the end of the opening body tag
        body_match = re.search(r'<body[^>]*>', html, re.IGNORECASE)
        if body_match:
            insert_pos = body_match.end()
            return html[:insert_pos] + banner_html + html[insert_pos:]
    
    # If no body tag found, just prepend to the content
    return banner_html + html

def add_banner_styles_to_css(css: str) -> str:
    """Add styles to ensure banner is visible and properly positioned"""
    banner_css = '''
/* Banner styles to ensure visibility */
body {
    margin-top: 50px !important;
}

#update-banner {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    background-color: #4CAF50 !important;
    color: white !important;
    text-align: center !important;
    padding: 10px !important;
    z-index: 10000 !important;
    font-family: Arial, sans-serif !important;
    font-size: 14px !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
}
'''
    return css + "\n" + banner_css

@app.post("/update_page", response_model=UpdatePageResponse)
async def update_page(content: PageContent):
    """
    Update page content by generating patches that preserve existing DOM and event listeners
    """
    try:
        # Generate DOM patches - add banner without disrupting existing content
        dom_patches = [
            DOMPatch(
                type="insert",
                selector="body",
                content='''<div id="update-banner" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    background-color: #4CAF50;
                    color: white;
                    text-align: center;
                    padding: 10px;
                    z-index: 10000;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">
                    ✅ Update worked! Page has been modified.
                </div>''',
                position="prepend"
            )
        ]
        
        # Generate style patches - add body margin without overriding existing styles
        style_patches = [
            StylePatch(
                type="add",
                selector="body",
                rules={
                    "margin-top": "50px !important"
                }
            ),
            StylePatch(
                type="add",
                selector="#update-banner",
                rules={
                    "position": "fixed !important",
                    "top": "0 !important",
                    "left": "0 !important",
                    "width": "100% !important",
                    "background-color": "#4CAF50 !important",
                    "color": "white !important",
                    "text-align": "center !important",
                    "padding": "10px !important",
                    "z-index": "10000 !important",
                    "font-family": "Arial, sans-serif !important",
                    "font-size": "14px !important",
                    "box-shadow": "0 2px 4px rgba(0,0,0,0.2) !important"
                }
            )
        ]
        
        return UpdatePageResponse(
            dom_patches=dom_patches,
            style_patches=style_patches,
            js_patches=[],  # No JS patches for MVP
            success=True,
            message="Page patches generated successfully"
        )
    
    except Exception as e:
        return UpdatePageResponse(
            dom_patches=[],
            style_patches=[],
            js_patches=[],
            success=False,
            message=f"Error generating patches: {str(e)}"
        )

@app.get("/")
async def root():
    return {"message": "Page Update API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)