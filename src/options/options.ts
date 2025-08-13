import { SettingsService } from '../services/settings.js';
import { Logger } from '../services/logger.js';

const logger = new Logger('options');

const faceitApiKeyInput = document.getElementById('faceit-api-key')! as HTMLInputElement;
const faceitPlayerIdInput = document.getElementById('faceit-player-id')! as HTMLInputElement;
const autoUploadCheckbox = document.getElementById('auto-upload')! as HTMLInputElement;
const saveButton = document.getElementById('save-options')! as HTMLButtonElement;
const statusDiv = document.getElementById('status')! as HTMLDivElement;

logger.debug('Options page loaded');

// Add new elements for file operations
const exportButton = document.createElement('button');
exportButton.textContent = 'Export Settings';
exportButton.style.marginLeft = '10px';

const backupButton = document.createElement('button');
backupButton.textContent = 'Create Backup';
backupButton.style.marginLeft = '10px';

const importInput = document.createElement('input');
importInput.type = 'file';
importInput.accept = '.json';
importInput.style.display = 'none';

const importButton = document.createElement('button');
importButton.textContent = 'Import Settings';
importButton.style.marginLeft = '10px';

// Add buttons to the page
const buttonContainer = document.createElement('div');
buttonContainer.style.marginTop = '20px';
buttonContainer.appendChild(exportButton);
buttonContainer.appendChild(backupButton);
buttonContainer.appendChild(importButton);
buttonContainer.appendChild(importInput);

document.querySelector('main')?.appendChild(buttonContainer);

// Load saved options
(async () => {
  try {
    logger.debug('Loading settings');
    const settings = await SettingsService.load();
    
    faceitApiKeyInput.value = settings.faceitApiKey || '';
    faceitPlayerIdInput.value = settings.faceitPlayerId || '';
    autoUploadCheckbox.checked = settings.autoUpload || false;
    
    logger.info('Settings loaded successfully');
  } catch (error) {
    showStatus('Failed to load settings', 'error');
    logger.error('Load error', error);
  }
})();

// Save options
saveButton.addEventListener('click', async () => {
  try {
    logger.userAction('Save settings');
    const settings = {
      faceitApiKey: faceitApiKeyInput.value.trim(),
      faceitPlayerId: faceitPlayerIdInput.value.trim(),
      autoUpload: autoUploadCheckbox.checked,
    };

    // Validate settings
    const errors = SettingsService.validateSettings(settings);
    if (errors.length > 0) {
      logger.warn('Settings validation failed', { errors });
      showStatus(`Validation errors: ${errors.join(', ')}`, 'error');
      return;
    }

    await SettingsService.save(settings);
    logger.info('Settings saved successfully');
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings', 'error');
    logger.error('Save error', error);
  }
});

// Export settings
exportButton.addEventListener('click', async () => {
  try {
    logger.userAction('Export settings');
    const response = await chrome.runtime.sendMessage({ type: 'EXPORT_SETTINGS' });
    if (response.success) {
      logger.info('Settings exported successfully');
      showStatus('Settings exported successfully!', 'success');
    } else {
      logger.error('Export failed', response.error);
      showStatus(`Export failed: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus('Failed to export settings', 'error');
    logger.error('Export error', error);
  }
});

// Create backup
backupButton.addEventListener('click', async () => {
  try {
    logger.userAction('Create backup');
    const response = await chrome.runtime.sendMessage({ type: 'BACKUP_SETTINGS' });
    if (response.success) {
      logger.info('Backup created successfully');
      showStatus('Backup created successfully!', 'success');
    } else {
      logger.error('Backup failed', response.error);
      showStatus(`Backup failed: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus('Failed to create backup', 'error');
    logger.error('Backup error', error);
  }
});

// Import settings
importButton.addEventListener('click', () => {
  importInput.click();
});

importInput.addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    logger.userAction('Import settings file', { fileName: file.name });
    const fileContent = await file.text();
    const response = await chrome.runtime.sendMessage({ 
      type: 'IMPORT_SETTINGS', 
      data: { fileContent } 
    });
    
    if (response.success) {
      logger.info('Settings imported successfully');
      showStatus('Settings imported successfully! Reloading...', 'success');
      // Reload the page to show imported settings
      setTimeout(() => window.location.reload(), 1500);
    } else {
      logger.error('Import failed', response.error);
      showStatus(`Import failed: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus('Failed to import settings', 'error');
    logger.error('Import error', error);
  }
});

function showStatus(message: string, type: 'success' | 'error') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}
