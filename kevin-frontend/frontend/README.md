# DOM API Updater Chrome Extension

A Chrome extension that can send the entire DOM of a webpage to an API endpoint and replace the current DOM with the API response. Built for the YC Hackathon.

## Features

- **DOM Serialization**: Captures the complete DOM including doctype and all elements
- **API Integration**: Sends DOM to configurable API endpoint (`/test-api` by default)
- **DOM Replacement**: Replaces current page DOM with API response
- **Visual Feedback**: Shows loading indicators and status messages
- **Error Handling**: Comprehensive error handling with user feedback
- **Settings Storage**: Saves API configuration between sessions
- **Context Menu**: Right-click options for quick access
- **CORS Support**: Handles cross-origin requests properly

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the `frontend` directory
4. The extension should now appear in your extensions list

## Usage

### Basic Usage

1. **Configure API**: Click the extension icon and enter your API endpoint URL
2. **Update DOM**: Click "Update DOM via API" to send current DOM to your API
3. **Preview DOM**: Click "Preview Current DOM" to see DOM information

### API Requirements

Your API endpoint should:
- Accept `POST` or `PUT` requests
- Receive HTML content in the request body
- Return HTML content in the response
- Include proper CORS headers for browser requests

Example API response headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, PUT, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With
Content-Type: text/html
```

### API Endpoint Examples

**Relative URL** (uses current domain):
```
/test-api
```

**Absolute URL**:
```
https://your-api.com/test-api
```

**Local development**:
```
http://localhost:3000/test-api
```

## File Structure

```
frontend/
├── manifest.json          # Extension manifest (v3)
├── popup.html             # Extension popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── background.js          # Service worker script
├── content.js             # Content script for DOM manipulation
├── content.css            # Content script styles
├── icons/                 # Extension icons directory
└── README.md              # This file
```

## How It Works

1. **DOM Serialization**: The content script captures the entire DOM using `document.documentElement.outerHTML` including the doctype
2. **API Request**: Sends the serialized DOM to your API endpoint via fetch with proper headers
3. **Response Processing**: Receives HTML response from your API
4. **DOM Replacement**: Uses `document.open()`, `document.write()`, and `document.close()` to replace the entire page
5. **State Preservation**: Attempts to preserve scroll position after DOM replacement

## API Integration Details

### Request Format
- **Method**: POST or PUT (configurable)
- **Content-Type**: `text/html`
- **Body**: Complete HTML document including doctype

### Response Format
- **Content-Type**: `text/html`
- **Body**: Complete HTML document to replace current DOM

### Example API Implementation (Node.js/Express)

```javascript
app.post('/test-api', (req, res) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With');
  
  // Get the DOM content
  const domContent = req.body;
  
  // Process the DOM (your custom logic here)
  const modifiedDOM = processDOM(domContent);
  
  // Return modified DOM
  res.type('text/html').send(modifiedDOM);
});
```

## Permissions

The extension requires these permissions:
- `activeTab`: Access the current tab for DOM manipulation
- `storage`: Store API settings and configuration
- `scripting`: Inject content scripts for DOM access
- `host_permissions`: Access all websites for API requests

## Settings

The extension stores these settings:
- **API URL**: The endpoint to send DOM data to
- **HTTP Method**: POST or PUT for API requests
- **Notifications**: Enable/disable success notifications

## Error Handling

The extension handles various error scenarios:
- **Invalid API URL**: Shows error message for malformed URLs
- **Network Errors**: Displays network-related error messages
- **API Errors**: Shows HTTP status codes and error messages
- **Invalid HTML**: Validates HTML response before DOM replacement
- **CORS Issues**: Provides guidance for CORS configuration

## Development

### Testing Locally

1. Set up a local API server that accepts HTML and returns HTML
2. Configure the extension to use your local endpoint
3. Test on various websites to ensure compatibility

### Debugging

1. Open Chrome DevTools
2. Check the Console tab for error messages
3. Use the Network tab to monitor API requests
4. Check the Extension's background page for service worker logs

## Security Considerations

- The extension can modify any webpage's DOM
- API endpoints should validate and sanitize HTML content
- Consider implementing authentication for production APIs
- Be cautious with untrusted HTML content from APIs

## Limitations

- Requires CORS-enabled API endpoints
- May not preserve all JavaScript state after DOM replacement
- Some dynamic content may need to be re-initialized
- Large DOM documents may impact performance

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your API includes proper CORS headers
2. **Empty Response**: Check that your API returns valid HTML content
3. **DOM Not Updating**: Verify the API response contains complete HTML document
4. **Network Errors**: Check API endpoint URL and network connectivity

### Debug Steps

1. Open extension popup and check for error messages
2. Check browser console for detailed error logs
3. Verify API endpoint is accessible and returns HTML
4. Test with a simple API that returns static HTML

## Example Use Cases

- **Content Transformation**: Modify webpage content through external processing
- **A/B Testing**: Serve different versions of pages through API
- **Content Filtering**: Process and filter webpage content
- **Dynamic Theming**: Apply different styles or layouts via API
- **Content Translation**: Translate page content through translation APIs

## Version History

### v1.0.0
- Initial release
- DOM serialization and API integration
- Visual feedback and error handling
- Settings storage and context menu integration
