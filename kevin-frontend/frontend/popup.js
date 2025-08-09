// Popup script for DOM API Updater Chrome Extension

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
  const personaSelect = document.getElementById('personaSelect');
  const morphApiKeyInput = document.getElementById('morphApiKey');
  const morphModelSelect = document.getElementById('morphModel');
  const applyCssPersonaBtn = document.getElementById('applyCssPersonaBtn');

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
    
    // Save API settings on change
    apiUrlInput.addEventListener('input', saveApiSettings);
    apiMethodSelect.addEventListener('change', saveApiSettings);

    // Save Morph settings on change
    morphApiKeyInput.addEventListener('input', saveMorphSettings);
    morphModelSelect.addEventListener('change', saveMorphSettings);
    personaSelect.addEventListener('change', saveMorphSettings);

    applyCssPersonaBtn.addEventListener('click', handleApplyCssPersona);
  }

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
      
      // Send message to content script to update DOM
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'update-dom-via-api',
        apiUrl: apiUrl,
        apiMethod: apiMethod
      });

      if (response.success) {
        displayResults('DOM Update Success', {
          status: 'DOM updated successfully',
          apiUrl: apiUrl,
          method: apiMethod,
          responseSize: response.responseSize || 'Unknown',
          timestamp: new Date().toLocaleString()
        });
        updateStatus('DOM updated successfully!', 'success');
      } else {
        throw new Error(response.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error('DOM update failed:', error);
      
      // Provide specific error messages for common issues
      let errorMessage = error.message;
      if (error.message.includes('Could not establish connection')) {
        errorMessage = 'Content script not loaded. Try refreshing the page and ensure you\'re on a regular website (not chrome:// pages).';
      } else if (error.message.includes('Receiving end does not exist')) {
        errorMessage = 'Extension content script not responding. Please refresh the page and try again.';
      }
      
      updateStatus(`Update failed: ${errorMessage}`, 'error');
      displayResults('Error Details', {
        error: errorMessage,
        originalError: error.message,
        apiUrl: apiUrl,
        method: apiMethod,
        timestamp: new Date().toLocaleString(),
        troubleshooting: 'Try: 1) Refresh the page, 2) Ensure you\'re on a regular website, 3) Check that API URL includes /test-api endpoint'
      });
    } finally {
      setLoading(false);
      showProgress(false);
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
      
      // Send message to content script to get DOM info
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'get-dom-info' });
      } catch (err) {
        if (String(err).includes('Receiving end does not exist')) {
          // Try to inject content script dynamically and retry once
          await ensureContentScriptInjected(tab.id, tab.url);
          response = await chrome.tabs.sendMessage(tab.id, { action: 'get-dom-info' });
        } else {
          throw err;
        }
      }

      if (response.success) {
        displayResults('DOM Preview', response.data);
        updateStatus('DOM preview ready', 'success');
      } else {
        throw new Error(response.error || 'Failed to get DOM info');
      }
      
    } catch (error) {
      console.error('DOM preview failed:', error);
      updateStatus(`Preview failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleSettings() {
    // Open options page
    chrome.runtime.openOptionsPage();
  }

  function handleHelp() {
    displayResults('Help & Usage', {
      'API Endpoint': 'Enter the full URL of your API endpoint (e.g., https://api.example.com/test-api)',
      'Method': 'Choose POST or PUT method for sending DOM data',
      'Update DOM': 'Sends the current page DOM to your API and replaces it with the response',
      'Preview DOM': 'Shows information about the current page DOM',
      'API Format': 'Your API should accept HTML content and return HTML content',
      'CORS': 'Make sure your API has proper CORS headers for browser requests'
    });
    updateStatus('Help information displayed', 'success');
  }

  function setLoading(isLoading) {
    const buttons = [updateDomBtn, previewBtn];
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
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
  }

  function showProgress(show) {
    progressDiv.style.display = show ? 'block' : 'none';
  }

  function displayResults(title, data) {
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
      const settings = result.apiSettings || {
        apiUrl: 'http://localhost:8000/test-api',
        apiMethod: 'POST'
      };

      apiUrlInput.value = settings.apiUrl;
      apiMethodSelect.value = settings.apiMethod;

      // Load Morph settings
      const morphSettings = result.morphSettings || {
        apiKey: '',
        model: 'morph-v3-fast',
        personaId: ''
      };
      morphApiKeyInput.value = morphSettings.apiKey || '';
      morphModelSelect.value = morphSettings.model || 'morph-v3-fast';

      // Load personas from local file
      await populatePersonas(morphSettings.personaId);
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
      console.error('Failed to save settings:', error);
    }
  }

  async function saveMorphSettings() {
    try {
      const morphSettings = {
        apiKey: morphApiKeyInput.value.trim(),
        model: morphModelSelect.value,
        personaId: personaSelect.value
      };
      await chrome.storage.sync.set({ morphSettings });
    } catch (error) {
      console.error('Failed to save Morph settings:', error);
    }
  }

  async function populatePersonas(selectedId) {
    try {
      // personas.json is listed under web_accessible_resources in the manifest
      const url = chrome.runtime.getURL('personas.json');
      const res = await fetch(url);
      const data = await res.json();
      const personas = (data && Array.isArray(data.personas)) ? data.personas : [];

      personaSelect.innerHTML = '';
      // Empty default option
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = 'Select a CSS persona...';
      personaSelect.appendChild(emptyOpt);

      for (const p of personas) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} — ${p.description}`;
        personaSelect.appendChild(opt);
      }
      if (selectedId) {
        personaSelect.value = selectedId;
      }
      // keep a cached copy for popup usage
      window.__morphPersonas = personas;
    } catch (e) {
      console.error('Failed to load personas.json', e);
    }
  }

  async function handleApplyCssPersona() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No active tab');

      if (!personaSelect.value) {
        updateStatus('Please choose a CSS persona first', 'error');
        return;
      }
      const persona = (window.__morphPersonas || []).find(p => p.id === personaSelect.value);
      if (!persona) {
        updateStatus('Selected persona not found', 'error');
        return;
      }

      // get Morph settings
      const { morphSettings } = await chrome.storage.sync.get(['morphSettings']);
      const apiKey = morphSettings?.apiKey || '';
      const model = morphSettings?.model || 'morph-v3-fast';
      if (!apiKey) {
        updateStatus('Enter Morph API key in settings', 'error');
        return;
      }

      setLoading(true);
      updateStatus('Applying CSS persona with Morph...', 'loading');
      showProgress(true);

      // Ask content script to gather current page CSS
      const gatherResp = await chrome.tabs.sendMessage(tab.id, { action: 'gather-css' });
      if (!gatherResp || !gatherResp.success) {
        throw new Error(gatherResp?.error || 'Failed to gather CSS');
      }

      // Build Morph Apply request
      const instruction = persona.apply.instruction || 'I will apply CSS updates.';
      const updateSnippet = persona.apply.update || '/* no-op */';
      const originalCss = gatherResp.data?.css || '';

      const morphPayload = {
        apiKey,
        model,
        kind: 'css',
        instruction,
        original: originalCss,
        update: updateSnippet
      };

      // Delegate Morph call to background
      const morphResp = await chrome.runtime.sendMessage({ action: 'morph-apply', payload: morphPayload });
      if (!morphResp || !morphResp.success) {
        throw new Error(morphResp?.error || 'Morph Apply failed');
      }

      const finalCss = morphResp.data?.final_code || morphResp.data?.content || morphResp.data?.final || morphResp.data || '';
      if (!finalCss) {
        throw new Error('No CSS returned from Morph');
      }

      // Replace/inject new CSS
      const injectResp = await chrome.tabs.sendMessage(tab.id, { action: 'inject-css', css: finalCss });
      if (!injectResp || !injectResp.success) {
        throw new Error(injectResp?.error || 'Failed to inject CSS');
      }

      updateStatus('CSS persona applied!', 'success');
      displayResults('Morph Apply (CSS)', {
        persona: persona.name,
        model,
        inputBytes: originalCss.length,
        outputBytes: finalCss.length,
        timestamp: new Date().toLocaleString()
      });
    } catch (err) {
      console.error(err);
      updateStatus(`Morph apply failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      showProgress(false);
    }
  }

  // Ensure content script is present; if not, inject it programmatically and wait for readiness
  async function ensureContentScriptInjected(tabId, tabUrl) {
    // Avoid injection on restricted schemes
    if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://') || tabUrl.startsWith('moz-extension://')) {
      throw new Error('Cannot inject content script on restricted pages. Please try on a regular website.');
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      // Give the content script a brief moment to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (injectErr) {
      console.error('Failed to inject content script:', injectErr);
      throw new Error('Content script not available and could not be injected. Try refreshing the page.');
    }
  }
});
