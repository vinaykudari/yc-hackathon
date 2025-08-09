// Content script for DOM API Updater Chrome Extension

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.domApiUpdaterLoaded) {
    return;
  }
  window.domApiUpdaterLoaded = true;

  console.log('DOM API Updater content script loaded');

  // Listen for messages from popup and background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);

    switch (request.action) {
      case 'update-dom-via-api':
        handleDOMUpdate(request.apiUrl, request.apiMethod)
          .then(result => sendResponse({ success: true, ...result }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response

      case 'get-dom-info':
        const domInfo = getDOMInfo();
        sendResponse({ success: true, data: domInfo });
        break;

      case 'serialize-dom':
        const serializedDOM = serializeDOM();
        sendResponse({ success: true, data: serializedDOM });
        break;

      case 'replace-dom':
        try {
          replaceDOM(request.htmlContent);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;

      case 'gather-css':
        gatherCss()
          .then(css => sendResponse({ success: true, data: { css } }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;

      case 'inject-css':
        try {
          injectCss(request.css || '');
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
    }
  });

  // Main function to handle DOM update via API
  async function handleDOMUpdate(apiUrl, method = 'POST') {
    try {
      // Step 1: Serialize current DOM
      const currentDOM = serializeDOM();
      console.log('Serialized DOM length:', currentDOM.length);

      // Step 2: Send DOM to API
      const apiResponse = await sendDOMToAPI(apiUrl, currentDOM, method);
      console.log('API response received');

      // Step 3: Replace DOM with API response
      replaceDOM(apiResponse.content);

      return {
        responseSize: apiResponse.content.length,
        originalSize: currentDOM.length,
        metadata: apiResponse.metadata
      };

    } catch (error) {
      console.error('DOM update failed:', error);
      throw error;
    }
  }

  // Serialize the entire DOM to HTML string
  function serializeDOM() {
    // Get the complete HTML including doctype
    const doctype = document.doctype ? 
      `<!DOCTYPE ${document.doctype.name}` +
      (document.doctype.publicId ? ` PUBLIC "${document.doctype.publicId}"` : '') +
      (document.doctype.systemId ? ` "${document.doctype.systemId}"` : '') +
      '>' : '';
    
    const htmlContent = document.documentElement.outerHTML;
    
    return doctype + '\n' + htmlContent;
  }

  // Send DOM to API endpoint
  async function sendDOMToAPI(apiUrl, domContent, method = 'POST') {
    let fullUrl = apiUrl;
    if (apiUrl.startsWith('/')) {
        fullUrl = window.location.origin + apiUrl;
    } else if (!apiUrl.startsWith('http')) {
        fullUrl = 'https://' + apiUrl;
    }
    fullUrl = fullUrl.replace('://0.0.0.0:', '://localhost:');

    console.log('Sending DOM to:', fullUrl);
    console.log('Request details:', {
      url: fullUrl,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      promptLength: domContent.length,
      promptPreview: domContent.slice(0, 200)
    });

    const jsonBody = {
        prompt: domContent,
        model: "morph-v3-fast"
    };

    const payload = {
      url: fullUrl,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(jsonBody)
    };

    // Delegate network call to background to avoid mixed content/CORS issues
    const bgResp = await chrome.runtime.sendMessage({ action: 'perform-api-call', payload });
    if (!bgResp || !bgResp.success) {
      throw new Error(bgResp?.error || 'Background API call failed');
    }
    const result = bgResp.result;
    console.log('Background API call response:', { status: result.status, statusText: result.statusText, headers: result.headers });

    const responseData = result.body;
    if (!responseData || !responseData.content) {
        throw new Error('API returned invalid response format');
    }

    if (!responseData || !responseData.content) {
        throw new Error('API returned invalid response format');
    }

    console.log('API response metadata:', responseData.metadata);

    return {
        content: responseData.content,
        metadata: responseData.metadata || {}
    };
}

  // Replace current DOM with new HTML content
  function replaceDOM(htmlContent) {
    try {
      // Parse the new HTML content
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(htmlContent, 'text/html');

      if (newDoc.querySelector('parsererror')) {
        throw new Error('Invalid HTML content received from API');
      }

      // Store current scroll position
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Replace the entire document content
      document.open();
      document.write(htmlContent);
      document.close();

      // Restore scroll position after a brief delay
      setTimeout(() => {
        window.scrollTo(scrollX, scrollY);
      }, 100);

      console.log('DOM successfully replaced');

    } catch (error) {
      console.error('Failed to replace DOM:', error);
      throw new Error(`DOM replacement failed: ${error.message}`);
    }
  }

  // Get information about current DOM
  function getDOMInfo() {
    const info = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      doctype: document.doctype ? document.doctype.name : 'No doctype',
      htmlLength: document.documentElement.outerHTML.length,
      bodyLength: document.body ? document.body.innerHTML.length : 0,
      elementCounts: {
        total: document.querySelectorAll('*').length,
        divs: document.querySelectorAll('div').length,
        paragraphs: document.querySelectorAll('p').length,
        links: document.querySelectorAll('a').length,
        images: document.querySelectorAll('img').length,
        scripts: document.querySelectorAll('script').length,
        styles: document.querySelectorAll('style, link[rel="stylesheet"]').length
      },
      headElements: Array.from(document.head.children).map(el => ({
        tag: el.tagName.toLowerCase(),
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {})
      })).slice(0, 10), // Limit to first 10 head elements
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      scroll: {
        x: window.scrollX,
        y: window.scrollY
      },
      timestamp: new Date().toISOString()
    };

    return info;
  }

  // Gather CSS from the page: inline <style>, style attributes, and external stylesheets
  async function gatherCss() {
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map(s => s.textContent || '')
      .filter(Boolean)
      .join('\n\n/* ---- Next <style> ---- */\n\n');

    const styleAttributes = Array.from(document.querySelectorAll('[style]'))
      .slice(0, 2000) // cap to keep payload smaller
      .map(el => {
        const selector = el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(' ').join('.')}` : el.tagName.toLowerCase();
        return `${selector} { ${el.getAttribute('style') || ''} }`;
      })
      .filter(Boolean)
      .join('\n');

    const linkHrefs = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(l => l.href)
      .filter(Boolean);

    let externalCss = '';
    if (linkHrefs.length) {
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'fetch-css-resources', urls: linkHrefs });
        if (resp && resp.success) {
          externalCss = resp.css || '';
        }
      } catch (_) {
        // ignore failures, still return what we have
      }
    }

    const combined = [
      '/* === Inline <style> blocks === */',
      inlineStyles,
      '/* === [style] attributes (subset) === */',
      styleAttributes,
      '/* === External stylesheets === */',
      externalCss
    ].filter(Boolean).join('\n\n');

    return combined;
  }

  // Inject CSS into the page via a dedicated <style id="morph-apply-style">
  function injectCss(cssText) {
    if (typeof cssText !== 'string') throw new Error('CSS must be a string');
    const styleId = 'morph-apply-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.documentElement.appendChild(styleEl);
    }
    styleEl.textContent = cssText;
  }

  // Create a visual indicator when DOM is being updated
  function showUpdateIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'dom-update-indicator';
    indicator.innerHTML = '🔄 Updating DOM...';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
    `;

    // Add animation keyframes
    if (!document.querySelector('#dom-update-styles')) {
      const style = document.createElement('style');
      style.id = 'dom-update-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(indicator);

    // Remove indicator after 3 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 3000);
  }

  // Send ready message to background script
  chrome.runtime.sendMessage({ 
    action: 'content-script-ready', 
    url: window.location.href 
  });

})();
