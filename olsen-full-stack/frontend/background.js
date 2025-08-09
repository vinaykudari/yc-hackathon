// Background script for the Page Updater extension

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Page Updater extension installed');
    
    // Set default configuration
    chrome.storage.sync.set({
        apiEndpoint: 'http://localhost:8000'
    });
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle any background processing if needed
    console.log('Background script received message:', request);
    
    // For now, we don't need specific background processing
    // All communication happens directly between popup and content script
    
    return true;
});
