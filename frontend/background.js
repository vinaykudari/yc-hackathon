// background.js// background.js - Enhanced version with morph integration
chrome.runtime.onInstalled.addListener(() => {
  console.log('DOM API Updater extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    apiSettings: { 
      apiUrl: 'http://localhost:8080/api/v1/morph',
      apiMethod: 'POST' 
    },
    morphSettings: {
      model: 'morph-v3-fast',
      personaId: '1'
    },
    extensionSettings: { 
      notifications: true, 
      autoBackup: false, 
      theme: 'light' 
    }
  });
  
  try {
    if (chrome.contextMenus) {
      chrome.contextMenus.create({ 
        id: 'morph-transform', 
        title: 'Transform Page via Morph API', 
        contexts: ['page'] 
      });
      chrome.contextMenus.create({ 
        id: 'update-dom-api', 
        title: 'Update DOM via API (Legacy)', 
        contexts: ['page'] 
      });
      chrome.contextMenus.create({ 
        id: 'preview-dom', 
        title: 'Preview current DOM', 
        contexts: ['page'] 
      });
      chrome.contextMenus.create({
        id: 'clear-injected',
        title: 'Clear Injected Content',
        contexts: ['page']
      });
    }
  } catch (error) {
    console.log('Context menus not available:', error);
  }
});

// Enhanced message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action, 'from:', sender.tab ? sender.tab.url : 'popup');

  switch (request.action) {
    case 'content-script-ready':
      console.log('Content script ready on:', request.url);
      sendResponse({ success: true });
      break;

    case 'get-api-settings':
      getApiSettings()
        .then(s => sendResponse({ success: true, settings: s }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case 'get-morph-settings':
      getMorphSettings()
        .then(s => sendResponse({ success: true, settings: s }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case 'save-api-settings':
      saveApiSettings(request.settings)
        .then(() => sendResponse({ success: true }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case 'save-morph-settings':
      saveMorphSettings(request.settings)
        .then(() => sendResponse({ success: true }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case 'log-api-request':
      logApiRequest(request.data)
        .then(() => sendResponse({ success: true }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case 'get-active-tab':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          sendResponse({ success: true, tab: tabs[0] });
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      });
      return true;

    case 'inject-content-script':
      injectContentScript(request.tabId)
        .then(() => sendResponse({ success: true }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    default:
      console.log('Unknown action in background:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup or perform default action
  console.log('Extension icon clicked on tab:', tab.url);
});

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    // Optionally auto-inject content script
    console.log('Tab updated:', tab.url);
  }
});

console.log('Background script loaded');