import { Logger } from '../services/logger';

const logger = new Logger('popup');

const fetchBtn = document.getElementById('fetch-matches')! as HTMLButtonElement;
const out = document.getElementById('out')! as HTMLPreElement;

let currentDemoUrls: string[] = [];

logger.debug('Popup script loaded');

fetchBtn?.addEventListener('click', async () => {
  try {
    logger.userAction('Fetch matches button clicked');
    out.textContent = 'Fetching matches...';
    
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_FACEIT_MATCHES',
      data: {} // Let background script use stored settings
    });
    
    if (response.success) {
      logger.info('Successfully fetched matches');
      // Extract only the demo URLs from the response
      const matchData = response.data;
      
      if (matchData && matchData.demo_url && Array.isArray(matchData.demo_url)) {
        const demoUrls: string[] = matchData.demo_url;
        currentDemoUrls = demoUrls; // Store for copying
        
        if (demoUrls.length > 0) {
          out.textContent = `Demo URLs found (${demoUrls.length}):\n\n` + 
            demoUrls.map((url: string, index: number) => `${index + 1}. ${url}`).join('\n\n');
          
          // Show copy button if we have URLs
          showCopyButton();
        } else {
          out.textContent = 'No demo URLs found for this match.';
          hideCopyButton();
        }
      } else {
        out.textContent = 'Match found but no demo URLs available.';
        hideCopyButton();
      }
    } else {
      out.textContent = `Error: ${response.error}`;
      hideCopyButton();
    }
  } catch (error) {
    out.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    hideCopyButton();
  }
});

// Create copy button
const copyBtn = document.createElement('button');
copyBtn.textContent = 'Copy Demo URLs';
copyBtn.style.marginTop = '10px';
copyBtn.style.display = 'none';

copyBtn.addEventListener('click', async () => {
  if (currentDemoUrls.length > 0) {
    try {
      await navigator.clipboard.writeText(currentDemoUrls.join('\n'));
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Demo URLs';
      }, 2000);
    } catch (error) {
      logger.error('Failed to copy to clipboard', error);
      copyBtn.textContent = 'Copy Failed';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Demo URLs';
      }, 2000);
    }
  }
});

function showCopyButton() {
  copyBtn.style.display = 'block';
}

function hideCopyButton() {
  copyBtn.style.display = 'none';
}

// Add copy button to the page
document.querySelector('main')?.appendChild(copyBtn);

// Add a View Logs button for debugging
const viewLogsBtn = document.createElement('button');
viewLogsBtn.textContent = 'View Logs';
viewLogsBtn.style.marginTop = '10px';
viewLogsBtn.addEventListener('click', () => {
  logger.userAction('View logs button clicked');
  chrome.tabs.create({ url: chrome.runtime.getURL('logs.html') });
});

document.querySelector('main')?.appendChild(viewLogsBtn);