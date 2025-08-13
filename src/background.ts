import { createFaceitApi, createLeetifyApi } from './services/api.js';
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
    if (!settings.faceitApiKey && !settings.faceitPlayerId) {
      await SettingsService.save({
        autoUpload: false,
        maxMatches: 20,
        downloadPath: 'Downloads/Faceit2Leetify'
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
    
    if (msg?.type === 'PING') {
      sendResponse({ ok: true, ts: Date.now() });
      return true;
    }

    if (msg?.type === 'FETCH_FACEIT_MATCHES') {
      handleFaceitMatches(msg.data, sendResponse);
      return true; // async response
    }

    if (msg?.type === 'UPLOAD_TO_LEETIFY') {
      handleLeetifyUpload(msg.data, sendResponse);
      return true; // async response
    }

    if (msg?.type === 'EXPORT_SETTINGS') {
      handleExportSettings(sendResponse);
      return true; // async response
    }

    if (msg?.type === 'BACKUP_SETTINGS') {
      handleBackupSettings(sendResponse);
      return true; // async response
    }

    if (msg?.type === 'IMPORT_SETTINGS') {
      handleImportSettings(msg.data, sendResponse);
      return true; // async response
    }

    if (msg?.type === 'PROCESS_FACEIT_MATCH') {
      handleProcessFaceitMatch(msg.data, sendResponse);
      return true; // async response
    }

    if (msg?.type === 'SUBMIT_DEMO_URL') {
      handleSubmitDemoUrl(msg.data, sendResponse);
      return true; // async response
    }

    if (msg?.type === 'DELETE_DEMO_FILE') {
      handleDeleteDemoFile(msg.data, sendResponse);
      return true; // async response
    }

    return false;
  }
);

async function handleFaceitMatches(
  data: { playerId?: string; apiKey?: string },
  sendResponse: (response?: unknown) => void
) {
  try {
    logger.info('Handling Faceit matches request', data);
    const settings = await SettingsService.load();
    const apiKey = data.apiKey || '3d25fd73-0ed9-4ee4-b602-fdd1a5517103';
    const playerId = data.playerId || 'ee3d88da-d584-4d38-9aa3-fc4c2201df79';

    if (!apiKey) {
      logger.warn('No Faceit API key configured');
      sendResponse({ 
        success: false, 
        error: 'Faceit API key not configured. Please set it in the options page.' 
      });
      return;
    }

    if (!playerId) {
      logger.warn('No Faceit Player ID configured');
      sendResponse({ 
        success: false, 
        error: 'Faceit Player ID not configured. Please set it in the options page.' 
      });
      return;
    }

    logger.apiCall('GET', 'Faceit matches', { playerId, limit: settings.maxMatches });
    const faceitApi = createFaceitApi(apiKey);
    const matches = await faceitApi.getPlayerMatches(playerId, settings.maxMatches);
    
    logger.apiCall('GET', 'Faceit match details', { matchId: matches[0].match_id });
    const matchDetails = await faceitApi.getMatchDetails(matches[0].match_id);

    logger.info('Successfully fetched Faceit match data', { matchId: matches[0].match_id, demoUrls: matchDetails.demo_url?.length });
    sendResponse({ success: true, data: matchDetails });
  } catch (error) {
    logger.error('Failed to fetch Faceit matches', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function handleLeetifyUpload(
  data: { matchId: string; demoUrl: string },
  sendResponse: (response?: unknown) => void
) {
  try {
    logger.userAction('Submit demo URL to Leetify', { matchId: data.matchId, url: data.demoUrl.substring(0, 100) + '...' });
    const leetifyApi = createLeetifyApi();
    
    logger.apiCall('POST', 'Leetify submit demo URL');
    const result = await leetifyApi.submitDemoUrl(data.demoUrl);

    logger.info('Successfully submitted to Leetify', result);
    sendResponse({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to submit demo URL to Leetify', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function handleExportSettings(sendResponse: (response?: unknown) => void) {
  try {
    logger.userAction('Export settings');
    await SettingsService.exportToFile();
    logger.info('Settings exported successfully');
    sendResponse({ success: true, message: 'Settings exported successfully' });
  } catch (error) {
    logger.error('Failed to export settings', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function handleBackupSettings(sendResponse: (response?: unknown) => void) {
  try {
    await SettingsService.createBackup();
    sendResponse({ success: true, message: 'Backup created successfully' });
  } catch (error) {
    console.error('Failed to create backup:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function handleImportSettings(
  data: { fileContent: string },
  sendResponse: (response?: unknown) => void
) {
  try {
    await SettingsService.importFromFile(data.fileContent);
    sendResponse({ success: true, message: 'Settings imported successfully' });
  } catch (error) {
    console.error('Failed to import settings:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function handleProcessFaceitMatch(
  data: { matchId: string; pageUrl: string },
  sendResponse: (response?: unknown) => void
) {
  try {
    logger.userAction('Process Faceit match from content script', data);
    const settings = await SettingsService.load();
    const apiKey = '3d25fd73-0ed9-4ee4-b602-fdd1a5517103';

    if (!settings.faceitApiKey && !apiKey) {
      logger.warn('No Faceit API key available');
      sendResponse({ 
        success: false, 
        error: 'Faceit API key not configured. Please set it in the options page.' 
      });
      return;
    }

    logger.info('Processing Faceit match', { matchId: data.matchId, pageUrl: data.pageUrl });

    const faceitApi = createFaceitApi(settings.faceitApiKey || apiKey);

    // Get match details to retrieve demo URL
    logger.apiCall('GET', `Faceit match details for ${data.matchId}`);
    const matchDetails = await faceitApi.getMatchDetails(data.matchId);
    
    if (!matchDetails.demo_url || matchDetails.demo_url.length === 0) {
      logger.warn('No demo URL found for match', { matchId: data.matchId });
      sendResponse({ 
        success: false, 
        error: 'No demo URL found for this match. Demo might not be ready yet.' 
      });
      return;
    }

    const demoUrl = matchDetails.demo_url[0]; // Use first demo URL
    logger.info('Found demo URL', { matchId: data.matchId, demoUrl: demoUrl.substring(0, 100) + '...' });

    // Submit demo URL directly to Leetify
    const leetifyApi = createLeetifyApi();
    
    try {
      logger.apiCall('POST', 'Leetify submit demo URL', { url: demoUrl.substring(0, 100) + '...' });
      const result = await leetifyApi.submitDemoUrl(demoUrl);
      
      logger.info('Successfully submitted demo to Leetify', result);
      sendResponse({ 
        success: true, 
        message: 'Demo URL submitted to Leetify successfully!',
        data: { demoUrl, result }
      });
      
    } catch (leetifyError) {
      logger.error('Failed to submit to Leetify, attempting fallback download', leetifyError);
      
      // Fallback: download the demo locally
      try {
        logger.debug('Downloading demo as fallback');
        const response = await fetch(demoUrl);
        if (!response.ok) {
          throw new Error(`Failed to download demo: ${response.statusText}`);
        }

        const demoBlob = await response.blob();
        const downloadUrl = URL.createObjectURL(demoBlob);
        
        await chrome.downloads.download({
          url: downloadUrl,
          filename: `faceit-demos/${data.matchId}.dem.gz`,
          saveAs: false
        });

        URL.revokeObjectURL(downloadUrl);

        logger.info('Demo downloaded locally as fallback', { size: demoBlob.size, matchId: data.matchId });
        sendResponse({ 
          success: true, 
          message: 'Leetify submission failed, but demo downloaded locally.',
          data: { demoUrl, error: leetifyError instanceof Error ? leetifyError.message : 'Unknown error' }
        });
        
      } catch (downloadError) {
        logger.error('Fallback download also failed', downloadError);
        sendResponse({ 
          success: false, 
          error: `Failed to submit to Leetify and download demo: ${leetifyError instanceof Error ? leetifyError.message : 'Unknown error'}` 
        });
      }
    }

  } catch (error) {
    logger.error('Failed to process Faceit match', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

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

async function handleDeleteDemoFile(
  data: { downloadId: number },
  sendResponse: (response?: unknown) => void
) {
  try {
    logger.userAction('Delete demo file from downloads', { downloadId: data.downloadId });
    
    // Delete the downloaded file
    await chrome.downloads.removeFile(data.downloadId);
    
    // Also remove it from download history
    await chrome.downloads.erase({ id: data.downloadId });
    
    logger.info('Successfully deleted demo file', { downloadId: data.downloadId });
    sendResponse({ 
      success: true, 
      message: 'Demo file deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete demo file', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
