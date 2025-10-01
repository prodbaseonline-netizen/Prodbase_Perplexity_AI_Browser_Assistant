// DOM Elements
const apiKeySection = document.getElementById('api-key-section');
const chatSection = document.getElementById('chat-section');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key');
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const summarizeBtn = document.getElementById('summarize-btn');
const clearBtn = document.getElementById('clear-btn');
const includeContextCheckbox = document.getElementById('include-context');
const statusMessage = document.getElementById('status-message');

let conversationHistory = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const apiKey = await getApiKey();
    if (apiKey) {
        apiKeySection.style.display = 'none';
        chatSection.style.display = 'flex';
        loadConversationHistory();
    }
});

// Save API Key
saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        await chrome.storage.local.set({ perplexityApiKey: apiKey });
        showStatus('API Key saved successfully!', 'success');
        apiKeySection.style.display = 'none';
        chatSection.style.display = 'flex';
    } else {
        showStatus('Please enter a valid API key', 'error');
    }
});

// Send Message
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Summarize Page
summarizeBtn.addEventListener('click', async () => {
    const pageContent = await getPageContent();
    if (pageContent) {
        const prompt = `Summarize the following web page content:\n\nTitle: ${pageContent.title}\nURL: ${pageContent.url}\n\nContent: ${pageContent.text.substring(0, 3000)}`;
        await sendMessageToAI(prompt, true);
    }
});

// Clear Chat
clearBtn.addEventListener('click', () => {
    conversationHistory = [];
    messagesContainer.innerHTML = '';
    chrome.storage.local.remove('conversationHistory');
    showStatus('Chat cleared', 'success');
});

// Functions
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    const includeContext = includeContextCheckbox.checked;
    let fullMessage = message;

    if (includeContext) {
        const pageContent = await getPageContent();
        if (pageContent) {
            fullMessage = `Context from current page:\nTitle: ${pageContent.title}\nURL: ${pageContent.url}\n\nUser question: ${message}`;
        }
    }

    userInput.value = '';
    addMessageToUI('user', message);
    await sendMessageToAI(fullMessage);
}

async function sendMessageToAI(message, isSummary = false) {
    const apiKey = await getApiKey();
    if (!apiKey) {
        showStatus('Please set your API key first', 'error');
        return;
    }

    setLoading(true);
    
    conversationHistory.push({
        role: 'user',
        content: message
    });

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        const citations = data.citations || [];

        conversationHistory.push({
            role: 'assistant',
            content: aiResponse
        });

        addMessageToUI('ai', aiResponse, citations);
        saveConversationHistory();
        
    } catch (error) {
        console.error('Error:', error);
        showStatus('Error communicating with Perplexity AI: ' + error.message, 'error');
        conversationHistory.pop(); // Remove failed user message
    } finally {
        setLoading(false);
    }
}

function addMessageToUI(role, content, citations = []) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    let messageHTML = content;
    
    if (citations.length > 0) {
        messageHTML += '<div class="citation">Sources: ';
        citations.forEach((citation, index) => {
            messageHTML += `<a href="${citation}" target="_blank">[${index + 1}]</a> `;
        });
        messageHTML += '</div>';
    }
    
    messageDiv.innerHTML = messageHTML;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function getPageContent() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
        return response;
    } catch (error) {
        console.error('Error getting page content:', error);
        return null;
    }
}

async function getApiKey() {
    const result = await chrome.storage.local.get('perplexityApiKey');
    return result.perplexityApiKey;
}

function saveConversationHistory() {
    chrome.storage.local.set({ conversationHistory });
}

async function loadConversationHistory() {
    const result = await chrome.storage.local.get('conversationHistory');
    if (result.conversationHistory) {
        conversationHistory = result.conversationHistory;
        conversationHistory.forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                addMessageToUI(msg.role === 'user' ? 'user' : 'ai', msg.content);
            }
        });
    }
}

function setLoading(loading) {
    if (loading) {
        sendBtn.disabled = true;
        summarizeBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
    } else {
        sendBtn.disabled = false;
        summarizeBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.style.color = type === 'error' ? '#ef4444' : '#10b981';
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 3000);
}
