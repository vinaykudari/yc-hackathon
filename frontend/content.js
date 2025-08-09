(function () {
  'use strict';
  if (window.domApiUpdaterLoaded) return;
  window.domApiUpdaterLoaded = true;

  // Store original page state for comparison
  let originalPageContent = null;
  let injectedStyleCounter = 0;
  let injectedScriptCounter = 0;

  // Initialize on load
  function initializeDynamicTransformation() {
    originalPageContent = document.documentElement.outerHTML;
    console.log('Dynamic transformation system initialized');
  }

  // Message listener for background script communication
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'update-dom-via-api':
        handleDOMUpdate(request.apiUrl, request.apiMethod, request.model, request.persona_id)
          .then(r => sendResponse({ success: true, ...r }))
          .catch(e => sendResponse({ success: false, error: e.message }));
        return true;
      case 'morph-transform':
        handleMorphTransform(request.apiUrl, request.model, request.persona_id)
          .then(r => sendResponse({ success: true, ...r }))
          .catch(e => sendResponse({ success: false, error: e.message }));
        return true;
      case 'apply-css':
        try {
          applyCSSContent(request.css);
          sendResponse({ success: true, message: 'CSS applied successfully' });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      case 'apply-js':
        try {
          applyJavaScriptContent(request.js);
          sendResponse({ success: true, message: 'JavaScript applied successfully' });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      case 'apply-html':
        try {
          applyHTMLContent(request.html);
          sendResponse({ success: true, message: 'HTML applied successfully' });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      case 'get-dom-info':
        sendResponse({ success: true, data: getDOMInfo() });
        break;
      case 'serialize-dom':
        sendResponse({ success: true, data: serializeDOM() });
        break;
      case 'replace-dom':
        try {
          applyApiContent(request.htmlContent, { kind: 'html' });
          sendResponse({ success: true });
        }
        catch (e) { sendResponse({ success: false, error: e.message }); }
        break;
      case 'clear-injected':
        try {
          clearInjectedContent();
          sendResponse({ success: true, message: 'Injected content cleared' });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
    }
  });

  // Main DOM update handler
  async function handleDOMUpdate(apiUrl, method = 'POST', model = null, personaId = null) {
    const currentDOM = serializeDOM();
    const apiResponse = await sendDOMToAPI(apiUrl, currentDOM, method, model, personaId);
    applyApiContent(apiResponse.content, apiResponse.metadata);
    return {
      responseSize: apiResponse.content.length,
      originalSize: currentDOM.length,
      metadata: apiResponse.metadata
    };
  }

  // Dedicated handler for morph transformations
  async function handleMorphTransform(apiUrl, model = 'morph-v3-fast', personaId = '1') {
    console.log('Starting morph transformation...');

    const currentDOM = serializeDOM();
    const apiResponse = await sendMorphRequest(apiUrl, currentDOM, model, personaId);

    console.log('Applying morph transformation...');
    applyMorphedContent(apiResponse.content);

    return {
      responseSize: apiResponse.content.length,
      originalSize: currentDOM.length,
      transformationType: 'morph'
    };
  }

  // Specialized function for morph endpoint requests
  async function sendMorphRequest(apiUrl, domContent, model = 'morph-v3-fast', personaId = '1') {
    let fullUrl = apiUrl || '';

    // Handle relative URLs and ensure proper formatting
    if (fullUrl.startsWith('/')) {
      fullUrl = window.location.origin + fullUrl;
    } else if (!fullUrl.startsWith('http')) {
      fullUrl = 'http://' + fullUrl;
    }

    // Replace 0.0.0.0 with localhost for local development
    fullUrl = fullUrl.replace('://0.0.0.0:', '://localhost:');

    // Ensure URL ends with /morph if not already specified
    if (!fullUrl.includes('/morph')) {
      fullUrl = fullUrl.replace(/\/$/, '') + '/morph';
    }

    const body = {
      prompt: domContent,
      persona_id: personaId,
      model: model
    };

    console.log(`Sending morph request to: ${fullUrl}`);
    console.log('Request parameters:', {
      model,
      persona_id: personaId,
      promptLength: domContent.length
    });

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
      mode: 'cors'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Morph API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (!data || typeof data.content !== 'string') {
      throw new Error('Morph API returned invalid response format');
    }

    console.log('Received morph response:', {
      contentLength: data.content.length,
      hasContent: !!data.content
    });

    return { content: data.content, metadata: data.metadata || {} };
  }

  // Apply morphed content with enhanced detection and handling
  function applyMorphedContent(content) {
    console.log('Applying morphed content...');

    const cleanContent = stripFences(content.trim());
    if (!cleanContent) {
      console.error('Empty content received from morph endpoint');
      return;
    }

    // Enhanced detection for morphed content
    const contentType = detectMorphedContentType(cleanContent);
    console.log(`Detected morphed content type: ${contentType}`);

    try {
      switch (contentType) {
        case 'full-html':
          console.log('Applying full HTML document transformation');
          replaceDOM(cleanContent);
          break;
        case 'html-fragment':
          console.log('Applying HTML fragment');
          injectHtmlFragment(cleanContent);
          break;
        case 'css':
          console.log('Applying CSS styles');
          injectStyle(cleanContent, `morph-style-${Date.now()}`);
          break;
        case 'javascript':
          console.log('Executing JavaScript code');
          executeJavaScriptCSPSafe(cleanContent);
          break;
        case 'mixed':
          console.log('Applying mixed content transformation');
          applyMixedContent(cleanContent);
          break;
        default:
          console.log('Applying content with auto-detection');
          autoDetectAndApply(cleanContent);
      }

      console.log('Morphed content applied successfully');

    } catch (error) {
      console.error('Error applying morphed content:', error);
      throw error;
    }
  }

  // Detect content type specifically for morphed responses
  function detectMorphedContentType(content) {
    const trimmed = content.trim();

    // Check for full HTML documents
    if (trimmed.includes('<!DOCTYPE') && trimmed.includes('<html>')) {
      return 'full-html';
    }

    // Check for HTML fragments with multiple elements
    if (trimmed.includes('<div') || trimmed.includes('<section') || trimmed.includes('<article')) {
      return 'html-fragment';
    }

    // Check for CSS (common in morph responses)
    if (trimmed.includes('{') && trimmed.includes('}') && /[a-z-]+\s*:\s*[^;]+;/.test(trimmed)) {
      return 'css';
    }

    // Check for JavaScript
    if (trimmed.includes('function') || trimmed.includes('document.') || trimmed.includes('=>')) {
      return 'javascript';
    }

    // Check for mixed content (HTML + CSS + JS)
    if ((trimmed.includes('<') && trimmed.includes('>')) &&
        (trimmed.includes('{') && trimmed.includes('}'))) {
      return 'mixed';
    }

    return 'unknown';
  }

  // Handle mixed content from morph responses
  function applyMixedContent(content) {
    console.log('Processing mixed content...');

    // Extract and apply CSS
    const cssMatches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
    if (cssMatches) {
      cssMatches.forEach((match, index) => {
        const css = match.replace(/<\/?style[^>]*>/g, '');
        injectStyle(css, `morph-mixed-style-${Date.now()}-${index}`);
        console.log(`Applied CSS from mixed content: style-${index}`);
      });
    }

    // Extract and execute JavaScript - CSP safe version
    const jsMatches = content.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
    if (jsMatches) {
      jsMatches.forEach((match, index) => {
        const js = match.replace(/<\/?script[^>]*>/g, '');
        executeJavaScriptCSPSafe(js);
        console.log(`Executed JavaScript from mixed content: script-${index}`);
      });
    }

    // Extract and apply HTML (remove style and script tags first)
    let htmlOnly = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');

    if (htmlOnly.trim() && htmlOnly.includes('<')) {
      if (htmlOnly.includes('<!DOCTYPE')) {
        replaceDOM(htmlOnly);
      } else {
        injectHtmlFragment(htmlOnly);
      }
      console.log('Applied HTML from mixed content');
    }
  }

  // Apply CSS content directly
  function applyCSSContent(cssContent) {
    if (!cssContent || typeof cssContent !== 'string') {
      throw new Error('Invalid CSS content provided');
    }

    const cleanCSS = stripFences(cssContent.trim());
    if (!cleanCSS) {
      throw new Error('Empty CSS content after cleaning');
    }

    console.log('Applying CSS content:', cleanCSS.substring(0, 100) + '...');
    injectStyle(cleanCSS);
  }

  // Apply JavaScript content directly - CSP safe version
  function applyJavaScriptContent(jsContent) {
    if (!jsContent || typeof jsContent !== 'string') {
      throw new Error('Invalid JavaScript content provided');
    }

    const cleanJS = stripFences(jsContent.trim());
    if (!cleanJS) {
      throw new Error('Empty JavaScript content after cleaning');
    }

    console.log('Applying JavaScript content:', cleanJS.substring(0, 100) + '...');
    executeJavaScriptCSPSafe(cleanJS);
  }

  // Apply HTML content directly
  function applyHTMLContent(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
      throw new Error('Invalid HTML content provided');
    }

    const cleanHTML = stripFences(htmlContent.trim());
    if (!cleanHTML) {
      throw new Error('Empty HTML content after cleaning');
    }

    console.log('Applying HTML content:', cleanHTML.substring(0, 100) + '...');

    if (cleanHTML.includes('<!DOCTYPE') && cleanHTML.includes('<html>')) {
      // Full HTML document
      replaceDOM(cleanHTML);
    } else {
      // HTML fragment
      injectHtmlFragment(cleanHTML);
    }
  }

  // CSP-safe JavaScript execution using external script files
  function executeJavaScriptCSPSafe(jsCode) {
    try {
      // Remove script tags if present
      const cleanCode = stripScriptTags(jsCode);

      // Create a blob URL for the script content
      const blob = new Blob([cleanCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      // Create a script element that loads from the blob URL
      const scriptId = `injected-script-${++injectedScriptCounter}`;
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.src = blobUrl;

      // Add error handling
      script.onerror = function(error) {
        console.error(`Error loading script ${scriptId}:`, error);
        URL.revokeObjectURL(blobUrl);
      };

      // Clean up blob URL after script loads
      script.onload = function() {
        console.log(`Script loaded successfully: ${scriptId}`);
        // Clean up blob URL after a delay to ensure script execution
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      };

      // Add script to head for execution
      document.head.appendChild(script);
      console.log(`JavaScript injected via external source: ${scriptId}`);

    } catch (error) {
      console.error('Error executing JavaScript (CSP-safe):', error);
      // Fallback to message-based execution if blob URLs don't work
      tryMessageBasedExecution(jsCode);
    }
  }

  // Fallback execution method using postMessage
  function tryMessageBasedExecution(jsCode) {
    try {
      console.log('Attempting message-based JavaScript execution...');

      // Send code to background script for evaluation
      chrome.runtime.sendMessage({
        action: 'execute-js-sandbox',
        code: jsCode
      }, (response) => {
        if (response && response.success) {
          console.log('JavaScript executed successfully via sandbox');
        } else {
          console.error('JavaScript execution failed:', response?.error);
        }
      });

    } catch (error) {
      console.error('Message-based execution also failed:', error);
      console.warn('JavaScript code could not be executed due to CSP restrictions');
    }
  }

  // Enhanced style injection with better management
  function injectStyle(css, styleId = null) {
    try {
      const id = styleId || `injected-style-${++injectedStyleCounter}`;

      // Check if style with this ID already exists
      let styleElement = document.getElementById(id);

      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = id;
        styleElement.type = 'text/css';
        document.head.appendChild(styleElement);
        console.log(`Created new style element: ${id}`);
      } else {
        console.log(`Updating existing style element: ${id}`);
      }

      // Set CSS content
      styleElement.textContent = css;

      // Add metadata attributes
      styleElement.setAttribute('data-injected-at', new Date().toISOString());
      styleElement.setAttribute('data-injected-by', 'dom-api-updater');

      console.log(`Style applied successfully: ${id}`);

    } catch (error) {
      console.error('Error injecting style:', error);
      throw error;
    }
  }

  // Clear all injected content
  function clearInjectedContent() {
    // Remove injected styles
    const injectedStyles = document.querySelectorAll('style[data-injected-by="dom-api-updater"]');
    injectedStyles.forEach(style => {
      console.log(`Removing injected style: ${style.id}`);
      style.remove();
    });

    // Remove injected scripts
    const injectedScripts = document.querySelectorAll('script[id^="injected-script-"]');
    injectedScripts.forEach(script => {
      console.log(`Removing injected script: ${script.id}`);
      script.remove();
    });

    // Remove injected HTML elements
    const injectedElements = document.querySelectorAll('[data-injected-by="dom-api-updater"]');
    injectedElements.forEach(element => {
      console.log(`Removing injected element: ${element.tagName}${element.id ? '#' + element.id : ''}`);
      element.remove();
    });

    console.log('All injected content cleared');
  }

  // Dynamic content application system (enhanced)
  function applyApiContent(content, meta) {
    console.log('Applying API content dynamically...', {
      contentLength: content.length,
      metadata: meta
    });

    const cleanContent = stripFences((content || '').trim());
    if (!cleanContent) {
      console.error('Empty content received from API');
      return;
    }

    // Handle full HTML transformations from Morph
    if (cleanContent.includes('<!DOCTYPE') && cleanContent.length > 1000) {
      console.log('Detected full HTML transformation from Morph');
      applyHtmlTransformation(cleanContent);
      return;
    }

    // Handle other content types
    const kind = meta && meta.kind ? meta.kind : guessContentType(cleanContent);
    console.log('Content classified as:', kind);

    try {
      switch (kind) {
        case 'html':
          if (cleanContent.includes('<!DOCTYPE')) {
            applyHtmlTransformation(cleanContent);
          } else {
            injectHtmlFragment(cleanContent);
          }
          break;
        case 'css':
          injectStyle(cleanContent);
          break;
        case 'js':
        case 'javascript':
          executeJavaScriptCSPSafe(cleanContent);
          break;
        default:
          console.log('Unknown content type, attempting to detect and apply...');
          autoDetectAndApply(cleanContent);
      }
    } catch (error) {
      console.error('Error applying content:', error);
      throw error;
    }
  }

  // Auto-detect content type and apply appropriately
  function autoDetectAndApply(content) {
    const trimmed = content.trim();

    // Try CSS first
    if (looksLikeCSS(trimmed)) {
      console.log('Auto-detected as CSS');
      injectStyle(trimmed);
      return;
    }

    // Try JavaScript
    if (looksLikeJavaScript(trimmed)) {
      console.log('Auto-detected as JavaScript');
      executeJavaScriptCSPSafe(trimmed);
      return;
    }

    // Try HTML
    if (looksLikeHTML(trimmed)) {
      console.log('Auto-detected as HTML');
      injectHtmlFragment(trimmed);
      return;
    }

    // Default to JavaScript for unknown content
    console.log('Could not auto-detect, defaulting to JavaScript execution');
    executeJavaScriptCSPSafe(trimmed);
  }

  // Content type detection helpers
  function looksLikeCSS(content) {
    // Check for CSS patterns
    const cssPatterns = [
      /[a-z-]+\s*:\s*[^;{]+[;}]/i,  // property: value;
      /\.[a-zA-Z_-]+\s*\{/,         // .class {
      /#[a-zA-Z_-]+\s*\{/,          // #id {
      /@[a-zA-Z-]+/,                // @media, @import, etc.
      /[a-zA-Z]+\s*\{[^}]*\}/       // selector { rules }
    ];

    return cssPatterns.some(pattern => pattern.test(content)) &&
           !content.includes('<') &&
           !content.includes('function') &&
           !content.includes('document.');
  }

  function looksLikeJavaScript(content) {
    const jsPatterns = [
      /\bfunction\b/,
      /\bdocument\./,
      /\bwindow\./,
      /\bconsole\./,
      /\bvar\s+\w+/,
      /\blet\s+\w+/,
      /\bconst\s+\w+/,
      /=>\s*\{/,
      /\(\s*function/,
      /addEventListener/,
      /querySelector/
    ];

    return jsPatterns.some(pattern => pattern.test(content));
  }

  function looksLikeHTML(content) {
    const htmlPatterns = [
      /<[a-zA-Z]+[^>]*>/,
      /<\/[a-zA-Z]+>/,
      /<!DOCTYPE/i,
      /<html/i,
      /<head/i,
      /<body/i
    ];

    return htmlPatterns.some(pattern => pattern.test(content));
  }

  // Enhanced content type guessing
  function guessContentType(content) {
    const trimmed = content.trim().toLowerCase();

    // Check for full HTML documents
    if (trimmed.startsWith('<!doctype') || /<html|<head|<body/.test(trimmed)) {
      return 'html';
    }

    // Check for CSS
    if (looksLikeCSS(content)) {
      return 'css';
    }

    // Check for JavaScript
    if (looksLikeJavaScript(content)) {
      return 'js';
    }

    // Check for HTML fragments
    if (looksLikeHTML(content)) {
      return 'html';
    }

    // Default to JavaScript for mixed or unknown content
    return 'js';
  }

  // Enhanced HTML fragment injection
  function injectHtmlFragment(html) {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      Array.from(tempDiv.children).forEach(child => {
        // Add metadata to track injected elements
        child.setAttribute('data-injected-by', 'dom-api-updater');
        child.setAttribute('data-injected-at', new Date().toISOString());

        document.body.appendChild(child);
        setupDynamicHandlers(child);

        console.log(`Injected HTML element: ${child.tagName}${child.id ? '#' + child.id : ''}`);
      });

    } catch (error) {
      console.error('Error injecting HTML fragment:', error);
      throw error;
    }
  }

  // Dynamic HTML transformation handler
  function applyHtmlTransformation(transformedHTML) {
    try {
      console.log('Processing HTML transformation...');

      // Extract and apply new styles
      const stylesApplied = extractAndApplyStyles(transformedHTML);

      // Extract and apply new elements
      const elementsApplied = extractAndApplyElements(transformedHTML);

      // Extract and recreate JavaScript functionality - CSP safe
      const jsMatch = transformedHTML.match(/\(\(\)\s*=>\s*\{[\s\S]*?\}\)\(\);|\(function\(\)\s*\{[\s\S]*?\}\)\(\);/);
      if (jsMatch) {
        console.log('Found JavaScript in transformation, executing...');
        executeJavaScriptCSPSafe(jsMatch[0]);
      }

      console.log(`Transformation applied: ${stylesApplied} styles, ${elementsApplied} elements`);

    } catch (error) {
      console.error('Error applying HTML transformation:', error);
      // Fallback: try to replace the entire page if safe
      if (transformedHTML.includes('<!DOCTYPE') && transformedHTML.includes('<body>')) {
        console.log('Falling back to full page replacement');
        replaceDOM(transformedHTML);
      }
    }
  }

  // Extract and apply new styles dynamically
  function extractAndApplyStyles(transformedHTML) {
    try {
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(transformedHTML, 'text/html');

      let stylesApplied = 0;

      // Extract style elements with IDs
      const styleElements = newDoc.querySelectorAll('style[id]');
      styleElements.forEach(style => {
        if (!document.getElementById(style.id)) {
          injectStyle(style.textContent, style.id);
          console.log(`Applied style: ${style.id}`);
          stylesApplied++;
        }
      });

      // Extract inline styles in head
      const headStyles = newDoc.querySelectorAll('head style:not([id])');
      headStyles.forEach((style, index) => {
        const styleId = `dynamic-style-${Date.now()}-${index}`;
        injectStyle(style.textContent, styleId);
        console.log(`Applied anonymous style: ${styleId}`);
        stylesApplied++;
      });

      return stylesApplied;
    } catch (error) {
      console.error('Error extracting styles:', error);
      return 0;
    }
  }

  // Extract and apply new elements dynamically
  function extractAndApplyElements(transformedHTML) {
    try {
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(transformedHTML, 'text/html');

      let elementsApplied = 0;

      // Find elements that don't exist in current page
      const newElements = findNewElements(newDoc);

      newElements.forEach(element => {
        const clonedElement = element.cloneNode(true);

        // Add tracking attributes
        clonedElement.setAttribute('data-injected-by', 'dom-api-updater');
        clonedElement.setAttribute('data-injected-at', new Date().toISOString());

        // Remove any inline event handlers to comply with CSP
        removeInlineEventHandlers(clonedElement);

        // Determine placement based on element characteristics
        const placement = determinePlacement(element);
        applyElementWithPlacement(clonedElement, placement);

        // Set up dynamic event handlers for interactive elements
        setupDynamicHandlers(clonedElement);

        console.log(`Applied element: ${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.split(' ').join('.') : ''}`);
        elementsApplied++;
      });

      return elementsApplied;
    } catch (error) {
      console.error('Error extracting elements:', error);
      return 0;
    }
  }

  // Remove inline event handlers to comply with CSP
  function removeInlineEventHandlers(element) {
    // Remove inline event attributes
    const eventAttributes = ['onclick', 'onload', 'onmouseover', 'onmouseout', 'onchange', 'onsubmit'];
    eventAttributes.forEach(attr => {
      if (element.hasAttribute(attr)) {
        console.log(`Removing inline event handler: ${attr}`);
        element.removeAttribute(attr);
      }
    });

    // Recursively process child elements
    Array.from(element.children).forEach(child => {
      removeInlineEventHandlers(child);
    });
  }

  // Find elements that are new compared to original page
  function findNewElements(newDoc) {
    const newElements = [];
    const currentElements = new Set();

    // Build a set of current element signatures
    document.querySelectorAll('*').forEach(el => {
      const signature = getElementSignature(el);
      currentElements.add(signature);
    });

    // Check which elements in newDoc are truly new
    newDoc.querySelectorAll('body *').forEach(el => {
      const signature = getElementSignature(el);
      if (!currentElements.has(signature) && isUserElement(el)) {
        newElements.push(el);
      }
    });

    return newElements;
  }

  // Create a unique signature for an element
  function getElementSignature(element) {
    return `${element.tagName.toLowerCase()}|${element.id || ''}|${element.className || ''}|${element.textContent?.substring(0, 50) || ''}`;
  }

  // Check if element is user-generated (not browser/extension elements)
  function isUserElement(element) {
    const excludeIds = ['ai-widget-root'];
    const excludeClasses = ['ai-widget', 'extension-'];

    if (excludeIds.includes(element.id)) return false;
    if (excludeClasses.some(cls => element.className?.includes(cls))) return false;

    return true;
  }

  // Determine where to place an element
  function determinePlacement(element) {
    const style = element.style;
    const computed = window.getComputedStyle ? window.getComputedStyle(element) : {};

    if (style.position === 'fixed' || computed.position === 'fixed') {
      return 'fixed';
    }
    if (style.position === 'absolute' || computed.position === 'absolute') {
      return 'absolute';
    }
    if (element.tagName.toLowerCase() === 'style') {
      return 'head';
    }
    if (style.top === '0' || style.top === '0px') {
      return 'top';
    }

    return 'body';
  }

  // Apply element based on placement strategy
  function applyElementWithPlacement(element, placement) {
    switch (placement) {
      case 'head':
        document.head.appendChild(element);
        break;
      case 'fixed':
      case 'absolute':
        document.body.appendChild(element);
        break;
      case 'top':
        document.body.insertAdjacentElement('afterbegin', element);
        break;
      default:
        document.body.appendChild(element);
    }
  }

  // Set up dynamic event handlers for interactive elements (CSP-safe)
  function setupDynamicHandlers(element) {
    // Handle buttons
    const buttons = element.tagName === 'BUTTON' ? [element] : element.querySelectorAll('button');
    buttons.forEach(button => {
      if (!button.hasAttribute('data-handler-setup')) {
        button.addEventListener('click', function() {
          handleDynamicButtonClick(this);
        });
        button.setAttribute('data-handler-setup', 'true');
      }
    });

    // Handle links with anchors
    const links = element.tagName === 'A' ? [element] : element.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      if (!link.hasAttribute('data-handler-setup')) {
        link.addEventListener('click', function(e) {
          handleDynamicLinkClick(this, e);
        });
        link.setAttribute('data-handler-setup', 'true');
      }
    });
  }

  // Dynamic button click handler
  function handleDynamicButtonClick(button) {
    const action = button.textContent.toLowerCase().replace(/\s+/g, '');
    const classList = button.className.toLowerCase();

    console.log(`Dynamic button clicked: ${action}`);

    // Handle common accessibility actions
    if (action.includes('contrast') || classList.includes('contrast')) {
      toggleClassOnElements(['body', 'html'], 'ac-high-contrast');
    } else if (action.includes('focus') || classList.includes('focus')) {
      toggleClassOnElements(['html'], 'ac-focus');
    } else if (action.includes('motion') || classList.includes('motion')) {
      toggleClassOnElements(['html', 'body'], 'ac-reduce-motion');
    } else if (action.includes('safe') || action.includes('color')) {
      toggleClassOnElements(['body'], 'ac-color-safe');
      document.querySelectorAll('*').forEach(el => el.classList.toggle('ac-color-safe'));
    }

    // Visual feedback
    button.style.backgroundColor = '#e0e0e0';
    setTimeout(() => {
      button.style.backgroundColor = '';
    }, 150);
  }

  // Dynamic link click handler
  function handleDynamicLinkClick(link, event) {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      event.preventDefault();
      const target = document.querySelector(href) || document.getElementById(href.substring(1));
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // Toggle classes on multiple elements
  function toggleClassOnElements(selectors, className) {
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.classList.toggle(className));
    });
  }

  // Enhanced utility functions
  function stripFences(content) {
    let result = content;
    // Remove code fences
    if (result.startsWith('```')) {
      result = result.replace(/^```[a-zA-Z0-9_-]*\n/, '');
      result = result.replace(/\n```\s*$/, '');
    }
    return result;
  }

  function stripScriptTags(content) {
    const match = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    return match ? match[1].trim() : content;
  }

  function serializeDOM() {
    const doctype = document.doctype
      ? '<!DOCTYPE ' + document.doctype.name +
        (document.doctype.publicId ? ' PUBLIC "' + document.doctype.publicId + '"' : '') +
        (document.doctype.systemId ? ' "' + document.doctype.systemId + '"' : '') +
        '>'
      : '';
    const html = document.documentElement.outerHTML;
    return doctype + '\n' + html;
  }

  async function sendDOMToAPI(apiUrl, domContent, method = 'POST', model = null, personaId = null) {
    let fullUrl = apiUrl || '';

    // Handle relative URLs
    if (fullUrl.startsWith('/')) {
      fullUrl = window.location.origin + fullUrl;
    } else if (!fullUrl.startsWith('http')) {
      fullUrl = 'http://' + fullUrl;
    }

    // Replace 0.0.0.0 with localhost for local development
    fullUrl = fullUrl.replace('://0.0.0.0:', '://localhost:');

    // Prepare request body for /morph endpoint
    const body = {
      prompt: domContent,
      persona_id: personaId || '1',
      model: model || 'morph-v3-fast'
    };

    console.log('Sending request to morph endpoint:', fullUrl);
    console.log('Request body:', {
      ...body,
      prompt: body.prompt.substring(0, 200) + '...' // Log truncated prompt
    });

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
      mode: 'cors'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (!data || typeof data.content !== 'string') {
      throw new Error('API returned invalid response format');
    }

    console.log('Received response from morph endpoint:', {
      contentLength: data.content.length,
      contentPreview: data.content.substring(0, 200) + '...'
    });

    return { content: data.content, metadata: data.metadata || {} };
  }

  function replaceDOM(htmlContent) {
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(htmlContent, 'text/html');
    if (newDoc.querySelector('parsererror')) {
      throw new Error('Invalid HTML content received from API');
    }

    const scrollX = window.scrollX, scrollY = window.scrollY;
    document.open();
    document.write(htmlContent);
    document.close();
    setTimeout(() => window.scrollTo(scrollX, scrollY), 100);
  }

  function getDOMInfo() {
    return {
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
        styles: document.querySelectorAll('style, link[rel="stylesheet"]').length,
        injectedStyles: document.querySelectorAll('style[data-injected-by="dom-api-updater"]').length,
        injectedScripts: document.querySelectorAll('script[id^="injected-script-"]').length,
        injectedElements: document.querySelectorAll('[data-injected-by="dom-api-updater"]').length
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll: { x: window.scrollX, y: window.scrollY },
      timestamp: new Date().toISOString()
    };
  }

  // Initialize the system
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDynamicTransformation);
  } else {
    initializeDynamicTransformation();
  }

  // Notify background script that content script is ready
  chrome.runtime.sendMessage({
    action: 'content-script-ready',
    url: window.location.href
  });
})();