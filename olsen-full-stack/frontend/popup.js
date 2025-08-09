// Default API endpoint
const DEFAULT_API_ENDPOINT = 'http://localhost:8000';

// DOM elements
let apiEndpointInput;
let saveConfigBtn;
let updatePageBtn;
let testConnectionBtn;
let statusDiv;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    apiEndpointInput = document.getElementById('apiEndpoint');
    saveConfigBtn = document.getElementById('saveConfig');
    updatePageBtn = document.getElementById('updatePage');
    testConnectionBtn = document.getElementById('testConnection');
    statusDiv = document.getElementById('status');

    // Load saved configuration
    await loadConfiguration();

    // Add event listeners
    saveConfigBtn.addEventListener('click', saveConfiguration);
    updatePageBtn.addEventListener('click', updateCurrentPage);
    testConnectionBtn.addEventListener('click', testApiConnection);
});

// Load configuration from storage
async function loadConfiguration() {
    try {
        const result = await chrome.storage.sync.get(['apiEndpoint']);
        const endpoint = result.apiEndpoint || DEFAULT_API_ENDPOINT;
        apiEndpointInput.value = endpoint;
    } catch (error) {
        console.error('Error loading configuration:', error);
        apiEndpointInput.value = DEFAULT_API_ENDPOINT;
    }
}

// Save configuration to storage
async function saveConfiguration() {
    try {
        const endpoint = apiEndpointInput.value.trim() || DEFAULT_API_ENDPOINT;
        await chrome.storage.sync.set({ apiEndpoint: endpoint });
        showStatus('Configuration saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving configuration:', error);
        showStatus('Error saving configuration', 'error');
    }
}

// Test API connection
async function testApiConnection() {
    const endpoint = apiEndpointInput.value.trim() || DEFAULT_API_ENDPOINT;
    
    try {
        showStatus('Testing connection...', 'info');
        
        const response = await fetch(`${endpoint}/health`);
        if (response.ok) {
            const data = await response.json();
            showStatus(`Connection successful! API Status: ${data.status}`, 'success');
        } else {
            showStatus(`Connection failed: ${response.status} ${response.statusText}`, 'error');
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        showStatus(`Connection failed: ${error.message}`, 'error');
    }
}

// Update current page
async function updateCurrentPage() {
    try {
        showStatus('Extracting page content...', 'info');
        
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Extract page content using content script
        const pageContent = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
        
        if (!pageContent) {
            showStatus('Failed to extract page content', 'error');
            return;
        }

        showStatus('Sending to API for processing...', 'info');
        
        // Get API endpoint
        const result = await chrome.storage.sync.get(['apiEndpoint']);
        const endpoint = result.apiEndpoint || DEFAULT_API_ENDPOINT;
        
        // Send to API
        const response = await fetch(`${endpoint}/update_page`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                html: pageContent.html,
                js: pageContent.js,
                css: pageContent.css
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const updatedContent = await response.json();
        
        if (!updatedContent.success) {
            throw new Error(updatedContent.message);
        }

        showStatus('Applying updates to page...', 'info');
        
        // Apply patches to page
        await chrome.tabs.sendMessage(tab.id, {
            action: 'applyUpdates',
            content: {
                dom_patches: updatedContent.dom_patches,
                style_patches: updatedContent.style_patches,
                js_patches: updatedContent.js_patches
            }
        });

        showStatus('Page updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating page:', error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

// Show status message
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}
