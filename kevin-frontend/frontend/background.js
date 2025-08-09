// Background script for DOM API Updater Chrome Extension

// Extension installation and startup
chrome.runtime.onInstalled.addListener((details) => {
  console.log('DOM API Updater Extension installed:', details.reason);
  
  // Set up default settings
  chrome.storage.sync.set({
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

// Get extension settings
async function getExtensionSettings() {
  const result = await chrome.storage.sync.get(['extensionSettings']);
  return result.extensionSettings || {
    notifications: true,
    autoBackup: false,
    theme: 'light'
  };
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
  // Hardcoded per user request
  const HARDCODED_API_KEY = 'sk-RpSLhRtM_IjLIZdJOYZc36NlZDkxnImXwxqtY0g4UF7ZTOZ3';
  const keyToUse = (apiKey && apiKey.trim()) || HARDCODED_API_KEY;
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
      'Authorization': `Bearer ${keyToUse}`
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
