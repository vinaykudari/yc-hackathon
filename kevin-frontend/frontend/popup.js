// Popup script for DOM API Updater Chrome Extension

document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const previewBtn = document.getElementById('previewBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const helpBtn = document.getElementById('helpBtn');
  const statusDiv = document.getElementById('status');
  const progressDiv = document.getElementById('progress');
  const resultsDiv = document.getElementById('results');
  const resultsContent = document.getElementById('resultsContent');
  const personaSelect = document.getElementById('personaSelect');
  const morphApiKeyInput = document.getElementById('morphApiKey');
  const morphModelSelect = document.getElementById('morphModel');
  const applyCssPersonaBtn = document.getElementById('applyCssPersonaBtn');
  const applyJsPersonaBtn = document.getElementById('applyJsPersonaBtn');
  const applyHtmlPersonaBtn = document.getElementById('applyHtmlPersonaBtn');
  const loadSiteInfoBtn = document.getElementById('loadSiteInfoBtn');
  const selectElementBtn = document.getElementById('selectElementBtn');
  const modifierInput = document.getElementById('modifierInput');
  const applyTextBtn = document.getElementById('applyTextBtn');
  const applyStyleBtn = document.getElementById('applyStyleBtn');

  // Initialize popup
  init();

  function init() {
    loadSettings();
    setupEventListeners();
  }

  function setupEventListeners() {
    previewBtn.addEventListener('click', handlePreviewDOM);
    if (settingsBtn) settingsBtn.addEventListener('click', handleSettings);
    if (helpBtn) helpBtn.addEventListener('click', handleHelp);
    
    // Save Morph settings on change
    morphApiKeyInput.addEventListener('input', saveMorphSettings);
    morphModelSelect.addEventListener('change', saveMorphSettings);
    personaSelect.addEventListener('change', saveMorphSettings);

    applyCssPersonaBtn.addEventListener('click', () => handleApply('css'));
    applyJsPersonaBtn.addEventListener('click', () => handleApply('js'));
    applyHtmlPersonaBtn.addEventListener('click', () => handleApply('html'));

    // On-page editor actions
    loadSiteInfoBtn.addEventListener('click', handleLoadSiteInfo);
    selectElementBtn.addEventListener('click', handleSelectElement);
    applyTextBtn.addEventListener('click', handleApplyText);
    applyStyleBtn.addEventListener('click', handleApplyStyleViaMorph);
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

  async function handleLoadSiteInfo() {
    setLoading(true);
    updateStatus('Loading site info...', 'loading');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let resp;
      try {
        resp = await chrome.tabs.sendMessage(tab.id, { action: 'load-site-info' });
      } catch (err) {
        if (String(err).includes('Receiving end does not exist')) {
          await ensureContentScriptInjected(tab.id, tab.url);
          resp = await chrome.tabs.sendMessage(tab.id, { action: 'load-site-info' });
        } else {
          throw err;
        }
      }
      if (!resp || !resp.success) throw new Error(resp?.error || 'Failed to load site info');
      displayResults('Site Info', resp.data);
      updateStatus('Site info loaded', 'success');
    } catch (e) {
      console.error(e);
      updateStatus(`Load failed: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectElement() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      // Ask page to show overlay editor first so popup can close without losing controls
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'show-editor-overlay' });
      } catch (err) {
        if (String(err).includes('Receiving end does not exist')) {
          await ensureContentScriptInjected(tab.id, tab.url);
          await chrome.tabs.sendMessage(tab.id, { action: 'show-editor-overlay' });
        }
      }
      let resp;
      try {
        resp = await chrome.tabs.sendMessage(tab.id, { action: 'enter-select-mode' });
      } catch (err) {
        if (String(err).includes('Receiving end does not exist')) {
          await ensureContentScriptInjected(tab.id, tab.url);
          resp = await chrome.tabs.sendMessage(tab.id, { action: 'enter-select-mode' });
        } else {
          throw err;
        }
      }
      if (!resp || !resp.success) throw new Error(resp?.error || 'Failed to enter select mode');
      updateStatus('Select mode: click an element on the page', 'success');
    } catch (e) {
      console.error(e);
      updateStatus(`Select mode failed: ${e.message}`, 'error');
    }
  }

  async function handlePenTool() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'show-editor-overlay' });
      await chrome.tabs.sendMessage(tab.id, { action: 'enter-pen-mode' });
      updateStatus('Pen tool activated - draw on the page', 'success');
    } catch (e) {
      updateStatus(`Pen tool failed: ${e.message}`, 'error');
    }
  }

  async function handleBoxTool() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'show-editor-overlay' });
      await chrome.tabs.sendMessage(tab.id, { action: 'enter-box-mode' });
      updateStatus('Box tool activated - create boxes on the page', 'success');
    } catch (e) {
      updateStatus(`Box tool failed: ${e.message}`, 'error');
    }
  }

  async function handleExportPDF() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'export-pdf' });
      updateStatus('PDF export initiated', 'success');
    } catch (e) {
      updateStatus(`Export failed: ${e.message}`, 'error');
    }
  }

  async function handleApplyText() {
    const text = (modifierInput?.value || '').trim();
    if (!text) { updateStatus('Enter text to apply', 'error'); return; }
    setLoading(true);
    updateStatus('Applying text to selected element...', 'loading');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let resp;
      try {
        resp = await chrome.tabs.sendMessage(tab.id, { action: 'apply-text-to-selected', text });
      } catch (err) {
        if (String(err).includes('Receiving end does not exist')) {
          await ensureContentScriptInjected(tab.id, tab.url);
          resp = await chrome.tabs.sendMessage(tab.id, { action: 'apply-text-to-selected', text });
        } else {
          throw err;
        }
      }
      if (!resp || !resp.success) throw new Error(resp?.error || 'No element selected');
      updateStatus('Text applied', 'success');
    } catch (e) {
      console.error(e);
      updateStatus(`Apply text failed: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyStyleViaMorph() {
    const prompt = (modifierInput?.value || '').trim();
    if (!prompt) { updateStatus('Enter a style change prompt', 'error'); return; }

    setLoading(true);
    updateStatus('Getting selected element context...', 'loading');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      // Ask content for selected element info
      let sel;
      try {
        sel = await chrome.tabs.sendMessage(tab.id, { action: 'get-selected-element-context' });
      } catch (err) {
        if (String(err).includes('Receiving end does not exist')) {
          await ensureContentScriptInjected(tab.id, tab.url);
          sel = await chrome.tabs.sendMessage(tab.id, { action: 'get-selected-element-context' });
        } else {
          throw err;
        }
      }
      if (!sel || !sel.success) throw new Error(sel?.error || 'No element selected');

      const elementContext = JSON.stringify(sel.data || {});

      // Build a tiny CSS patch request
      const origin = new URL(tab.url).origin;
      const storageKey = `site_css::${origin}`;
      const stored = await chrome.storage.local.get([storageKey]);
      let baseCss = String(stored[storageKey] || '/* morph site.css */\n');
      baseCss = baseCss.slice(0, 6 * 1024);

      const instruction = `I will write minimal CSS rules to satisfy the user's style request for the provided element. Use the most stable selector(s). Keep changes additive; do not remove rules.\n\nUser request: ${prompt}\n\nElement context (JSON): ${elementContext}`;

      const { morphSettings } = await chrome.storage.sync.get(['morphSettings']);
      const apiKey = morphSettings?.apiKey || '';
      const model = morphSettings?.model || 'morph-v3-fast';

      const payload = { apiKey, model, kind: 'css', instruction, original: baseCss, update: '/* add rules below */' };
      updateStatus('Calling Morph for CSS patch...', 'loading');
      const morphResp = await chrome.runtime.sendMessage({ action: 'morph-apply', payload });
      if (!morphResp || !morphResp.success) throw new Error(morphResp?.error || 'Morph failed');
      const finalCss = (morphResp.data?.final_code || morphResp.data?.content || morphResp.data || '').slice(0, 16 * 1024);
      if (!finalCss) throw new Error('Empty CSS from Morph');

      await chrome.storage.local.set({ [storageKey]: finalCss });
      let inject;
      try {
        inject = await chrome.tabs.sendMessage(tab.id, { action: 'inject-css', css: finalCss });
      } catch (err) {
        if (String(err).includes('Receiving end does not exist')) {
          await ensureContentScriptInjected(tab.id, tab.url);
          inject = await chrome.tabs.sendMessage(tab.id, { action: 'inject-css', css: finalCss });
        } else {
          throw err;
        }
      }
      if (!inject || !inject.success) throw new Error(inject?.error || 'Inject failed');

      updateStatus('Style applied via Morph', 'success');
    } catch (e) {
      console.error(e);
      updateStatus(`Style change failed: ${e.message}`, 'error');
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
      'Morph API Key': 'Enter your Morph API key or rely on the built-in key.',
      'Model': 'Choose morph-v3-fast or morph-v3-large (or auto).',
      'CSS Personas': 'Pick a persona and click Apply to inject styles generated by Morph.',
      'Preview DOM': 'Shows information about the current page DOM'
    });
    updateStatus('Help information displayed', 'success');
  }

  function setLoading(isLoading) {
    const buttons = [applyCssPersonaBtn, applyJsPersonaBtn, applyHtmlPersonaBtn, previewBtn];
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
      const result = await chrome.storage.sync.get(['morphSettings']);

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
      emptyOpt.textContent = 'Select a persona...';
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

  async function handleApply(kind) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No active tab');

      if (!personaSelect.value) {
        updateStatus('Please choose a persona first', 'error');
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
      setLoading(true);
      updateStatus(`Applying ${kind.toUpperCase()} persona with Morph...`, 'loading');
      showProgress(true);

      // Build per-origin small patch file from storage
      const origin = new URL(tab.url).origin;
      const storageKeyMap = {
        css: `site_css::${origin}`,
        js: `site_js::${origin}`,
        html: `site_html::${origin}`
      };
      const defaults = {
        css: '/* morph site.css overrides (per-origin) */\n',
        js: 'export function apply() {}\n',
        html: '<!-- morph site.html snippets (per-origin) -->\n'
      };
      const storageKey = storageKeyMap[kind];
      const stored = await chrome.storage.local.get([storageKey]);
      let originalText = String(stored[storageKey] || '').slice(0, 6 * 1024); // cap 6KB
      if (!originalText) {
        originalText = defaults[kind];
      }

      const gatherResp = await chrome.tabs.sendMessage(
        tab.id,
        { action: kind === 'css' ? 'gather-css-min' : 'gather-dom-min' }
      );
      if (!gatherResp || !gatherResp.success) {
        throw new Error(gatherResp?.error || 'Failed to gather CSS context');
      }
      const contextPackRaw = kind === 'css' ? (gatherResp.data?.css || '') : (gatherResp.data?.context || '');
      const contextPack = String(contextPackRaw).slice(0, 12 * 1024); // cap 12KB

      // Build Morph Apply request using small patch file + update snippet; include context as guidance
      const personaBlock = persona[kind] || {};
      const userInstruction = personaBlock.instruction || `I will apply ${kind.toUpperCase()} updates.`;
      const updateSnippet = (personaBlock.update || '').slice(0, 2 * 1024); // cap 2KB
      const instruction = `${userInstruction}\n\n<context>\n${contextPack}\n</context>`;
      const originalCode = originalText;

      const morphPayload = {
        apiKey,
        model,
        kind,
        instruction,
        original: originalCode,
        update: updateSnippet
      };

      // Delegate Morph call to background
      const morphResp = await chrome.runtime.sendMessage({ action: 'morph-apply', payload: morphPayload });
      if (!morphResp || !morphResp.success) {
        throw new Error(morphResp?.error || 'Morph Apply failed');
      }

      const finalText = (morphResp.data?.final_code || morphResp.data?.content || morphResp.data?.final || morphResp.data || '');
      if (kind === 'css') {
        await chrome.storage.local.set({ [storageKey]: finalText });
        const injectResp = await chrome.tabs.sendMessage(tab.id, { action: 'inject-css', css: finalText });
        if (!injectResp || !injectResp.success) throw new Error(injectResp?.error || 'Failed to inject CSS');
      } else if (kind === 'js') {
        await chrome.storage.local.set({ [storageKey]: finalText });
        const injectResp = await chrome.tabs.sendMessage(tab.id, { action: 'inject-js', code: finalText });
        if (!injectResp || !injectResp.success) throw new Error(injectResp?.error || 'Failed to inject JS');
      } else if (kind === 'html') {
        await chrome.storage.local.set({ [storageKey]: finalText });
        const injectResp = await chrome.tabs.sendMessage(tab.id, { action: 'inject-html', html: finalText });
        if (!injectResp || !injectResp.success) throw new Error(injectResp?.error || 'Failed to inject HTML');
      }

      updateStatus(`${kind.toUpperCase()} persona applied!`, 'success');
      displayResults(`Morph Apply (${kind.toUpperCase()})`, {
        persona: persona.name,
        model,
        inputBytes: originalText.length,
        outputBytes: finalText.length,
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
