"""
Example FastAPI server for DOM API Updater Chrome Extension
Receives HTML content and returns modified HTML content
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import re
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DOM API Updater - Example Server",
    description="Example backend server for the DOM API Updater Chrome Extension",
    version="1.0.0"
)

# Add CORS middleware to allow requests from Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "DOM API Updater Example Server",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "test_api": "/test-api",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/test-api", response_class=HTMLResponse)
async def process_dom(request: Request):
    """
    Main API endpoint that receives HTML content and returns modified HTML
    This is the endpoint the Chrome extension calls
    """
    try:
        # Get the raw HTML content from the request body
        html_content = await request.body()
        html_string = html_content.decode('utf-8')
        
        logger.info(f"Received HTML content: {len(html_string)} characters")
        
        # Validate that we received HTML content
        if not html_string or len(html_string.strip()) == 0:
            raise HTTPException(status_code=400, detail="No HTML content received")
        
        # Process the HTML (example modifications)
        modified_html = process_html_content(html_string)
        
        logger.info(f"Returning modified HTML: {len(modified_html)} characters")
        
        return HTMLResponse(
            content=modified_html,
            status_code=200,
            headers={
                "Content-Type": "text/html; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Accept, X-Requested-With"
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing DOM: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing HTML: {str(e)}")

@app.put("/test-api", response_class=HTMLResponse)
async def process_dom_put(request: Request):
    """PUT version of the test-api endpoint"""
    return await process_dom(request)

@app.options("/test-api")
async def options_test_api():
    """Handle preflight CORS requests"""
    return {
        "message": "CORS preflight successful"
    }

def process_html_content(html_content: str) -> str:
    """
    Process and modify the HTML content
    This is where you would add your custom logic
    """
    
    # Example modifications:
    
    # 1. Add a banner at the top of the body
    banner_html = '''
    <div id="api-modification-banner" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 12px 20px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border-bottom: 2px solid rgba(255,255,255,0.2);
    ">
        🚀 This page has been modified by the DOM API Updater! 
        <span style="opacity: 0.8; font-size: 12px;">
            (Modified at {timestamp})
        </span>
    </div>
    '''.format(timestamp=datetime.now().strftime("%H:%M:%S"))
    
    # Insert banner after opening body tag
    html_content = re.sub(
        r'(<body[^>]*>)',
        r'\1' + banner_html,
        html_content,
        flags=re.IGNORECASE
    )
    
    # 2. Add some CSS to adjust for the banner
    banner_css = '''
    <style id="api-modification-styles">
        body {
            padding-top: 60px !important;
        }
        #api-modification-banner {
            animation: slideDown 0.5s ease-out;
        }
        @keyframes slideDown {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
        }
    </style>
    '''
    
    # Insert CSS in head
    html_content = re.sub(
        r'(</head>)',
        banner_css + r'\1',
        html_content,
        flags=re.IGNORECASE
    )
    
    # 3. Modify the title to indicate it's been processed
    html_content = re.sub(
        r'(<title>)(.*?)(</title>)',
        r'\1🔄 \2 (API Modified)\3',
        html_content,
        flags=re.IGNORECASE
    )
    
    # 4. Add a subtle highlight to all h1 elements
    html_content = re.sub(
        r'(<h1[^>]*>)',
        r'\1<span style="background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%); padding: 4px 8px; border-radius: 4px; display: inline-block;">',
        html_content,
        flags=re.IGNORECASE
    )
    
    html_content = re.sub(
        r'(</h1>)',
        r'</span>\1',
        html_content,
        flags=re.IGNORECASE
    )
    
    # 5. Add a footer message
    footer_html = '''
    <div id="api-modification-footer" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        z-index: 9999;
        backdrop-filter: blur(10px);
    ">
        ✨ Modified by API
    </div>
    '''
    
    # Insert footer before closing body tag
    html_content = re.sub(
        r'(</body>)',
        footer_html + r'\1',
        html_content,
        flags=re.IGNORECASE
    )
    
    return html_content

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
