# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DOM API Updater is a Chrome extension with Python FastAPI backend that captures webpage DOM, sends it to an API endpoint, and replaces the DOM with the processed response. Built for YC Hackathon.

## Key Development Commands

### Backend (Python FastAPI)
```bash
# Setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Development server
python main.py  # HTTP on localhost:8000

# Production server
uvicorn main:app --host 0.0.0.0 --port 8000

# HTTPS server (requires SSL certs)
python main_https.py  # HTTPS on localhost:8443
```

### Chrome Extension
```bash
# Install extension
1. Open chrome://extensions/
2. Enable Developer mode
3. Load unpacked → select frontend/ directory
```

## Architecture

**Backend**: FastAPI server with single `/test-api` endpoint that accepts HTML via POST/PUT and returns modified HTML. CORS enabled for browser compatibility.

**Frontend**: Chrome Extension (Manifest v3) with:
- Popup interface for user controls
- Content script for DOM manipulation 
- Background service worker for messaging
- Storage API for settings persistence

**Data Flow**: Extension popup → Content script captures DOM → API request to backend → DOM replacement with API response

## Core Files

- `backend/main.py` - Main API server with HTML processing logic
- `frontend/content.js` - DOM capture and replacement logic
- `frontend/popup.js` - Extension UI and settings
- `frontend/manifest.json` - Extension configuration and permissions

## API Endpoint

**POST/PUT** `/test-api`
- Input: Raw HTML content (text/html)
- Output: Modified HTML content (text/html)
- Example modification: Adds banner, modifies title, styles H1 elements

## Extension Permissions

- `activeTab` - Access current page DOM
- `storage` - Persist API settings
- `scripting` - Inject content scripts
- `contextMenus` - Right-click integration
- `host_permissions` - API requests to all sites

## HTML Processing

Modify the `process_html_content()` function in `backend/main.py` to customize DOM transformations. Current example adds timestamp banner and styling modifications.

## Development Notes

- Extension auto-reloads in developer mode when files change
- Backend preserves doctype and complete DOM structure
- CORS configured for `*` origins (change for production)
- Error handling includes visual feedback in extension popup