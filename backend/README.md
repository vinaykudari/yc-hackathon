# DOM API Updater - Example Backend Server

A simple FastAPI server that demonstrates the HTML-based API for the DOM API Updater Chrome Extension.

## Features

- **CORS-enabled** FastAPI server for Chrome extension compatibility
- **HTML processing** endpoint at `/test-api`
- **Example modifications** including banners, styling, and content changes
- **Proper error handling** and logging
- **Health check** endpoints

## Installation

1. **Create virtual environment** (recommended):
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

## Running the Server

### Development Mode
```bash
python main.py
```

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The server will start at `http://localhost:8000`

## API Endpoints

### Main API Endpoint
- **POST/PUT** `/test-api` - Receives HTML content and returns modified HTML
- **OPTIONS** `/test-api` - CORS preflight handling

### Utility Endpoints
- **GET** `/` - Server info and available endpoints
- **GET** `/health` - Health check

## Example Modifications

The server applies these example modifications to received HTML:

1. **Top Banner** - Adds a fixed banner at the top with timestamp
2. **Title Modification** - Prepends "🔄" and appends "(API Modified)" to page title
3. **H1 Highlighting** - Adds gradient background to all H1 elements
4. **Body Padding** - Adjusts body padding to accommodate the banner
5. **Footer Badge** - Adds a small "Modified by API" badge in bottom-right

## Chrome Extension Configuration

To use with the DOM API Updater extension:

1. **Start the server** on `http://localhost:8000`
2. **Open the extension popup**
3. **Set API endpoint** to: `http://localhost:8000/test-api`
4. **Click "Update DOM via API"** on any webpage

## Customizing Modifications

Edit the `process_html_content()` function in `main.py` to add your own HTML modifications:

```python
def process_html_content(html_content: str) -> str:
    # Add your custom HTML processing logic here
    
    # Example: Replace all paragraphs with uppercase text
    html_content = re.sub(
        r'(<p[^>]*>)(.*?)(</p>)',
        lambda m: m.group(1) + m.group(2).upper() + m.group(3),
        html_content,
        flags=re.IGNORECASE | re.DOTALL
    )
    
    return html_content
```

## CORS Configuration

The server is configured with permissive CORS settings for development:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)
```

**For production**, replace `allow_origins=["*"]` with specific origins.

## Logging

The server logs all requests and modifications:

```
INFO:__main__:Received HTML content: 15234 characters
INFO:__main__:Returning modified HTML: 16891 characters
```

## Error Handling

The server handles common errors:

- **Empty HTML content** → 400 Bad Request
- **Processing errors** → 500 Internal Server Error
- **Invalid requests** → Appropriate HTTP status codes

## Testing

Test the server manually:

```bash
# Health check
curl http://localhost:8000/health

# Test API with sample HTML
curl -X POST http://localhost:8000/test-api \
  -H "Content-Type: text/html" \
  -d "<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>"
```

## Next Steps

This is a basic example server. For production use, consider:

1. **Authentication** and rate limiting
2. **Input validation** and HTML sanitization  
3. **Database integration** for logging and analytics
4. **LLM integration** for intelligent modifications
5. **Patch-based updates** instead of full HTML replacement

## Architecture Evolution

This server implements the current full-HTML replacement method. For a more robust solution, consider implementing the patch-based architecture with:

- JSON patch format instead of full HTML
- DOM diff engine for minimal changes
- Shadow DOM islands for safe modifications
- Rollback mechanisms and validation
