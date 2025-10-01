// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageContent') {
        const pageContent = {
            title: document.title,
            url: window.location.href,
            text: getPageText(),
            selectedText: window.getSelection().toString()
        };
        sendResponse(pageContent);
    }
    return true;
});

function getPageText() {
    // Get main content, avoiding scripts, styles, and hidden elements
    const bodyClone = document.body.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedTags = ['script', 'style', 'nav', 'footer', 'header', 'aside'];
    unwantedTags.forEach(tag => {
        const elements = bodyClone.getElementsByTagName(tag);
        while (elements.length > 0) {
            elements[0].remove();
        }
    });
    
    // Get text content
    let text = bodyClone.innerText || bodyClone.textContent;
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limit to first 5000 characters
    return text.substring(0, 5000);
}

// Add floating button for quick access
function addFloatingButton() {
    const button = document.createElement('div');
    button.id = 'perplexity-ai-button';
    button.innerHTML = '🤖';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        transition: transform 0.2s;
    `;
    
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openPopup' });
    });
    
    document.body.appendChild(button);
}

// Add button when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addFloatingButton);
} else {
    addFloatingButton();
}
