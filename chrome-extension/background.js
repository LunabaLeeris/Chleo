let socket = null;
let lastActiveTabId = null;

function connectWebSocket() {
    socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
        console.log('[Cleo Extension] Connected to Electron Avatar Backend');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('[Cleo Extension] Received command:', data);

            if (data.action === 'close_tab') {
                const targetDomain = (data.domain || '').toLowerCase().trim();
                let closed = false;

                // 1. Try closing all tabs matching domain
                chrome.tabs.query({}, (tabs) => {
                    if (tabs && tabs.length > 0) {
                        for (const tab of tabs) {
                            if (!tab.id) continue;
                            const tabUrl = (tab.url || tab.pendingUrl || '').toLowerCase();
                            const matches = targetDomain && (
                                tabUrl.includes('://' + targetDomain) ||
                                tabUrl.includes('.' + targetDomain) ||
                                tabUrl.includes(targetDomain)
                            );
                            if (matches) {
                                chrome.tabs.remove(tab.id, () => {
                                    console.log('[Cleo Extension] Closed matching domain tab:', tab.id, tabUrl);
                                });
                                closed = true;
                            }
                        }
                    }

                    // 2. If no tab was closed by domain match, close the last active tab
                    if (!closed && lastActiveTabId) {
                        chrome.tabs.remove(lastActiveTabId, () => {
                            console.log('[Cleo Extension] Closed lastActiveTabId:', lastActiveTabId);
                        });
                        closed = true;
                    }

                    // 3. Fallback: query active tab and remove it
                    if (!closed) {
                        chrome.tabs.query({ active: true }, (activeTabs) => {
                            if (activeTabs && activeTabs[0] && activeTabs[0].id) {
                                chrome.tabs.remove(activeTabs[0].id, () => {
                                    console.log('[Cleo Extension] Closed active tab fallback:', activeTabs[0].id);
                                });
                            }
                        });
                    }
                });
            } else if (data.action === 'redirect_tab') {
                const targetUrl = data.url || 'about:blank';
                if (lastActiveTabId) {
                    chrome.tabs.update(lastActiveTabId, { url: targetUrl });
                } else {
                    chrome.tabs.query({ active: true }, (tabs) => {
                        if (tabs && tabs[0]?.id) {
                            chrome.tabs.update(tabs[0].id, { url: targetUrl });
                        }
                    });
                }
            }
        } catch (err) {
            console.error('[Cleo Extension] Failed to parse message from WebSocket:', err);
        }
    };

    socket.onclose = () => {
        console.log('[Cleo Extension] Disconnected. Retrying in 3 seconds...');
        setTimeout(connectWebSocket, 3000);
    };

    socket.onerror = (err) => {
        console.error('[Cleo Extension] WebSocket Error:', err);
    };
}

connectWebSocket();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active) {
        lastActiveTabId = tabId;
    }
    if ((changeInfo.status === 'complete' || changeInfo.url) && tab.active && (tab.url || changeInfo.url)) {
        const url = tab.url || changeInfo.url;
        sendToElectron(url, tab.title || '');
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    lastActiveTabId = activeInfo.tabId;
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab && tab.url) {
            sendToElectron(tab.url, tab.title || '');
        }
    });
});

function sendToElectron(url, title) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ url, title }));
    }
}