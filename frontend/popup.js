      // New refresh page handler
      if (document.getElementById('refreshBtn')) {
        document.getElementById('refreshBtn').addEventListener('click', async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            chrome.tabs.reload(tab.id);
            updateStatus('Page refreshed', 'success');
            window.close(); // Close popup after refresh
          }
        });
      }// Popup script for DOM API Updater Chrome Extension

document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const updateDomBtn = document.getElementById('updateDomBtn');
  const previewBtn = document.getElementById('previewBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const helpBtn = document.getElementById('helpBtn');
  const apiUrlInput = document.getElementById('apiUrl');
  const apiMethodSelect = document.getElementById('apiMethod');
  const statusDiv = document.getElementById('status');
  const progressDiv = document.getElementById('progress');
  const resultsDiv = document.getElementById('results');
  const resultsContent = document.getElementById('resultsContent');

  // New elements for morph functionality
  const morphBtn = document.getElementById('morphBtn');
  const modelSelect = document.getElementById('modelSelect');
  const personaIdInput = document.getElementById('personaId');
  const applyCssBtn = document.getElementById('applyCssBtn');
  const applyJsBtn = document.getElementById('applyJsBtn');
  const applyHtmlBtn = document.getElementById('applyHtmlBtn');
  const cssTextarea = document.getElementById('cssContent');
  const jsTextarea = document.getElementById('jsContent');
  const htmlTextarea = document.getElementById('htmlContent');
  const clearInjectedBtn = document.getElementById('clearInjectedBtn');

  // Initialize popup
  init();

  function init() {
    loadSettings();
    setupEventListeners();
  }

  function setupEventListeners() {
    updateDomBtn.addEventListener('click', handleUpdateDOM);
    previewBtn.addEventListener('click', handlePreviewDOM);
    settingsBtn.addEventListener('click', handleSettings);
    helpBtn.addEventListener('click', handleHelp);

    // New morph functionality event listeners
    if (morphBtn) morphBtn.addEventListener('click', handleMorphTransform);
    if (applyCssBtn) applyCssBtn.addEventListener('click', handleApplyCSS);
    if (applyJsBtn) applyJsBtn.addEventListener('click', handleApplyJS);
    if (applyHtmlBtn) applyHtmlBtn.addEventListener('click', handleApplyHTML);
    if (clearInjectedBtn) clearInjectedBtn.addEventListener('click', handleClearInjected);

    // Save API settings on change
    apiUrlInput.addEventListener('input', saveApiSettings);
    apiMethodSelect.addEventListener('change', saveApiSettings);

    // Save morph settings on change
    if (modelSelect) modelSelect.addEventListener('change', saveMorphSettings);
    if (personaIdInput) personaIdInput.addEventListener('input', saveMorphSettings);
  }

  // Enhanced handleUpdateDOM to work with morph endpoint
  async function handleUpdateDOM() {
    const apiUrl = apiUrlInput.value.trim();
    const apiMethod = apiMethodSelect.value;

    if (!apiUrl) {
      updateStatus('Please enter an API endpoint', 'error');
      return;
    }

    setLoading(true);
    updateStatus('Sending DOM to API...', 'loading');
    showProgress(true);

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if tab URL is valid for content script injection
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
        throw new Error('Cannot modify Chrome internal pages. Please try on a regular website.');
      }

      // Try to inject content script if not already present
      await ensureContentScriptInjected(tab.id);

      // Send message to content script to update DOM
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'update-dom-via-api',
        apiUrl: apiUrl,
        apiMethod: apiMethod,
        model: modelSelect ? modelSelect.value : 'morph-v3-fast',
        persona_id: personaIdInput ? personaIdInput.value : '1'
      });

      if (response.success) {
        displayResults('DOM Update Success', {
          status: 'DOM updated successfully',
          apiUrl: apiUrl,
          method: apiMethod,
          responseSize: response.responseSize || 'Unknown',
          originalSize: response.originalSize || 'Unknown',
          metadata: response.metadata || {},
          timestamp: new Date().toLocaleString()
        });
        updateStatus('DOM updated successfully!', 'success');
      } else {
        throw new Error(response.error || 'Unknown error occurred');
      }

    } catch (error) {
      console.error('DOM update failed:', error);
      handleError(error, 'DOM Update');
    } finally {
      setLoading(false);
      showProgress(false);
    }
  }

  // New handler for morph transformations
  async function handleMorphTransform() {
    const apiUrl = apiUrlInput.value.trim();
    const model = modelSelect ? modelSelect.value : 'morph-v3-fast';
    const personaId = personaIdInput ? personaIdInput.value : '1';

    if (!apiUrl) {
      updateStatus('Please enter an API endpoint', 'error');
      return;
    }

    setLoading(true);
    updateStatus('Transforming page via Morph API...', 'loading');
    showProgress(true);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
        throw new Error('Cannot modify Chrome internal pages. Please try on a regular website.');
      }

      await ensureContentScriptInjected(tab.id);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'morph-transform',
        apiUrl: apiUrl,
        model: model,
        persona_id: personaId
      });

      if (response.success) {
        displayResults('Morph Transform Success', {
          status: 'Page transformed successfully',
          apiUrl: apiUrl,
          model: model,
          personaId: personaId,
          responseSize: response.responseSize || 'Unknown',
          originalSize: response.originalSize || 'Unknown',
          transformationType: response.transformationType || 'morph',
          timestamp: new Date().toLocaleString()
        });
        updateStatus('Page transformed successfully!', 'success');
      } else {
        throw new Error(response.error || 'Morph transformation failed');
      }

    } catch (error) {
      console.error('Morph transform failed:', error);
      handleError(error, 'Morph Transform');
    } finally {
      setLoading(false);
      showProgress(false);
    }
  }

  // Direct CSS application handler
  async function handleApplyCSS() {
    const css = cssTextarea ? cssTextarea.value.trim() : '';

    if (!css) {
      updateStatus('Please enter CSS content', 'error');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await ensureContentScriptInjected(tab.id);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'apply-css',
        css: css
      });

      if (response.success) {
        updateStatus('CSS applied successfully!', 'success');
        if (cssTextarea) cssTextarea.value = ''; // Clear after successful application
      } else {
        throw new Error(response.error || 'CSS application failed');
      }

    } catch (error) {
      console.error('CSS application failed:', error);
      handleError(error, 'CSS Application');
    }
  }

  // Direct JavaScript application handler
  async function handleApplyJS() {
    const js = jsTextarea ? jsTextarea.value.trim() : '';

    if (!js) {
      updateStatus('Please enter JavaScript content', 'error');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await ensureContentScriptInjected(tab.id);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'apply-js',
        js: js
      });

      if (response.success) {
        updateStatus('JavaScript executed successfully!', 'success');
        if (jsTextarea) jsTextarea.value = ''; // Clear after successful application
      } else {
        throw new Error(response.error || 'JavaScript execution failed');
      }

    } catch (error) {
      console.error('JavaScript execution failed:', error);
      handleError(error, 'JavaScript Execution');
    }
  }

  // Direct HTML application handler
  async function handleApplyHTML() {
    const html = htmlTextarea ? htmlTextarea.value.trim() : '';

    if (!html) {
      updateStatus('Please enter HTML content', 'error');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await ensureContentScriptInjected(tab.id);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'apply-html',
        html: html
      });

      if (response.success) {
        updateStatus('HTML applied successfully!', 'success');
        if (htmlTextarea) htmlTextarea.value = ''; // Clear after successful application
      } else {
        throw new Error(response.error || 'HTML application failed');
      }

    } catch (error) {
      console.error('HTML application failed:', error);
      handleError(error, 'HTML Application');
    }
  }

  // Clear injected content handler
  async function handleClearInjected() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await ensureContentScriptInjected(tab.id);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'clear-injected'
      });

      if (response.success) {
        updateStatus('Injected content cleared successfully!', 'success');
      } else {
        throw new Error(response.error || 'Clear operation failed');
      }

    } catch (error) {
      console.error('Clear injected failed:', error);
      handleError(error, 'Clear Injected Content');
    }
  }

  // Ensure content script is injected
  async function ensureContentScriptInjected(tabId) {
    try {
      // Test if content script is already present
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    } catch (error) {
      // Content script not present, inject it
      console.log('Injecting content script...');
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });

      // Wait a moment for script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async function handlePreviewDOM() {
    setLoading(true);
    updateStatus('Getting DOM preview...', 'loading');

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if tab URL is valid for content script injection
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
        throw new Error('Cannot analyze Chrome internal pages. Please try on a regular website.');
      }

      await ensureContentScriptInjected(tab.id);

      // Send message to content script to get DOM info
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'get-dom-info'
      });

      if (response.success) {
        displayResults('DOM Preview', response.data);
        updateStatus('DOM preview ready', 'success');
      } else {
        throw new Error(response.error || 'Failed to get DOM info');
      }

    } catch (error) {
      console.error('DOM preview failed:', error);
      handleError(error, 'DOM Preview');
    } finally {
      setLoading(false);
    }
  }

  // Enhanced error handling
  function handleError(error, operation) {
    let errorMessage = error.message;

    if (error.message.includes('Could not establish connection')) {
      errorMessage = 'Content script not loaded. Extension will attempt to inject it automatically.';
    } else if (error.message.includes('Receiving end does not exist')) {
      errorMessage = 'Extension content script not responding. Please refresh the page and try again.';
    } else if (error.message.includes('Cannot access')) {
      errorMessage = 'Cannot access this page. Try on a regular website (not chrome:// pages).';
    }

    updateStatus(`${operation} failed: ${errorMessage}`, 'error');

    displayResults(`${operation} Error`, {
      error: errorMessage,
      originalError: error.message,
      operation: operation,
      timestamp: new Date().toLocaleString(),
      troubleshooting: [
        'Refresh the page and try again',
        'Ensure you\'re on a regular website (not chrome:// pages)',
        'Check that your API endpoint is accessible',
        'Verify CORS headers are properly configured on your API'
      ]
    });
  }

  function handleSettings() {
    // Open options page
    chrome.runtime.openOptionsPage();
  }

  function handleHelp() {
    displayResults('Help & Usage', {
      'Morph Transform': 'Uses your /morph endpoint to transform the entire page based on instructions',
      'Update DOM': 'Legacy method - sends DOM to API and applies response',
      'Apply CSS/JS/HTML': 'Directly applies code snippets to the current page',
      'API Endpoint': 'Enter the full URL of your morph endpoint (e.g., http://localhost:8000/morph)',
      'Model': 'Choose between morph-v3-fast and morph-v3-large',
      'Persona ID': 'Specify which persona instructions to use (default: 1)',
      'Clear Injected': 'Removes all content added by this extension',
      'API Format': 'Your /morph endpoint receives: { prompt: "DOM_HTML", persona_id: "1", model: "morph-v3-fast" }',
      'CORS': 'Ensure your API has proper CORS headers for browser requests'
    });
    updateStatus('Help information displayed', 'success');
  }

  function setLoading(isLoading) {
    const buttons = [updateDomBtn, previewBtn, morphBtn, applyCssBtn, applyJsBtn, applyHtmlBtn, clearInjectedBtn].filter(btn => btn);
    buttons.forEach(btn => {
      btn.disabled = isLoading;
      if (isLoading) {
        btn.classList.add('loading');
      } else {
        btn.classList.remove('loading');
      }
    });
  }

  function updateStatus(message, type = 'info') {
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status-message ${type}`;
    }
  }

  function showProgress(show) {
    if (progressDiv) {
      progressDiv.style.display = show ? 'block' : 'none';
    }
  }

  function displayResults(title, data) {
    if (!resultsContent || !resultsDiv) return;

    let content = `<h4>${title}</h4>`;

    if (typeof data === 'object') {
      content += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    } else {
      content += `<p>${data}</p>`;
    }

    resultsContent.innerHTML = content;
    resultsDiv.style.display = 'block';
  }

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['apiSettings', 'morphSettings']);

      // Load API settings
      const apiSettings = result.apiSettings || {
        apiUrl: 'http://localhost:8000/morph',  // Updated default to morph endpoint
        apiMethod: 'POST'
      };

      if (apiUrlInput) apiUrlInput.value = apiSettings.apiUrl;
      if (apiMethodSelect) apiMethodSelect.value = apiSettings.apiMethod;

      // Load morph settings
      const morphSettings = result.morphSettings || {
        model: 'morph-v3-fast',
        personaId: '1'
      };

      if (modelSelect) modelSelect.value = morphSettings.model;
      if (personaIdInput) personaIdInput.value = morphSettings.personaId;

    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function saveApiSettings() {
    try {
      const settings = {
        apiUrl: apiUrlInput.value.trim(),
        apiMethod: apiMethodSelect.value
      };

      await chrome.storage.sync.set({ apiSettings: settings });
    } catch (error) {
      console.error('Failed to save API settings:', error);
    }
  }

  async function saveMorphSettings() {
    try {
      const settings = {
        model: modelSelect ? modelSelect.value : 'morph-v3-fast',
        personaId: personaIdInput ? personaIdInput.value : '1'
      };

      await chrome.storage.sync.set({ morphSettings: settings });
    } catch (error) {
      console.error('Failed to save morph settings:', error);
    }
  }
});