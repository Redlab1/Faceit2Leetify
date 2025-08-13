export interface ExtensionSettings {
  faceitApiKey?: string;
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
        'faceitApiKey'
      ]);
      
      return {
        faceitApiKey: settings.faceitApiKey || '',
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

  static validateSettings(settings: Partial<ExtensionSettings>): string[] {
    const errors: string[] = [];

    if (settings.faceitApiKey && settings.faceitApiKey.length < 10) {
      errors.push('Faceit API key appears to be too short');
    }

    return errors;
  }
}