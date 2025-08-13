import { Logger } from './services/logger';

const logger = new Logger('content');

logger.debug('Faceit 2 Leetify content script loaded');

// Store captured demo URLs from downloads
let capturedDemoUrl: string | null = null;
let capturedDownloadId: number | null = null;
let currentMatchId: string | null = null;

// Check if we're on a Faceit match room page
if (window.location.hostname === 'www.faceit.com' && 
    window.location.pathname.includes('/room/')) {
  
  logger.info('Detected Faceit match room page', { url: window.location.href });
  
  // Extract current match ID from URL
  currentMatchId = extractMatchIdFromUrl(window.location.href);
  logger.debug('Current match ID', { matchId: currentMatchId });
  
  // Watch for SPA URL changes to reset state when navigating between rooms
  setupSpaNavigationWatcher();
  
  // Load any previously captured demo data for this match
  loadCapturedDemoData();
  
  // Wait for page to load and initialize the button injection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFaceitIntegration);
  } else {
    initializeFaceitIntegration();
  }
}

async function loadCapturedDemoData() {
  try {
    const result = await chrome.storage.local.get(['capturedDemoUrl', 'capturedDownloadId', 'capturedMatchId', 'capturedTimestamp']);
    
    // Check if we have stored data and if it's for the current match
    if (result.capturedDemoUrl && result.capturedMatchId === currentMatchId) {
      // Check if the captured data is still fresh (less than 4 minutes old to avoid expiration)
      const now = Date.now();
      const capturedTime = result.capturedTimestamp || 0;
      const ageInMinutes = (now - capturedTime) / (1000 * 60);
      
      if (ageInMinutes < 4) { // Use data if less than 4 minutes old
        capturedDemoUrl = result.capturedDemoUrl;
        capturedDownloadId = result.capturedDownloadId || null;
        logger.info('Loaded previously captured demo data for current match', { 
          url: capturedDemoUrl?.substring(0, 50) + '...', 
          downloadId: capturedDownloadId,
          matchId: currentMatchId,
          ageInMinutes: ageInMinutes.toFixed(1)
        });
        
        // Update any existing buttons
        updateExistingButtons();
      } else {
        // Data is too old, clear it
        logger.debug('Clearing old demo data (expired)', {
          matchId: currentMatchId,
          ageInMinutes: ageInMinutes.toFixed(1)
        });
        await clearCapturedDemoData();
      }
    } else if (result.capturedDemoUrl && result.capturedMatchId !== currentMatchId) {
      // Clear old data from different match
      logger.debug('Clearing old demo data from different match', {
        oldMatchId: result.capturedMatchId,
        currentMatchId: currentMatchId
      });
      await clearCapturedDemoData();
    } else {
      logger.debug('No captured demo data found for current match', { matchId: currentMatchId });
    }
  } catch (error) {
    logger.error('Failed to load captured demo data', error);
  }
}

function updateExistingButtons() {
  const leetifyButtons = document.querySelectorAll('.f2l-button') as NodeListOf<HTMLButtonElement>;
  leetifyButtons.forEach(button => {
    if (capturedDemoUrl && !button.disabled) {
      const fileName = capturedDemoUrl.substring(capturedDemoUrl.lastIndexOf('/') + 1);
      button.title = `Upload demo to Leetify (${fileName})`;
      button.classList.add('ready');
      
      // Update button text to indicate it's ready
      button.innerHTML = `
        <svg class="f2l-button-icon" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
        Upload to Leetify ✓
      `;
    }
  });
}

