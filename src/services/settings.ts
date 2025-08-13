export interface ExtensionSettings {
  faceitApiKey?: string;
  faceitPlayerId?: string;
  leetifyApiKey?: string;
  autoUpload?: boolean;
  maxMatches?: number;
  downloadPath?: string;
}

export class SettingsService {
  private static readonly STORAGE_KEY = 'extension_settings';
  
  static async save(settings: Partial<ExtensionSettings>): Promise<void> {
    try {
      await chrome.storage.sync.set(settings);
      console.log('Settings saved successfully:', Object.keys(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings to storage');
    }
  }

  static async load(): Promise<ExtensionSettings> {
    try {
      const settings = await chrome.storage.sync.get([
        'faceitApiKey',
        'faceitPlayerId',
        'leetifyApiKey',
        'autoUpload',
        'maxMatches',
        'downloadPath'
      ]);
      
      return {
        faceitApiKey: settings.faceitApiKey || '',
        faceitPlayerId: settings.faceitPlayerId || '',
        leetifyApiKey: settings.leetifyApiKey || '',
        autoUpload: settings.autoUpload || false,
        maxMatches: settings.maxMatches || 20,
        downloadPath: settings.downloadPath || 'Downloads/Faceit2Leetify'
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      throw new Error('Failed to load settings from storage');
    }
  }

  static async get<K extends keyof ExtensionSettings>(key: K): Promise<ExtensionSettings[K]> {
    try {
      const result = await chrome.storage.sync.get([key]);
      return result[key];
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return undefined;
    }
  }

  static async clear(): Promise<void> {
    try {
      await chrome.storage.sync.clear();
      console.log('All settings cleared');
    } catch (error) {
      console.error('Failed to clear settings:', error);
      throw new Error('Failed to clear settings');
    }
  }

  // Export settings to JSON file
  static async exportToFile(): Promise<void> {
    try {
      const settings = await this.load();
      
      // Remove sensitive data for export (optional)
      const exportData = {
        ...settings,
        faceitApiKey: settings.faceitApiKey ? '***HIDDEN***' : '',
        leetifyApiKey: settings.leetifyApiKey ? '***HIDDEN***' : ''
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const filename = `faceit2leetify-settings-${new Date().toISOString().split('T')[0]}.json`;

      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });

      URL.revokeObjectURL(url);
      console.log('Settings exported to:', filename);
    } catch (error) {
      console.error('Failed to export settings:', error);
      throw new Error('Failed to export settings file');
    }
  }

  // Create a settings backup file with all data (including sensitive keys)
  static async createBackup(): Promise<void> {
    try {
      const settings = await this.load();
      
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        settings: settings
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const filename = `faceit2leetify-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });

      URL.revokeObjectURL(url);
      console.log('Backup created:', filename);
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Failed to create backup file');
    }
  }

  // Import settings from uploaded file
  static async importFromFile(fileContent: string): Promise<void> {
    try {
      const data = JSON.parse(fileContent);
      
      // Handle both backup format and direct settings format
      const settings = data.settings || data;
      
      // Validate required fields
      if (typeof settings !== 'object' || settings === null) {
        throw new Error('Invalid settings file format');
      }

      await this.save(settings);
      console.log('Settings imported successfully');
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Failed to import settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Validate settings
  static validateSettings(settings: Partial<ExtensionSettings>): string[] {
    const errors: string[] = [];

    if (settings.faceitApiKey && settings.faceitApiKey.length < 10) {
      errors.push('Faceit API key appears to be too short');
    }

    if (settings.faceitPlayerId && !/^[a-f0-9-]{36}$/.test(settings.faceitPlayerId)) {
      errors.push('Faceit Player ID should be a valid UUID format');
    }

    if (settings.maxMatches && (settings.maxMatches < 1 || settings.maxMatches > 100)) {
      errors.push('Max matches should be between 1 and 100');
    }

    return errors;
  }
}
