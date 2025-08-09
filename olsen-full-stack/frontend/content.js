// Content script for extracting and applying page content

// Ensure the content script is properly loaded
console.log('Page Updater content script loaded on:', window.location.href);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'extractContent') {
        extractPageContent().then(content => {
            console.log('Extracted content:', content);
            sendResponse(content);
        }).catch(error => {
            console.error('Error extracting content:', error);
            sendResponse(null);
        });
        return true; // Keep message channel open for async response
    } else if (request.action === 'applyUpdates') {
        try {
            applyUpdatesToPage(request.content);
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error applying updates:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    return true; // Keep message channel open
});

// Extract HTML, CSS, and JS from the current page
async function extractPageContent() {
    try {
        // Get HTML content
        const html = document.documentElement.outerHTML;
        
        // Extract CSS from stylesheets and style tags
        let css = '';
        
        // Get CSS from external stylesheets
        const stylesheets = Array.from(document.styleSheets);
        for (const stylesheet of stylesheets) {
            try {
                if (stylesheet.cssRules) {
                    for (const rule of stylesheet.cssRules) {
                        css += rule.cssText + '\n';
                    }
                }
            } catch (e) {
                // Cross-origin stylesheets may not be accessible
                console.warn('Could not access stylesheet:', stylesheet.href, e);
            }
        }
        
        // Get CSS from inline style tags
        const styleTags = document.querySelectorAll('style');
        styleTags.forEach(tag => {
            css += tag.textContent + '\n';
        });
        
        // Extract JavaScript from script tags
        let js = '';
        const scriptTags = document.querySelectorAll('script');
        scriptTags.forEach(tag => {
            if (tag.src) {
                // External script - we'll note it but can't extract content due to CORS
                js += `// External script: ${tag.src}\n`;
            } else {
                // Inline script
                js += tag.textContent + '\n';
            }
        });
        
        return {
            html: html,
            css: css,
            js: js
        };
        
    } catch (error) {
        console.error('Error extracting page content:', error);
        return null;
    }
}

// Apply patch-based updates to the page (preserves event listeners)
function applyUpdatesToPage(patches) {
    try {
        console.log('Applying patches:', patches);
        
        // Apply DOM patches
        if (patches.dom_patches) {
            patches.dom_patches.forEach(patch => {
                applyDOMPatch(patch);
            });
        }
        
        // Apply style patches
        if (patches.style_patches) {
            patches.style_patches.forEach(patch => {
                applyStylePatch(patch);
            });
        }
        
        // Apply JS patches (future feature)
        if (patches.js_patches) {
            console.log('JS patches received but not implemented yet');
        }
        
        console.log('All patches applied successfully');
        
    } catch (error) {
        console.error('Error applying patches to page:', error);
    }
}

// Apply a single DOM patch
function applyDOMPatch(patch) {
    try {
        const targetElement = document.querySelector(patch.selector);
        if (!targetElement) {
            console.warn(`Target element not found for selector: ${patch.selector}`);
            return;
        }
        
        switch (patch.type) {
            case 'insert':
                // Remove existing element with same ID if it exists
                if (patch.content.includes('id="update-banner"')) {
                    const existing = document.getElementById('update-banner');
                    if (existing) {
                        existing.remove();
                    }
                }
                
                // Create new element
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = patch.content.trim();
                const newElement = tempDiv.firstChild;
                
                // Insert based on position
                switch (patch.position) {
                    case 'prepend':
                        targetElement.insertBefore(newElement, targetElement.firstChild);
                        break;
                    case 'append':
                        targetElement.appendChild(newElement);
                        break;
                    case 'before':
                        targetElement.parentNode.insertBefore(newElement, targetElement);
                        break;
                    case 'after':
                        targetElement.parentNode.insertBefore(newElement, targetElement.nextSibling);
                        break;
                }
                break;
                
            case 'update':
                // Update element content without destroying it (preserves event listeners)
                if (patch.content) {
                    targetElement.innerHTML = patch.content;
                }
                break;
                
            case 'remove':
                targetElement.remove();
                break;
        }
        
        // Apply attributes if specified
        if (patch.attributes && Object.keys(patch.attributes).length > 0) {
            Object.entries(patch.attributes).forEach(([key, value]) => {
                targetElement.setAttribute(key, value);
            });
        }
        
        console.log(`Applied DOM patch: ${patch.type} on ${patch.selector}`);
        
    } catch (error) {
        console.error('Error applying DOM patch:', patch, error);
    }
}

// Apply a single style patch
function applyStylePatch(patch) {
    try {
        switch (patch.type) {
            case 'add':
            case 'update':
                // Get or create style element for patches
                let styleElement = document.querySelector('style[data-page-updater="patches"]');
                if (!styleElement) {
                    styleElement = document.createElement('style');
                    styleElement.setAttribute('data-page-updater', 'patches');
                    document.head.appendChild(styleElement);
                }
                
                // Build CSS rule
                const cssRules = Object.entries(patch.rules)
                    .map(([property, value]) => `${property}: ${value}`)
                    .join('; ');
                
                const cssRule = `${patch.selector} { ${cssRules} }`;
                
                // Add rule to stylesheet
                styleElement.textContent += '\n' + cssRule;
                break;
                
            case 'remove':
                // Remove specific styles (more complex, not implemented for MVP)
                console.log('Style removal not implemented yet');
                break;
        }
        
        console.log(`Applied style patch: ${patch.type} on ${patch.selector}`);
        
    } catch (error) {
        console.error('Error applying style patch:', patch, error);
    }
}

// Initialize content script
console.log('Page Updater content script loaded');
