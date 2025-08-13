import { createLeetifyApi } from './services/api.js';
import { SettingsService } from './services/settings.js';
import { backgroundLogger as logger } from './services/logger.js';

logger.info('Background service worker started');

chrome.runtime.onInstalled.addListener(() => {
  logger.info('Extension installed');
  // Initialize default settings on first install
  initializeDefaultSettings();
  // Set up download monitoring
  setupDownloadMonitoring();
});

// Also ensure listeners are in place on browser startup
chrome.runtime.onStartup.addListener(() => {
  logger.info('Browser startup event');
  setupDownloadMonitoring();
});

// Ensure listeners are registered when the service worker is loaded (e.g., on extension reload)
setupDownloadMonitoring();

let downloadsListenerRegistered = false;

function setupDownloadMonitoring() {
  if (downloadsListenerRegistered) {
    logger.debug('Download monitoring already registered');
    return;
  }
  // Monitor downloads to capture demo file URLs
  chrome.downloads.onCreated.addListener((downloadItem) => {
    logger.debug('Download detected', { 
      url: downloadItem.url, 
      filename: downloadItem.filename,
      mime: downloadItem.mime 
    });
    
    // Check if this looks like a demo file download
    const url = downloadItem.url;
    const filename = downloadItem.filename || '';
    const downloadId = downloadItem.id;
    
    if (isDemoFile(url, filename)) {
      logger.info('Demo file download detected', { url, filename, downloadId });
      
      // Notify content scripts about the demo download
      chrome.tabs.query({ url: '*://www.faceit.com/*/room/*' }, (tabs) => {
        tabs.forEach(tab => {
          if (!tab.id) return;
          chrome.tabs
            .sendMessage(tab.id, {
              type: 'DEMO_DOWNLOAD_DETECTED',
              data: { url, filename, downloadId }
            })
            .then(() => {
              logger.debug('Sent DEMO_DOWNLOAD_DETECTED to tab', { tabId: tab.id });
            })
            .catch((err) => {
              logger.warn('Failed to send DEMO_DOWNLOAD_DETECTED to tab', { tabId: tab.id, error: err instanceof Error ? err.message : String(err) });
            });
        });
      });
    }
  });
  downloadsListenerRegistered = true;
  logger.debug('Download monitoring setup complete');
}

function isDemoFile(url: string, filename: string): boolean {
  const demoPatterns = [
    '.dem',
    '.dem.gz', 
    '.demo',
    'demo',
    'replay'
  ];
  
  const urlLower = url.toLowerCase();
  const filenameLower = filename.toLowerCase();
  
  return demoPatterns.some(pattern => 
    urlLower.includes(pattern) || filenameLower.includes(pattern)
  );
}

async function initializeDefaultSettings() {
  try {
    const settings = await SettingsService.load();
    if (!settings.faceitApiKey) {
      await SettingsService.save({
        faceitApiKey: '3d25fd73-0ed9-4ee4-b602-fdd1a5517103'
      });
      logger.info('Default settings initialized');
    }
  } catch (error) {
    logger.error('Failed to initialize default settings', error);
  }
}

chrome.runtime.onMessage.addListener(
  (
    msg: { type?: string; data?: any } | undefined,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    logger.debug('Received message', { type: msg?.type, sender: _sender.tab?.url });

    if (msg?.type === 'SUBMIT_DEMO_URL') {
      handleSubmitDemoUrl(msg.data, sendResponse);
      return true; // async response
    }

    return false;
  }
);

async function handleSubmitDemoUrl(
  data: { demoUrl: string },
  sendResponse: (response?: unknown) => void
) {
  try {
    logger.userAction('Submit captured demo URL to Leetify', { 
      url: data.demoUrl.substring(0, 100) + '...' 
    });
    
    const leetifyApi = createLeetifyApi();
    logger.apiCall('POST', 'Leetify submit captured demo URL');
    const result = await leetifyApi.submitDemoUrl(data.demoUrl);

    logger.info('Successfully submitted captured demo to Leetify', result);
    sendResponse({ 
      success: true, 
      message: 'Demo URL submitted to Leetify successfully!',
      data: result 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      demoUrl: data.demoUrl.substring(0, 100) + '...'
    };
    
    logger.error('Failed to submit captured demo URL to Leetify', errorDetails);
    sendResponse({ 
      success: false, 
      error: errorMessage,
      details: errorDetails
    });
  }
}