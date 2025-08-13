import { SettingsService } from '../services/settings.js';
import { Logger } from '../services/logger.js';

const logger = new Logger('options');

const faceitApiKeyInput = document.getElementById('faceit-api-key')! as HTMLInputElement;
const saveButton = document.getElementById('save-options')! as HTMLButtonElement;
const statusDiv = document.getElementById('status')! as HTMLDivElement;

// Load saved options
(async () => {
  try {
    logger.debug('Loading settings');
    const settings = await SettingsService.load();
    
    faceitApiKeyInput.value = settings.faceitApiKey || '';
    
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

function showStatus(message: string, type: 'success' | 'error') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}
