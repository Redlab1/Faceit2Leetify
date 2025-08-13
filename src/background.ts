chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.runtime.onMessage.addListener(
  (
    msg: { type?: string } | undefined,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (msg?.type === 'PING') {
      sendResponse({ ok: true, ts: Date.now() });
      return true; // indicate async response usage when applicable
    }
    return false;
  }
);
