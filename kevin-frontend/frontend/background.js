// Background script for DOM API Updater Chrome Extension

// Extension installation and startup
chrome.runtime.onInstalled.addListener((details) => {
  console.log('DOM API Updater Extension installed:', details.reason);
  
  // Set up default settings
  chrome.storage.sync.set({
    apiSettings: {
      apiUrl: '/test-api',
      apiMethod: 'POST'
    },
    extensionSettings: {
      notifications: true,
      autoBackup: false,
      theme: 'light'
    }
  });

  // Create context menu items (with error handling)
  try {
    if (chrome.contextMenus) {
      chrome.contextMenus.create({
        id: 'update-dom-api',
        title: 'Update DOM via API',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'preview-dom',
        title: 'Preview current DOM',
        contexts: ['page']
      });
    }
  } catch (error) {
    console.log('Context menus not available:', error);
  }
});

// Handle context menu clicks (with error handling)
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
      switch (info.menuItemId) {
        case 'update-dom-api':
          await handleUpdateDOMFromContext(tab);
          break;
        case 'preview-dom':
          await handlePreviewDOMFromContext(tab);
          break;
      }
    } catch (error) {
      console.error('Context menu click handler error:', error);
    }
  });
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  switch (request.action) {
    case 'content-script-ready':
      console.log('Content script ready on:', request.url);
      sendResponse({ success: true });
      break;

    case 'update-dom-background':
      handleDOMUpdateRequest(request, sender.tab)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response

    case 'get-api-settings':
      getApiSettings()
        .then(settings => sendResponse({ success: true, settings }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'save-api-settings':
      saveApiSettings(request.settings)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'log-api-request':
      logApiRequest(request.data);
      sendResponse({ success: true });
      break;

    case 'perform-api-call':
      performApiCall(request.payload)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'fetch-css-resources':
      fetchCssResources(request.urls)
        .then(result => sendResponse({ success: true, css: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'morph-apply':
      morphApply(request.payload)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Handle DOM update from context menu
async function handleUpdateDOMFromContext(tab) {
  try {
    const settings = await getApiSettings();
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'update-dom-via-api',
      apiUrl: settings.apiUrl,
      apiMethod: settings.apiMethod
    });

    if (response.success) {
      // Show notification if enabled
      const extensionSettings = await getExtensionSettings();
      if (extensionSettings.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'DOM Updated',
          message: `DOM successfully updated via ${settings.apiUrl}`
        });
      }
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Context menu DOM update failed:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'DOM Update Failed',
      message: error.message
    });
  }
}

// Handle DOM preview from context menu
async function handlePreviewDOMFromContext(tab) {
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'get-dom-info'
    });

    if (response.success) {
      console.log('DOM Info:', response.data);
      // Could open a new tab with DOM info or show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'DOM Preview',
        message: `Page has ${response.data.elementCounts.total} elements`
      });
    }
  } catch (error) {
    console.error('Context menu DOM preview failed:', error);
  }
}

// Handle DOM update request from popup or content script
async function handleDOMUpdateRequest(request, tab) {
  const { apiUrl, apiMethod, domContent } = request;
  
  try {
    // Log the API request
    await logApiRequest({
      url: apiUrl,
      method: apiMethod,
      timestamp: new Date().toISOString(),
      tabUrl: tab.url,
      contentLength: domContent ? domContent.length : 0
    });

    return { success: true };
  } catch (error) {
    console.error('DOM update request handling failed:', error);
    throw error;
  }
}

// Get API settings
async function getApiSettings() {
  const result = await chrome.storage.sync.get(['apiSettings']);
  return result.apiSettings || {
    apiUrl: '/test-api',
    apiMethod: 'POST'
  };
}

// Save API settings
async function saveApiSettings(settings) {
  await chrome.storage.sync.set({ apiSettings: settings });
}

// Get extension settings
async function getExtensionSettings() {
  const result = await chrome.storage.sync.get(['extensionSettings']);
  return result.extensionSettings || {
    notifications: true,
    autoBackup: false,
    theme: 'light'
  };
}

// Log API request for debugging and analytics
async function logApiRequest(data) {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...data
  };

  // Store in local storage (will be cleaned up periodically)
  await chrome.storage.local.set({ [logEntry.id]: logEntry });
}

