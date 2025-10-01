// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'askPerplexity',
        title: 'Ask Perplexity AI about "%s"',
        contexts: ['selection']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'askPerplexity' && info.selectionText) {
        chrome.storage.local.set({
            pendingQuery: info.selectionText
        });
        chrome.action.openPopup();
    }
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openPopup') {
        chrome.action.openPopup();
    }
});