async function saveCapturedDemoData() {
  try {
    await chrome.storage.local.set({
      capturedDemoUrl,
      capturedDownloadId,
      capturedMatchId: currentMatchId,
      capturedTimestamp: Date.now()
    });
    logger.debug('Saved captured demo data to local storage', { 
      matchId: currentMatchId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to save captured demo data', error);
  }
}

async function clearCapturedDemoData() {
  try {
    logger.debug('Clearing captured demo data', { 
      url: capturedDemoUrl?.substring(0, 50) + '...', 
      downloadId: capturedDownloadId,
      matchId: currentMatchId
    });
    await chrome.storage.local.remove(['capturedDemoUrl', 'capturedDownloadId', 'capturedMatchId', 'capturedTimestamp']);
    capturedDemoUrl = null;
    capturedDownloadId = null;
    logger.debug('Cleared captured demo data from local storage');
  } catch (error) {
    logger.error('Failed to clear captured demo data', error);
  }
}

function initializeFaceitIntegration() {
  logger.debug('Initializing Faceit integration');
  
  // Use MutationObserver to detect when demo buttons are added to the page
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          injectLeetifyButtons(node as Element);
        }
      });
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  logger.debug('MutationObserver started for button injection');

  // Check existing elements after a short delay to ensure data is loaded
  setTimeout(() => {
    injectLeetifyButtons(document.body);
  }, 100);
}

function injectLeetifyButtons(container: Element) {
  // Look for Faceit demo buttons
  const demoButtons = container.querySelectorAll('button');
  
  demoButtons.forEach((button) => {
    const buttonText = button.textContent?.toLowerCase() || '';
    const buttonClasses = button.className.toLowerCase();
    
    // Check if this looks like a demo/watch button and we haven't already added our button
    if ((buttonText.includes('watch demo')) && !button.parentElement?.querySelector('.f2l-button')) {
      
      logger.debug('Found demo button, injecting Leetify button', { 
        text: buttonText, 
        classes: buttonClasses 
      });
      addLeetifyButton(button as HTMLElement);
    }
  });
}

function addLeetifyButton(demoButton: HTMLElement) {
  // Create the Leetify button
  const leetifyButton = document.createElement('button');
  leetifyButton.className = 'f2l-button';
  leetifyButton.innerHTML = `
    <svg class="f2l-button-icon" viewBox="0 0 24 24">
      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
    </svg>
    Upload to Leetify
  `;
  
  // Set initial state based on whether demo URL is captured
  if (capturedDemoUrl) {
    leetifyButton.title = `Upload demo to Leetify (${capturedDemoUrl.substring(capturedDemoUrl.lastIndexOf('/') + 1)})`;
    leetifyButton.classList.add('ready');
  } else {
    leetifyButton.title = 'Click "Watch Demo" first to download, then use this button to upload to Leetify';
  }

  // Add click handler
  leetifyButton.addEventListener('click', handleLeetifyButtonClick);

  // Insert the button next to the demo button
  demoButton.parentElement?.insertBefore(leetifyButton, demoButton.nextSibling);
  
  // Add CSS styles
  addLeetifyButtonStyles();
}

function notifyDemoUrlCaptured(url: string) {
  logger.info('Demo URL captured from download', { url });
  
  // Show notification to user
  showNotification('Demo downloaded! You can now upload to Leetify.', 'success');
  
  // Update any existing Leetify buttons to show the captured URL
  const leetifyButtons = document.querySelectorAll('.f2l-button') as NodeListOf<HTMLButtonElement>;
  leetifyButtons.forEach(button => {
    if (!button.disabled) {
      const fileName = url.substring(url.lastIndexOf('/') + 1);
      button.title = `Upload demo to Leetify (${fileName})`;
      button.classList.add('ready');
      
      // Update button text to indicate it's ready
      button.innerHTML = `
        <svg class="f2l-button-icon" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
        Upload to Leetify ✓
      `;
    }
  });
}