// Perform the network call from background to avoid page security/mixed-content issues
async function performApiCall(payload) {
  const { url, method, headers, body } = payload;
  const requestInit = {
    method: method || 'POST',
    headers: headers || { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };

  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(url, requestInit);
  } catch (err) {
    console.error('performApiCall network error:', err);
    throw err;
  }

  const status = response.status;
  const statusText = response.statusText;
  const responseHeaders = Object.fromEntries(response.headers.entries());
  let responseText = '';
  try {
    responseText = await response.text();
  } catch (e) {
    // ignore
  }

  const durationMs = Date.now() - startedAt;
  console.log('performApiCall result:', { url, status, statusText, durationMs, responseHeaders, preview: responseText.slice(0, 500) });

  let json;
  try {
    json = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    json = null;
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${status} ${statusText}`);
  }

  return { status, statusText, headers: responseHeaders, body: json ?? responseText };
}

// Fetch multiple CSS URLs cross-origin (used when site CSS is in external stylesheets)
async function fetchCssResources(urls) {
  if (!Array.isArray(urls)) return '';
  const results = await Promise.all(urls.map(async (u) => {
    try {
      const r = await fetch(u, { method: 'GET' });
      return r.ok ? await r.text() : '';
    } catch (_) {
      return '';
    }
  }));
  return results.filter(Boolean).join('\n\n/* ---- Next CSS file ---- */\n\n');
}

// Call Morph Apply API directly from the extension
async function morphApply(payload) {
  const { apiKey, model, instruction, original, update } = payload || {};
  if (!apiKey) throw new Error('Missing Morph API key');
  const applyModel = model || 'morph-v3-fast';

  const reqBody = {
    model: applyModel,
    messages: [
      {
        role: 'user',
        content: `<instruction>${instruction || ''}</instruction>\n<code>${original || ''}</code>\n<update>${update || ''}</update>`
      }
    ]
  };

  const response = await fetch('https://api.morphllm.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(reqBody)
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Morph Apply failed: ${response.status} ${response.statusText} - ${t.slice(0, 400)}`);
  }
  const data = await response.json();
  // Expect final code to be in message content
  const content = data?.choices?.[0]?.message?.content || '';
  return { final_code: content, raw: data };
}

// Tab update listener for potential auto-processing
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    const settings = await getExtensionSettings();
    
    // Could implement auto-backup or other features here
    if (settings.autoBackup) {
      // Auto-backup DOM if enabled
      setTimeout(async () => {
        try {
          const response = await chrome.tabs.sendMessage(tabId, {
            action: 'serialize-dom'
          });
          
          if (response.success) {
            // Store backup
            const backupKey = `backup_${tabId}_${Date.now()}`;
            await chrome.storage.local.set({
              [backupKey]: {
                url: tab.url,
                title: tab.title,
                dom: response.data,
                timestamp: new Date().toISOString()
              }
            });
          }
        } catch (error) {
          console.log('Auto-backup failed (normal if content script not ready):', error.message);
        }
      }, 2000);
    }
  }
});

// Cleanup old logs and backups periodically (with error handling)
try {
  if (chrome.alarms) {
    chrome.alarms.create('cleanup', { periodInMinutes: 60 });

    chrome.alarms.onAlarm.addListener(async (alarm) => {
      try {
        if (alarm.name === 'cleanup') {
          const items = await chrome.storage.local.get();
          const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          
          const keysToRemove = Object.keys(items).filter(key => {
            if (key.startsWith('log_') || key.startsWith('backup_')) {
              const timestamp = parseInt(key.split('_')[1]);
              return timestamp < oneWeekAgo;
            }
            return false;
          });
          
          if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove);
            console.log(`Cleaned up ${keysToRemove.length} old entries`);
          }
        }
      } catch (error) {
        console.error('Cleanup alarm error:', error);
      }
    });
  }
} catch (error) {
  console.log('Alarms not available:', error);
}

// Handle extension icon click (optional - could show badge or status)
chrome.action.onClicked.addListener(async (tab) => {
  // This would only fire if no popup is defined
  // Since we have a popup, this won't be called
  console.log('Extension icon clicked on:', tab.url);
});
