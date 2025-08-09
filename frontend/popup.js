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
      updateStatus(`Update failed: ${error.message}`, 'error');
      displayResults('Error Details', {
        error: error.message,
        apiUrl: apiUrl,
        method: apiMethod,
        timestamp: new Date().toLocaleString()
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
      const result = await chrome.storage.sync.get(['apiSettings']);
      const settings = result.apiSettings || {
        apiUrl: '/test-api',
        apiMethod: 'POST'
      };

      apiUrlInput.value = settings.apiUrl;
      apiMethodSelect.value = settings.apiMethod;
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
});
