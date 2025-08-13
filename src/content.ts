console.debug('Content script loaded');

chrome.runtime.onMessage.addListener((msg: { type?: string }) => {
  if (msg?.type === 'CONTENT_PING') {
    console.debug('Content received CONTENT_PING');
  }
  return false;
});
