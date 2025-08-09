# Page Updater - FastAPI Backend + Chrome Extension

A simple MVP that allows you to modify web pages by adding a banner through a FastAPI backend and Chrome extension.

## Components

### 1. FastAPI Backend (`/backend`)
- **Endpoint**: `POST /update_page`
- **Input**: HTML, JS, CSS content
- **Output**: Modified HTML, JS, CSS with a green banner saying "update worked"
- **Features**: 
  - CORS enabled for Chrome extension
  - Adds banner to HTML content
  - Injects banner CSS styles
  - Health check endpoint at `/health`

### 2. Chrome Extension (`/frontend`)
- **Popup UI**: Configure API endpoint and trigger page updates
- **Content Script**: Extract page content and apply updates
- **Background Script**: Handle extension lifecycle
- **Features**:
  - API endpoint configuration
  - Extract HTML, CSS, JS from current page
  - Send content to backend API
  - Apply returned updates to DOM

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the FastAPI server:
   ```bash
   python main.py
   ```
   
   The API will be available at `http://localhost:8000`

4. Test the API:
   ```bash
   curl http://localhost:8000/health
   ```

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`

2. Enable "Developer mode" (toggle in top right)

3. Click "Load unpacked" and select the `frontend` directory

4. The extension should now appear in your extensions list

## Usage

1. **Start the backend**: Run `python main.py` in the backend directory

2. **Open the extension**: Click the Page Updater icon in Chrome

3. **Configure API**: Set the API endpoint (default: `http://localhost:8000`)

4. **Test connection**: Click "Test API Connection" to verify backend is running

5. **Update a page**: Navigate to any website and click "Update Current Page"

6. **See the result**: A green banner should appear at the top saying "✅ Update worked! Page has been modified."

## API Endpoints

- `GET /` - Root endpoint with API info
- `GET /health` - Health check
- `POST /update_page` - Main endpoint for page updates
  - Request body: `{"html": "...", "js": "...", "css": "..."}`
  - Response: `{"html": "...", "js": "...", "css": "...", "success": true, "message": "..."}`

## Technical Notes

- The backend adds a fixed-position banner to the HTML and corresponding CSS
- The extension extracts page content including inline and external stylesheets
- For security, JavaScript execution is currently disabled in the extension
- Changes are applied as DOM modifications rather than full page replacement
- CORS is enabled for all origins (should be restricted in production)

## Future Enhancements

- Implement diff/patch-based updates instead of full content replacement
- Add JavaScript modification capabilities
- Improve security and input validation
- Add user authentication
- Support for multiple update templates
- Better error handling and logging