function addLeetifyButtonStyles() {
  // Check if styles already added
  if (document.getElementById('f2l-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'f2l-styles';
  style.textContent = `
    .f2l-button {
      text-size-adjust: 100%;
      pointer-events: auto;
      -webkit-font-smoothing: antialiased;
      overflow: visible;
      appearance: button;
      background: none;
      font: inherit;
      text-decoration: inherit;
      cursor: pointer;
      outline: none;
      white-space: nowrap;
      box-sizing: border-box;
      border-radius: 4px;
      -webkit-box-align: center;
      align-items: center;
      -webkit-box-pack: center;
      justify-content: center;
      height: 32px;
      font-family: Play, sans-serif;
      font-size: 14px;
      font-weight: bold;
      line-height: 16px;
      text-transform: uppercase;
      color: rgb(255, 85, 0);
      background-color: transparent;
      border: none;
      padding: 8px;
      display: flex;
      text-align: center;
      width: 100%;
      margin: 0px 0px 8px;
      transition: all 0.2s ease;
      gap: 6px;
    }
    
    .f2l-button:hover {
      opacity: 0.8;
      transform: translateY(-1px);
    }
    
    .f2l-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    .f2l-button.ready {
      color: rgb(76, 175, 80);
    }
    
    .f2l-button.success {
      color: rgb(46, 125, 50);
    }
    
    .f2l-button-icon {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    
    .f2l-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: f2l-spin 1s linear infinite;
    }
    
    @keyframes f2l-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .f2l-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      transform: translateX(400px);
      transition: transform 0.3s ease;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .f2l-notification.show {
      transform: translateX(0);
    }
    
    .f2l-notification.success {
      background: #4CAF50;
    }
    
    .f2l-notification.error {
      background: #f44336;
    }
    
    .f2l-notification.warning {
      background: #ff9800;
    }
  `;
  
  document.head.appendChild(style);
}

async function handleLeetifyButtonClick(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  
  // Always act on the button, not inner SVG/path nodes
  const button = (event.currentTarget as HTMLButtonElement) || (event.target as HTMLElement)?.closest('button.f2l-button') as HTMLButtonElement;
  if (!button) {
    logger.error('Leetify click handler: no button context found');
    return;
  }
  const originalContent = button.innerHTML;
  
  logger.debug('Leetify button clicked', { 
    hasCapturedUrl: !!capturedDemoUrl, 
    capturedUrl: capturedDemoUrl?.substring(0, 50) + '...',
    downloadId: capturedDownloadId 
  });
  
  try {
    // Check if we have a captured demo URL
    if (!capturedDemoUrl) {
      // If no demo URL captured yet, instruct user to click "Watch Demo" first
      logger.warn('No demo URL captured, prompting user to click Watch Demo');
      showNotification('Please click "Watch Demo" first to download the demo file, then try again.', 'warning');
      return;
    }

    // Show loading state
    button.disabled = true;
    button.innerHTML = `
      <div class="f2l-spinner"></div>
      Uploading...
    `;

    logger.userAction('Upload captured demo to Leetify', { demoUrl: capturedDemoUrl });

    // Send the captured demo URL directly to Leetify
    const response = await chrome.runtime.sendMessage({
      type: 'SUBMIT_DEMO_URL',
      data: { demoUrl: capturedDemoUrl }
    });

    if (response.success) {
      logger.info('Demo upload successful', response.data);
      
      // Delete the downloaded demo file
      if (capturedDownloadId !== null) {
        try {
          const deleteResponse = await chrome.runtime.sendMessage({
            type: 'DELETE_DEMO_FILE',
            data: { downloadId: capturedDownloadId }
          });
          
          if (deleteResponse.success) {
            logger.info('Demo file deleted from downloads');
            showNotification('Demo uploaded to Leetify and file cleaned up!', 'success');
          } else {
            logger.warn('Failed to delete demo file', deleteResponse.error);
            showNotification('Demo uploaded to Leetify successfully! (File cleanup failed)', 'success');
          }
        } catch (deleteError) {
          logger.error('Error deleting demo file', deleteError);
          showNotification('Demo uploaded to Leetify successfully! (File cleanup failed)', 'success');
        }
      } else {
        showNotification('Demo uploaded to Leetify successfully!', 'success');
      }
      
      // Update button to show success
      button.classList.add('success');
      button.innerHTML = `
        <svg class="f2l-button-icon" viewBox="0 0 24 24">
          <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" />
        </svg>
        Uploaded!
      `;
      
      // Reset button and clear captured data
      setTimeout(async () => {
        button.disabled = false;
        button.innerHTML = originalContent;
        
        // Clear captured data from memory and storage
        await clearCapturedDemoData();
        
        // Reset button to default state
        button.classList.remove('ready', 'success');
        button.title = 'Click "Watch Demo" first to download, then use this button to upload to Leetify';
      }, 3000);
      
    } else {
      throw new Error(response.error || 'Upload failed');
    }

  } catch (error) {
    logger.error('Failed to upload demo', error);
    
    // Extract detailed error message if available
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Check if this might be an expired URL error
    if (errorMessage.includes('403') || errorMessage.includes('expired') || errorMessage.includes('signature')) {
      errorMessage = 'Demo URL has expired. Please click "Watch Demo" again to get a fresh download link.';
      
      // Clear the expired demo data
      await clearCapturedDemoData();
      
      // Reset all buttons to default state
      const allButtons = document.querySelectorAll('.f2l-button') as NodeListOf<HTMLButtonElement>;
      allButtons.forEach(btn => {
        btn.classList.remove('ready', 'success');
        btn.title = 'Click "Watch Demo" first to download, then use this button to upload to Leetify';
        btn.innerHTML = `
          <svg class="f2l-button-icon" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
          Upload to Leetify
        `;
      });
    }
    
    showNotification(`Failed to upload demo: ${errorMessage}`, 'error');
    
    // Reset button
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

function extractMatchIdFromUrl(url: string): string | null {
  // Extract match ID from Faceit room URL
  // Format: https://www.faceit.com/{lang}/cs2/room/{match-id}
  const match = url.match(/\/room\/([^\/\?]+)/);
  return match ? match[1] : null;
}

function resetAllLeetifyButtons() {
  const buttons = document.querySelectorAll('.f2l-button') as NodeListOf<HTMLButtonElement>;
  buttons.forEach(btn => {
    btn.classList.remove('ready', 'success');
    btn.disabled = false;
    btn.title = 'Click "Watch Demo" first to download, then use this button to upload to Leetify';
    btn.innerHTML = `
      <svg class="f2l-button-icon" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
      Upload to Leetify
    `;
  });
}

function setupSpaNavigationWatcher() {
  let lastUrl = location.href;
  const handleUrlChange = () => {
    const newUrl = location.href;
    if (newUrl === lastUrl) return;
    lastUrl = newUrl;
    logger.debug('URL changed', { url: newUrl });

    if (window.location.hostname === 'www.faceit.com' && window.location.pathname.includes('/room/')) {
      const newMatchId = extractMatchIdFromUrl(newUrl);
      if (newMatchId !== currentMatchId) {
        logger.debug('Match changed, resetting captured data', { from: currentMatchId, to: newMatchId });
        currentMatchId = newMatchId;
        capturedDemoUrl = null;
        capturedDownloadId = null;
        // Best-effort clear; ignore failures
        clearCapturedDemoData().catch(e => logger.warn('Failed to clear after navigation', e));
        resetAllLeetifyButtons();
        // Ensure buttons are present for the new page content
        setTimeout(() => injectLeetifyButtons(document.body), 150);
      }
    }
  };

  const origPushState = history.pushState.bind(history);
  history.pushState = function(...args: unknown[]) {
    const ret = (origPushState as any).apply(history, args as any);
    handleUrlChange();
    return ret;
  } as any;

  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = function(...args: unknown[]) {
    const ret = (origReplaceState as any).apply(history, args as any);
    handleUrlChange();
    return ret;
  } as any;

  window.addEventListener('popstate', handleUrlChange);
}

function showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  // Remove existing notification if any
  const existing = document.querySelector('.f2l-notification');
  if (existing) {
    existing.remove();
  }

  // Create notification
  const notification = document.createElement('div');
  notification.className = `f2l-notification ${type}`;
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Handle messages from popup/background
chrome.runtime.onMessage.addListener((msg: { type?: string; data?: any }) => {
  logger.debug('Content script received message', { type: msg?.type, data: msg?.data });
  
  if (msg?.type === 'CONTENT_PING') {
    logger.debug('Content received CONTENT_PING');
  }
  if (msg?.type === 'DEMO_DOWNLOAD_DETECTED') {
    logger.info('Demo download detected from background', msg.data);
    capturedDemoUrl = msg.data.url;
    capturedDownloadId = msg.data.downloadId;
    
    // Save to storage for persistence across tabs/reloads
    saveCapturedDemoData().then(() => {
      notifyDemoUrlCaptured(msg.data.url);
    }).catch(error => {
      logger.error('Failed to save demo data', error);
      notifyDemoUrlCaptured(msg.data.url);
    });
  }
  return false;
});
