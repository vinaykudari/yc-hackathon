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

      case 'gather-css-min':
        gatherCssMinimal()
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

      case 'gather-dom-min':
        try {
          const pack = gatherDomMinimal();
          sendResponse({ success: true, data: { context: pack } });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'inject-js':
        try {
          loadAndApplyJsModule(request.code || '');
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'inject-html':
        try {
          injectHtmlSnippet(request.html || '');
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      // On-page editor actions
      case 'load-site-info':
        try {
          const data = buildSiteInfo();
          sendResponse({ success: true, data });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'enter-select-mode':
        try {
          enterSelectMode();
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'get-selected-element-context':
        try {
          const ctx = getSelectedElementContext();
          sendResponse({ success: true, data: ctx });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'apply-text-to-selected':
        try {
          const ok = applyTextToSelected(request.text || '');
          sendResponse({ success: ok });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'show-editor-overlay':
        try {
          showEditorOverlay();
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'enter-pen-mode':
        try {
          enterPenMode();
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'enter-box-mode':
        try {
          enterBoxMode();
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'exit-all-modes':
        try {
          exitAllModes();
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'clear-annotations':
        try {
          clearAnnotations();
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'export-pdf':
        exportPageAsPDF()
          .then(() => sendResponse({ success: true }))
          .catch(e => sendResponse({ success: false, error: e.message }));
        return true;
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

  // ===== On-page editor =====
  let selectModeActive = false;
  let selectedElement = null;
  let hoverOverlay = null;

  // Drawing and annotation tools
  let penModeActive = false;
  let boxModeActive = false;
  let isDrawing = false;
  let currentPath = null;
  let currentBox = null;
  let drawingCanvas = null;
  let annotations = [];
  let penColor = '#ff0000';
  let penWidth = 3;
  let boxColor = '#0066cc';
  let boxBorderWidth = 2;

  function buildSiteInfo() {
    return {
      url: location.href,
      title: document.title,
      viewport: { width: innerWidth, height: innerHeight },
      hasFrameworkHints: Boolean(document.querySelector('#__next, [data-reactroot], #app, [data-v-app]')),
      numElements: document.querySelectorAll('*').length,
      topHeadings: Array.from(document.querySelectorAll('h1,h2')).slice(0, 5).map(h => ({
        tag: h.tagName.toLowerCase(),
        text: (h.innerText || '').slice(0, 120)
      }))
    };
  }

  // ===== Drawing and annotation tools =====
  
  function createDrawingCanvas() {
    if (drawingCanvas) return drawingCanvas;
    
    drawingCanvas = document.createElement('canvas');
    drawingCanvas.id = 'morph-drawing-canvas';
    drawingCanvas.width = Math.floor(window.innerWidth);
    drawingCanvas.height = Math.floor(window.innerHeight);
    
    Object.assign(drawingCanvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '2147483645',
      background: 'transparent'
    });
    
    document.body.appendChild(drawingCanvas);
    
    // Handle window resize
    const resizeCanvas = () => {
      drawingCanvas.width = Math.floor(window.innerWidth);
      drawingCanvas.height = Math.floor(window.innerHeight);
      redrawAnnotations();
    };
    window.addEventListener('resize', resizeCanvas);
    
    return drawingCanvas;
  }
  
  function enterPenMode() {
    exitAllModes();
    penModeActive = true;
    createDrawingCanvas();
    drawingCanvas.style.setProperty('pointer-events', 'auto', 'important');
    drawingCanvas.style.cursor = 'crosshair';
    
    drawingCanvas.addEventListener('mousedown', onPenMouseDown);
    drawingCanvas.addEventListener('mousemove', onPenMouseMove);
    drawingCanvas.addEventListener('mouseup', onPenMouseUp);
    drawingCanvas.addEventListener('mouseleave', onPenMouseUp);
    console.log('[Morph] Pen mode ON');
  }
  
  function enterBoxMode() {
    exitAllModes();
    boxModeActive = true;
    createDrawingCanvas();
    drawingCanvas.style.setProperty('pointer-events', 'auto', 'important');
    drawingCanvas.style.cursor = 'crosshair';
    
    drawingCanvas.addEventListener('mousedown', onBoxMouseDown);
    drawingCanvas.addEventListener('mousemove', onBoxMouseMove);
    drawingCanvas.addEventListener('mouseup', onBoxMouseUp);
    drawingCanvas.addEventListener('mouseleave', onBoxMouseUp);
    console.log('[Morph] Box mode ON');
  }
  
  function exitAllModes() {
    // Exit select mode
    if (selectModeActive) {
      selectModeActive = false;
      if (hoverOverlay) hoverOverlay.style.display = 'none';
      document.removeEventListener('mousemove', onMouseMoveHighlight, true);
      document.removeEventListener('click', onClickSelect, true);
    }
    
    // Exit drawing modes
    penModeActive = false;
    boxModeActive = false;
    isDrawing = false;
    currentPath = null;
    currentBox = null;
    
    if (drawingCanvas) {
      drawingCanvas.style.setProperty('pointer-events', 'none', 'important');
      drawingCanvas.style.cursor = 'default';
      drawingCanvas.removeEventListener('mousedown', onPenMouseDown);
      drawingCanvas.removeEventListener('mousemove', onPenMouseMove);
      drawingCanvas.removeEventListener('mouseup', onPenMouseUp);
      drawingCanvas.removeEventListener('mouseleave', onPenMouseUp);
      drawingCanvas.removeEventListener('mousedown', onBoxMouseDown);
      drawingCanvas.removeEventListener('mousemove', onBoxMouseMove);
      drawingCanvas.removeEventListener('mouseup', onBoxMouseUp);
      drawingCanvas.removeEventListener('mouseleave', onBoxMouseUp);
    }
  }
  
  function onPenMouseDown(e) {
    if (!penModeActive) return;
    isDrawing = true;
    const { x, y } = canvasPoint(e);
    
    currentPath = {
      type: 'pen',
      points: [{ x, y }],
      color: penColor,
      width: penWidth,
      timestamp: Date.now()
    };
    console.log('[Morph] Pen down at', x, y);
  }
  
  function onPenMouseMove(e) {
    if (!penModeActive || !isDrawing || !currentPath) return;
    const { x, y } = canvasPoint(e);
    
    currentPath.points.push({ x, y });
    redrawAnnotations();
  }
  
  function onPenMouseUp(e) {
    if (!penModeActive || !isDrawing) return;
    
    isDrawing = false;
    if (currentPath && currentPath.points.length > 1) {
      annotations.push(currentPath);
    }
    currentPath = null;
  }
  
  function onBoxMouseDown(e) {
    if (!boxModeActive) return;
    isDrawing = true;
    const { x, y } = canvasPoint(e);
    
    currentBox = {
      type: 'box',
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      color: boxColor,
      borderWidth: boxBorderWidth,
      timestamp: Date.now()
    };
  }
  
  function onBoxMouseMove(e) {
    if (!boxModeActive || !isDrawing || !currentBox) return;
    const { x, y } = canvasPoint(e);
    
    currentBox.endX = x;
    currentBox.endY = y;
    redrawAnnotations();
  }
  
  function onBoxMouseUp(e) {
    if (!boxModeActive || !isDrawing) return;
    
    isDrawing = false;
    if (currentBox) {
      // Only save boxes that have meaningful size
      const width = Math.abs(currentBox.endX - currentBox.startX);
      const height = Math.abs(currentBox.endY - currentBox.startY);
      if (width > 5 && height > 5) {
        annotations.push(currentBox);
      }
    }
    currentBox = null;
  }
  
  function redrawAnnotations() {
    if (!drawingCanvas) return;
    
    const ctx = drawingCanvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    
    // Draw saved annotations
    annotations.forEach(annotation => {
      if (annotation.type === 'pen') {
        drawPenPath(ctx, annotation);
      } else if (annotation.type === 'box') {
        drawBox(ctx, annotation);
      }
    });
    
    // Draw current path/box being drawn
    if (currentPath) {
      drawPenPath(ctx, currentPath);
    }
    if (currentBox) {
      drawBox(ctx, currentBox);
    }
  }
  
  function drawPenPath(ctx, path) {
    if (!path.points || path.points.length < 2) return;
    
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    
    ctx.stroke();
  }
  
  function drawBox(ctx, box) {
    const x = Math.min(box.startX, box.endX);
    const y = Math.min(box.startY, box.endY);
    const width = Math.abs(box.endX - box.startX);
    const height = Math.abs(box.endY - box.startY);
    
    ctx.strokeStyle = box.color;
    ctx.lineWidth = box.borderWidth;
    ctx.setLineDash([]);
    
    ctx.strokeRect(x, y, width, height);
  }

  function canvasPoint(e) {
    const rect = drawingCanvas.getBoundingClientRect();
    // Use CSS pixel coordinates; ctx.setTransform handles DPR scaling
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    return { x, y };
  }
  
  function clearAnnotations() {
    annotations = [];
    if (drawingCanvas) {
      const ctx = drawingCanvas.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
  }
  
  async function exportPageAsPDF() {
    try {
      // Use browser's print functionality to generate PDF
      // First, temporarily hide the drawing canvas to avoid interference
      const originalDisplay = drawingCanvas ? drawingCanvas.style.display : '';
      if (drawingCanvas) drawingCanvas.style.display = 'none';
      
      // Create a clone of the page for PDF export that includes annotations
      const pageClone = document.documentElement.cloneNode(true);
      
      // Convert canvas annotations to SVG overlay for PDF
      if (annotations.length > 0) {
        const svgOverlay = createSVGFromAnnotations();
        if (svgOverlay) {
          pageClone.querySelector('body').appendChild(svgOverlay);
        }
      }
      
      // Restore canvas display
      if (drawingCanvas) drawingCanvas.style.display = originalDisplay;
      
      // Trigger browser print dialog
      window.print();
      
      return { success: true };
    } catch (error) {
      if (drawingCanvas) drawingCanvas.style.display = originalDisplay;
      throw new Error(`PDF export failed: ${error.message}`);
    }
  }
  
  function createSVGFromAnnotations() {
    if (annotations.length === 0) return null;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', window.innerWidth);
    svg.setAttribute('height', window.innerHeight);
    svg.style.position = 'fixed';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1000';
    
    annotations.forEach(annotation => {
      if (annotation.type === 'pen') {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = annotation.points
          .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
          .join(' ');
        
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', annotation.color);
        path.setAttribute('stroke-width', annotation.width);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        
        svg.appendChild(path);
      } else if (annotation.type === 'box') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const x = Math.min(annotation.startX, annotation.endX);
        const y = Math.min(annotation.startY, annotation.endY);
        const width = Math.abs(annotation.endX - annotation.startX);
        const height = Math.abs(annotation.endY - annotation.startY);
        
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        rect.setAttribute('stroke', annotation.color);
        rect.setAttribute('stroke-width', annotation.borderWidth);
        rect.setAttribute('fill', 'none');
        
        svg.appendChild(rect);
      }
    });
    
    return svg;
  }

  function enterSelectMode() {
    if (selectModeActive) return;
    exitAllModes();
    selectModeActive = true;
    ensureHoverOverlay();
    document.addEventListener('mousemove', onMouseMoveHighlight, true);
    document.addEventListener('click', onClickSelect, true);
    // Ensure editor is visible when entering select mode
    showEditorOverlay();
    updateOverlaySelectedInfo();
  }

  function exitSelectMode() {
    selectModeActive = false;
    if (hoverOverlay) hoverOverlay.style.display = 'none';
    document.removeEventListener('mousemove', onMouseMoveHighlight, true);
    document.removeEventListener('click', onClickSelect, true);
  }

  function ensureHoverOverlay() {
    if (hoverOverlay) return;
    hoverOverlay = document.createElement('div');
    hoverOverlay.id = 'morph-hover-overlay';
    Object.assign(hoverOverlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      border: '2px solid #38f9d7',
      background: 'rgba(56,249,215,0.08)',
      zIndex: '2147483646'
    });
    document.body.appendChild(hoverOverlay);
  }

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height };
  }

  function onMouseMoveHighlight(e) {
    if (!selectModeActive) return;
    const el = e.target;
    if (!el || !(el instanceof Element)) return;
    const r = el.getBoundingClientRect();
    Object.assign(hoverOverlay.style, {
      display: 'block',
      left: `${r.left + window.scrollX}px`,
      top: `${r.top + window.scrollY}px`,
      width: `${r.width}px`,
      height: `${r.height}px`
    });
  }

  function onClickSelect(e) {
    if (!selectModeActive) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    if (!el || !(el instanceof Element)) return;
    selectedElement = el;
    const r = el.getBoundingClientRect();
    Object.assign(hoverOverlay.style, {
      display: 'block',
      left: `${r.left + window.scrollX}px`,
      top: `${r.top + window.scrollY}px`,
      width: `${r.width}px`,
      height: `${r.height}px`
    });
    selectModeActive = false;
    document.removeEventListener('mousemove', onMouseMoveHighlight, true);
    document.removeEventListener('click', onClickSelect, true);
    updateOverlaySelectedInfo();
  }

  function simpleSelector(el) {
    if (!(el instanceof Element)) return '';
    if (el.id) return `#${el.id}`;
    const classes = (el.className || '').toString().trim().split(/\s+/).filter(Boolean);
    if (classes.length) return `${el.tagName.toLowerCase()}.${classes[0]}`;
    return el.tagName.toLowerCase();
  }

  function getSelectedElementContext() {
    if (!selectedElement) throw new Error('No element selected');
    return {
      selector: simpleSelector(selectedElement),
      tag: selectedElement.tagName.toLowerCase(),
      id: selectedElement.id || null,
      class: selectedElement.className || null,
      text: (selectedElement.innerText || '').slice(0, 400),
      inlineStyle: selectedElement.getAttribute('style') || '',
      rect: rectOf(selectedElement)
    };
  }

  function applyTextToSelected(text) {
    if (!selectedElement) throw new Error('No element selected');
    selectedElement.textContent = text;
    return true;
  }

  // ===== Editor overlay UI =====
  let editorOverlay = null;
  let editorHeader = null;
  let btnSelectToggle = null;
  let btnLoadInfo = null;
  let inputModifier = null;
  let btnApplyText = null;
  let btnApplyStyle = null;
  let infoSelected = null;
  let btnDebug = null;
  let debugPanel = null;
  let lastMorphRequest = null;
  let lastMorphResponse = null;
  let lastMorphError = null;
  let lastInjectedCss = '';
  let lastInjectedSelector = '';
  let lastComputedStyles = null;
  let lastInlineFallback = null;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let lastUsedPath = '';

  function showEditorOverlay() {
    if (!editorOverlay) createEditorOverlay();
    editorOverlay.style.display = 'block';
  }

  function hideEditorOverlay() {
    if (editorOverlay) editorOverlay.style.display = 'none';
  }

  function createEditorOverlay() {
    editorOverlay = document.createElement('div');
    editorOverlay.id = 'morph-editor-overlay';
    editorOverlay.setAttribute('role', 'dialog');
    editorOverlay.setAttribute('aria-label', 'Markup');
    Object.assign(editorOverlay.style, {
      all: 'initial',
      position: 'fixed',
      top: '80px',
      right: '12px',
      width: '420px',
      minHeight: '220px',
      zIndex: '2147483647',
      background: '#ffffff',
      color: '#333',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    });

    // Header (draggable)
    editorHeader = document.createElement('div');
    Object.assign(editorHeader.style, {
      padding: '10px 12px',
      background: 'linear-gradient(135deg, #667eea, #764ba2)',
      color: '#fff',
      borderTopLeftRadius: '10px',
      borderTopRightRadius: '10px',
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    });
    const title = document.createElement('div');
    title.textContent = 'Markup';
    const btnClose = document.createElement('button');
    btnClose.textContent = '✕';
    Object.assign(btnClose.style, {
      all: 'initial',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '16px',
      padding: '4px 6px'
    });
    btnClose.addEventListener('click', hideEditorOverlay);
    editorHeader.appendChild(title);
    editorHeader.appendChild(btnClose);
    editorOverlay.appendChild(editorHeader);

    const body = document.createElement('div');
    Object.assign(body.style, { padding: '12px' });
    body.innerHTML = "";

    // Info row
    const infoRow = document.createElement('div');
    Object.assign(infoRow.style, { marginBottom: '8px', fontSize: '12px', color: '#555' });
    infoRow.textContent = 'Select an element, then apply text or styles.';
    body.appendChild(infoRow);

    // Buttons row 1 - Tools
    const row1 = document.createElement('div');
    Object.assign(row1.style, { display: 'flex', gap: '8px', marginBottom: '8px' });
    btnLoadInfo = createActionBtn('📥 Load Info');
    btnSelectToggle = createActionBtn('🖱️ Select');
    const btnPenTool = createActionBtn('🖊️ Pen');
    const btnBoxTool = createActionBtn('📦 Box');
    row1.appendChild(btnLoadInfo);
    row1.appendChild(btnSelectToggle);
    row1.appendChild(btnPenTool);
    row1.appendChild(btnBoxTool);
    body.appendChild(row1);

    // Row 1.5 - Selection controls
    const rowSel = document.createElement('div');
    Object.assign(rowSel.style, { display: 'flex', gap: '8px', marginBottom: '8px' });
    const btnClearSelect = createActionBtn('🧹 Clear Selection');
    const btnExitModes = createActionBtn('⏹️ Exit Modes');
    rowSel.appendChild(btnClearSelect);
    rowSel.appendChild(btnExitModes);
    body.appendChild(rowSel);

    // Selected element info
    infoSelected = document.createElement('div');
    Object.assign(infoSelected.style, { fontSize: '11px', color: '#6b7280', marginBottom: '8px' });
    infoSelected.textContent = 'No element selected';
    body.appendChild(infoSelected);

    // Modifier input
    inputModifier = document.createElement('input');
    inputModifier.type = 'text';
    inputModifier.placeholder = 'Describe the change (e.g., larger, green, 800px)';
    Object.assign(inputModifier.style, {
      width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
      borderRadius: '6px', fontSize: '12px', marginBottom: '8px'
    });
    body.appendChild(inputModifier);

    // Buttons row 2
    const row2 = document.createElement('div');
    Object.assign(row2.style, { display: 'flex', gap: '8px' });
    btnApplyText = createActionBtn('✍️ Apply Text');
    btnApplyStyle = createActionBtn('🎯 Apply Style');
    row2.appendChild(btnApplyText);
    row2.appendChild(btnApplyStyle);
    body.appendChild(row2);

    // Buttons row 3 (export and clear)
    const row3 = document.createElement('div');
    Object.assign(row3.style, { display: 'flex', gap: '8px', marginTop: '8px' });
    const btnExportPDF = createActionBtn('📄 Export PDF');
    const btnClearAnnotations = createActionBtn('🗑️ Clear');
    row3.appendChild(btnExportPDF);
    row3.appendChild(btnClearAnnotations);
    body.appendChild(row3);

    // Buttons row 4 (debug)
    const row4 = document.createElement('div');
    Object.assign(row4.style, { display: 'flex', gap: '8px', marginTop: '8px' });
    btnDebug = createActionBtn('🐞 Debug');
    row4.appendChild(btnDebug);
    body.appendChild(row4);

    // Debug panel (hidden by default)
    debugPanel = document.createElement('div');
    Object.assign(debugPanel.style, {
      display: 'none',
      marginTop: '8px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      background: '#f8f9fa',
      padding: '8px',
      maxHeight: '240px',
      overflow: 'auto',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: '11px',
      color: '#374151'
    });
    body.appendChild(debugPanel);

    editorOverlay.appendChild(body);
    document.documentElement.appendChild(editorOverlay);

    // Wire actions
    btnLoadInfo.addEventListener('click', () => {
      const data = buildSiteInfo();
      console.log('Morph Editor Site Info:', data);
      infoRow.textContent = `URL: ${data.url}  | Elements: ${data.numElements}`;
    });
    btnSelectToggle.addEventListener('click', () => {
      if (selectModeActive) {
        exitSelectMode();
        btnSelectToggle.textContent = '🖱️ Select';
      } else {
        enterSelectMode();
        btnSelectToggle.textContent = '✅ Click an element...';
      }
    });
    btnApplyText.addEventListener('click', () => {
      const text = (inputModifier.value || '').trim();
      if (!text) return;
      try { applyTextToSelected(text); } catch (e) { console.warn(e.message); }
    });
    btnApplyStyle.addEventListener('click', async () => {
      const prompt = (inputModifier.value || '').trim();
      if (!prompt) return;
      try { await applyStyleViaMorph(prompt); } catch (e) { console.warn(e); }
    });
    btnDebug.addEventListener('click', () => {
      toggleAndRenderDebug();
    });

    btnClearSelect.addEventListener('click', () => {
      clearSelected();
      infoRow.textContent = 'Selection cleared';
    });
    btnExitModes.addEventListener('click', () => {
      exitAllModes();
      infoRow.textContent = 'All modes exited';
    });

    // New tool event listeners
    btnPenTool.addEventListener('click', () => {
      if (penModeActive) {
        exitAllModes();
        btnPenTool.textContent = '🖊️ Pen';
        infoRow.textContent = 'Pen mode disabled';
      } else {
        enterPenMode();
        btnPenTool.textContent = '✅ Drawing...';
        infoRow.textContent = 'Pen mode: Click and drag to draw';
      }
    });

    btnBoxTool.addEventListener('click', () => {
      if (boxModeActive) {
        exitAllModes();
        btnBoxTool.textContent = '📦 Box';
        infoRow.textContent = 'Box mode disabled';
      } else {
        enterBoxMode();
        btnBoxTool.textContent = '✅ Boxing...';
        infoRow.textContent = 'Box mode: Click and drag to create boxes';
      }
    });

    btnExportPDF.addEventListener('click', () => {
      infoRow.textContent = 'Exporting page as PDF...';
      exportPageAsPDF()
        .then(() => {
          infoRow.textContent = 'PDF export dialog opened';
        })
        .catch(e => {
          infoRow.textContent = `Export failed: ${e.message}`;
        });
    });

    btnClearAnnotations.addEventListener('click', () => {
      clearAnnotations();
      infoRow.textContent = 'All annotations cleared';
    });

    // Dragging
    editorHeader.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = editorOverlay.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const left = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - dragOffsetX));
      const top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffsetY));
      editorOverlay.style.left = `${left}px`;
      editorOverlay.style.top = `${top}px`;
      editorOverlay.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
  }

  function createActionBtn(label) {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      all: 'initial',
      flex: '1',
      padding: '8px 6px',
      background: 'linear-gradient(135deg, #667eea, #764ba2)',
      color: '#fff',
      borderRadius: '6px',
      textAlign: 'center',
      fontSize: '11px',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    });
    return btn;
  }

  function updateOverlaySelectedInfo() {
    if (!infoSelected) return;
    if (!selectedElement) {
      infoSelected.textContent = 'No element selected';
      return;
    }
    const sel = getSelectedElementContext();
    // Build clearer multi-line selected info
    infoSelected.innerHTML = '';
    const lines = [
      ['Selector', sel.selector],
      ['Tag', sel.tag],
      ['ID', sel.id || '—'],
      ['Class', sel.class || '—'],
      ['Inline style', sel.inlineStyle || '—'],
      ['Text (first 120)', (sel.text || '').slice(0, 120)]
    ];
    const list = document.createElement('div');
    for (const [k, v] of lines) {
      const row = document.createElement('div');
      row.style.marginBottom = '4px';
      const kEl = document.createElement('strong'); kEl.textContent = `${k}: `; kEl.style.color = '#374151';
      const vEl = document.createElement('span'); vEl.textContent = String(v);
      row.appendChild(kEl); row.appendChild(vEl);
      list.appendChild(row);
    }
    infoSelected.appendChild(list);
  }

  function clearSelected() {
    selectedElement = null;
    if (hoverOverlay) hoverOverlay.style.display = 'none';
    updateOverlaySelectedInfo();
  }

  async function applyStyleViaMorph(userPrompt) {
    if (!selectedElement) throw new Error('No element selected');
    const origin = location.origin;
    const storageKey = `site_css::${origin}`;
    const stored = await chrome.storage.local.get([storageKey]);
    let baseCss = String(stored[storageKey] || '/* morph site.css */\n').slice(0, 6 * 1024);
    const elemCtx = JSON.stringify(getSelectedElementContext());

    const { morphSettings } = await chrome.storage.sync.get(['morphSettings']);
    const apiKey = morphSettings?.apiKey || '';
    const model = morphSettings?.model || 'morph-v3-fast';
    // Step 1: Generate CSS rules from prompt (+selector), not a merge yet
    let selectorHint = '';
    try { selectorHint = JSON.parse(elemCtx).selector || ''; } catch (_) { selectorHint = ''; }
    const genPrompt = `Output only CSS for the following change: "${userPrompt}"\nTarget element context: ${elemCtx}\nUse selector ${selectorHint || 'from context'}; add !important. No prose, no fences, just CSS.`;
    // Prefer a fast OpenAI-compatible model for generation
    const genReq = { apiKey, model: 'gpt-5-nano', prompt: genPrompt, temperature: 0.2 };
    const genResp = await chrome.runtime.sendMessage({ action: 'openai-generate', payload: genReq });
    let cssBlock = '';
    if (genResp && genResp.success) {
      cssBlock = String(genResp.data?.text || '');
      lastMorphResponse = genResp.data;
      lastUsedPath = 'generate';
    }
    cssBlock = cssBlock.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
    // If no usable block, synthesize basic declarations from prompt and wrap
    if (!cssBlock) {
      const decls = ensureImportantOnDecls(synthesizeDeclsFromPrompt(userPrompt));
      const pathSel = buildCssPath(selectedElement);
      const selList = [];
      if (pathSel) selList.push(pathSel);
      if (selectorHint) selList.push(selectorHint, `${selectorHint} *`);
      cssBlock = `${(selList.length ? selList.join(', ') : '*')} { ${decls} }`;
    }

    // Step 2: Apply-merge the generated rules into site.css
    const applyInstruction = 'I will add or update minimal CSS rules for the selected element.';
    const updateSnippet = `/* ... existing code ... */\n${cssBlock}`;
    const applyPayload = { apiKey, model, kind: 'css', instruction: applyInstruction, original: baseCss, update: updateSnippet };
    lastMorphRequest = { model, kind: 'css', instruction: applyInstruction, original_preview: baseCss.slice(0, 200), update_preview: cssBlock.slice(0, 200), apiKeyProvided: Boolean(apiKey), contextLengths: { code: baseCss.length, gen: cssBlock.length } };
    let mergedCss = '';
    try {
      const applyResp = await chrome.runtime.sendMessage({ action: 'morph-apply', payload: applyPayload });
      if (!applyResp || !applyResp.success) throw new Error(applyResp?.error || 'Morph apply failed');
      mergedCss = String(applyResp.data?.final_code || applyResp.data?.content || applyResp.data || '').trim();
      lastUsedPath = 'generate+apply';
    } catch (e) {
      // If apply fails, fall back to just injecting the generated block
      mergedCss = `${baseCss}\n\n/* morph-appended */\n${cssBlock}\n`;
      lastMorphError = String(e);
    }

    const cssToInject = mergedCss && mergedCss.length > 0 ? mergedCss : cssBlock;

    await chrome.storage.local.set({ [storageKey]: cssToInject });
    try { lastInjectedSelector = JSON.parse(elemCtx).selector || ''; } catch (_) { lastInjectedSelector = ''; }
    lastInjectedCss = cssToInject;
    injectCss(cssToInject);
    // Inline fallback based on prompt keywords to guarantee visible change if CSS is overridden
    try {
      const inlineMap = synthesizeDeclsMapFromPrompt(userPrompt);
      if (selectedElement && inlineMap && Object.keys(inlineMap).length > 0) {
        for (const [prop, val] of Object.entries(inlineMap)) {
          selectedElement.style.setProperty(prop, String(val), 'important');
        }
        lastInlineFallback = inlineMap;
      } else {
        lastInlineFallback = null;
      }
    } catch (_) { lastInlineFallback = null; }
    // capture computed styles snapshot for selected element
    try {
      if (selectedElement) {
        const cs = getComputedStyle(selectedElement);
        lastComputedStyles = {
          color: cs.color,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          backgroundColor: cs.backgroundColor
        };
      }
    } catch (_) {
      lastComputedStyles = null;
    }
    lastMorphError = null;
    renderDebug();
  }

  function ensureImportantOnDecls(text) {
    // Turn lines like "color: red; font-size: 20px" into with !important
    const parts = String(text).split(/;\s*/).map(s => s.trim()).filter(Boolean);
    const withBang = parts.map(p => {
      const m = p.match(/^([a-zA-Z\-]+)\s*:\s*(.+)$/);
      if (!m) return p;
      const prop = m[1];
      let val = m[2];
      if (!/!important\b/.test(val)) val = `${val} !important`;
      return `${prop}: ${val}`;
    });
    return withBang.join('; ') + ';';
  }

  function synthesizeDeclsFromPrompt(prompt) {
    const p = String(prompt || '').toLowerCase();
    const decls = [];
    // colors
    const colorMap = ['red','purple','blue','green','black','white','gray','grey','orange','yellow','pink','teal','cyan'];
    const hexMatch = p.match(/#([0-9a-f]{3,8})/i);
    const rgbMatch = p.match(/rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/i);
    const rgbaMatch = p.match(/rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0?\.\d+|1(?:\.0)?)\s*\)/i);
    let foundColor = colorMap.find(c => p.includes(` ${c}`)) || (hexMatch ? hexMatch[0] : (rgbaMatch ? rgbaMatch[0] : (rgbMatch ? rgbMatch[0] : '')));
    if (p.includes('text') || p.includes('font') || p.includes('color')) {
      if (foundColor) decls.push(`color: ${foundColor}`);
    }
    if (p.includes('background')) {
      if (foundColor) decls.push(`background-color: ${foundColor}`);
    }
    // font size
    const sizeMatch = p.match(/(\d+\s*(px|rem|em|%)|\bsmall\b|\bmedium\b|\blarge\b|\blarger\b|\bsmaller\b)/);
    if (sizeMatch && (p.includes('font') || p.includes('text') || p.includes('size'))) {
      let val = sizeMatch[1] || sizeMatch[0];
      // map words to px
      const map = { small: '12px', medium: '16px', large: '20px', larger: '22px', smaller: '14px' };
      if (map[val]) val = map[val];
      decls.push(`font-size: ${val}`);
    }
    // width / max-width
    const widthMatch = p.match(/(max-?width|width)\s*(to|=|:)?\s*(\d+\s*(px|%|rem|em))/);
    if (widthMatch) {
      decls.push(`${widthMatch[1].replace(/\s+/g,'-')}: ${widthMatch[3]}`);
    }
    // weight
    if (p.includes('bold')) decls.push('font-weight: 700');
    // align
    if (p.includes('center')) decls.push('text-align: center');
    return decls.join('; ');
  }

  function synthesizeDeclsMapFromPrompt(prompt) {
    const p = String(prompt || '').toLowerCase();
    const out = {};
    const colorMap = ['red','purple','blue','green','black','white','gray','grey','orange','yellow','pink','teal','cyan'];
    const hexMatch = p.match(/#([0-9a-f]{3,8})/i);
    const rgbMatch = p.match(/rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/i);
    const rgbaMatch = p.match(/rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0?\.\d+|1(?:\.0)?)\s*\)/i);
    let foundColor = colorMap.find(c => p.includes(` ${c}`)) || (hexMatch ? hexMatch[0] : (rgbaMatch ? rgbaMatch[0] : (rgbMatch ? rgbMatch[0] : '')));
    if (p.includes('background')) {
      if (foundColor) out['background-color'] = foundColor;
    }
    if (p.includes('text') || p.includes('font') || p.includes('color')) {
      if (foundColor) out['color'] = foundColor;
    }
    const sizeMatch = p.match(/(\d+\s*(px|rem|em|%)|\bsmall\b|\bmedium\b|\blarge\b|\blarger\b|\bsmaller\b)/);
    if (sizeMatch && (p.includes('font') || p.includes('text') || p.includes('size'))) {
      let val = sizeMatch[1] || sizeMatch[0];
      const map = { small: '12px', medium: '16px', large: '20px', larger: '22px', smaller: '14px' };
      if (map[val]) val = map[val];
      out['font-size'] = val;
    }
    const widthMatch = p.match(/(max-?width|width)\s*(to|=|:)?\s*(\d+\s*(px|%|rem|em))/);
    if (widthMatch) {
      out[widthMatch[1].replace(/\s+/g,'-')] = widthMatch[3];
    }
    if (p.includes('bold')) out['font-weight'] = '700';
    if (p.includes('center')) out['text-align'] = 'center';
    return out;
  }

  function toggleAndRenderDebug() {
    if (!debugPanel) return;
    if (debugPanel.style.display === 'none') {
      renderDebug();
      debugPanel.style.display = 'block';
    } else {
      debugPanel.style.display = 'none';
    }
  }

  function renderDebug() {
    if (!debugPanel) return;
    const parts = [];
    if (lastMorphRequest) {
      parts.push('Request ->');
      parts.push(JSON.stringify(lastMorphRequest, null, 2));
    }
    if (lastUsedPath) {
      parts.push(`\nPath used: ${lastUsedPath}`);
    }
    if (lastMorphResponse) {
      parts.push('\nResponse <-');
      parts.push(typeof lastMorphResponse === 'string' ? lastMorphResponse : JSON.stringify(lastMorphResponse, null, 2));
    }
    if (lastInjectedCss) {
      parts.push('\nInjected CSS:');
      parts.push((lastInjectedCss || '').slice(0, 600));
      if (lastInjectedSelector) parts.push(`Selector used: ${lastInjectedSelector}`);
    }
    if (lastComputedStyles) {
      parts.push('\nComputed (selected element):');
      parts.push(JSON.stringify(lastComputedStyles));
    }
    if (lastMorphError) {
      parts.push('\nError !!');
      parts.push(String(lastMorphError));
    }
    if (lastInlineFallback) {
      parts.push('\nInline fallback applied:');
      parts.push(JSON.stringify(lastInlineFallback));
    }
    if (parts.length === 0) {
      parts.push('No Morph call yet. Apply a style to see details here.');
    }
    debugPanel.textContent = parts.join('\n');
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

  // Minimal CSS context to stay within model token limits
  async function gatherCssMinimal() {
    // Collect only a subset: root variables, top-level text colors, links, buttons, inputs,
    // and the first N rules from external CSS to give style context without exceeding limits.
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map(s => s.textContent || '')
      .join('\n');

    // Extract likely-global rules via heuristic match
    const likelyGlobals = inlineStyles.split(/}\s*/)
      .filter(Boolean)
      .filter(rule => /:root|body|html|a\b|button\b|\.btn\b|input\b|select\b|textarea\b|h1\b|h2\b|h3\b|code\b|pre\b/.test(rule))
      .slice(0, 200)
      .join('}\n');

    // Sample style attribute rules but keep very small
    const styleAttributes = Array.from(document.querySelectorAll('[style]'))
      .slice(0, 150)
      .map(el => {
        const selector = el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(' ').join('.')}` : el.tagName.toLowerCase();
        return `${selector} { ${el.getAttribute('style') || ''} }`;
      })
      .join('\n');

    // Fetch at most the first external stylesheet and take first ~300 lines
    const firstHref = (document.querySelector('link[rel="stylesheet"]') || {}).href;
    let externalSample = '';
    if (firstHref) {
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'fetch-css-resources', urls: [firstHref] });
        if (resp && resp.success) {
          externalSample = String(resp.css || '').split('\n').slice(0, 300).join('\n');
        }
      } catch (_) {
        // ignore
      }
    }

    const header = '/* Minimal CSS context for Morph Apply. Prefer additive overrides, avoid breaking layout. */\n';
    return [header, likelyGlobals, styleAttributes, externalSample].filter(Boolean).join('\n\n');
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

  // Build a compact DOM context pack
  function gatherDomMinimal() {
    const meta = {
      url: location.href,
      title: document.title,
      viewport: { w: innerWidth, h: innerHeight },
      frameworkHints: Boolean(document.querySelector('#__next, [data-reactroot], #app, [data-v-app]')),
      landmarks: Array.from(document.querySelectorAll('header,nav,main,aside,footer'))
        .slice(0, 10)
        .map(el => ({ tag: el.tagName.toLowerCase(), id: el.id, class: el.className }))
    };

    // Candidate elements via simple heuristics
    const candidates = Array.from(document.querySelectorAll('button,a,[role="button"],.btn,input,select,textarea,[aria-modal="true"]'))
      .slice(0, 50)
      .map(el => serializeCandidate(el));

    return JSON.stringify({ meta, candidates }).slice(0, 12 * 1024);
  }

  function serializeCandidate(el) {
    const info = {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      class: el.className || undefined,
      role: el.getAttribute('role') || undefined,
      text: (el.innerText || '').slice(0, 140),
      attrs: {}
    };
    for (const a of el.attributes) {
      if (/^(id|class|role|style|href|src|data-[-\w]+|aria-[-\w]+)$/i.test(a.name)) {
        info.attrs[a.name] = a.value.slice(0, 200);
      }
    }
    // capture small outerHTML excerpt
    info.html = (el.outerHTML || '').split('\n').slice(0, 30).join('\n');
    // build a simple selector path
    info.selector = buildCssPath(el).slice(0, 300);
    return info;
  }

  function buildCssPath(el) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      const name = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${node.id}`);
        break;
      }
      const className = (node.className || '').trim().split(/\s+/).filter(Boolean)[0];
      if (className) {
        parts.unshift(`${name}.${className}`);
      } else {
        parts.unshift(name);
      }
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  // Load JS as an ES module via blob and call exported apply()
  async function loadAndApplyJsModule(code) {
    const processed = prepareCodeForModule(code);
    const blob = new Blob([processed], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      const mod = await import(url);
      if (typeof mod.apply === 'function') {
        await mod.apply();
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Inject simple HTML snippet into main container
  function injectHtmlSnippet(html) {
    html = unwrapCodeFences(html);
    const container = document.querySelector('main, #main, .main, #content, .content, article, section, body') || document.body;
    // if banner exists, update it
    if (html.includes('morph-cta') && container.querySelector('#morph-cta')) {
      container.querySelector('#morph-cta').outerHTML = html;
      hookCtaClose();
      return;
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const node = tmp.firstElementChild;
    if (node) {
      // Prefer inserting after the first heading if present
      const firstHeading = container.querySelector('h1,h2,h3');
      if (firstHeading && firstHeading.parentNode === container) {
        firstHeading.insertAdjacentElement('afterend', node);
      } else {
        container.insertBefore(node, container.firstChild);
      }
      hookCtaClose();
    }
  }

  function hookCtaClose() {
    const btn = document.getElementById('morph-cta-close');
    if (btn) {
      btn.addEventListener('click', () => {
        const el = document.getElementById('morph-cta');
        if (el) el.remove();
      }, { once: true });
    }
  }

  // Helpers to tolerate fenced LLM outputs without altering code semantics
  function unwrapCodeFences(text) {
    if (!text || typeof text !== 'string') return '';
    const match = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    if (match && match[1]) return match[1].trim();
    return text.trim();
  }

  function prepareCodeForModule(code) {
    let src = unwrapCodeFences(code);
    // If there is a plain function apply() but no export, add a named export
    if (!/export\s+function\s+apply\s*\(/.test(src) && /function\s+apply\s*\(/.test(src)) {
      src += "\nexport { apply };\n";
    }
    return src;
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
