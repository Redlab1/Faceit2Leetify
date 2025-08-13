// Centralized logging system for the extension
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: number;
  level: string;
  context: string;
  message: string;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.DEBUG;
  private context: string = '';

  constructor(context: string = 'Extension') {
    this.context = context;
  }

  static getInstance(context?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(context);
    }
    return Logger.instance;
  }

  static create(context: string): Logger {
    return new Logger(context);
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [${this.context}] [${level}]`;
    return data ? `${prefix} ${message}` : `${prefix} ${message}`;
  }

  private log(level: LogLevel, levelName: string, message: string, ...args: any[]) {
    if (level < this.logLevel) return;

    const formattedMessage = this.formatMessage(levelName, message);
    
    // Always log to console
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }

    // Also store in chrome storage for debugging
    this.storeLog(level, levelName, message, args);
    
    // Send to content script if in background
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      this.sendLogToContentScript(level, levelName, formattedMessage, args);
    }
  }

  private async storeLog(level: LogLevel, levelName: string, message: string, args: any[]) {
    try {
      const logEntry: LogEntry = {
        timestamp: Date.now(),
        level: levelName,
        context: this.context,
        message,
        data: args.length > 0 ? args : undefined
      };

      const { extensionLogs = [] } = await chrome.storage.local.get(['extensionLogs']);
      extensionLogs.push(logEntry);
      
      // Keep only last 100 logs
      if (extensionLogs.length > 100) {
        extensionLogs.splice(0, extensionLogs.length - 100);
      }

      await chrome.storage.local.set({ extensionLogs });
    } catch (error) {
      // Fallback to console if storage fails
      console.error('Failed to store log:', error);
    }
  }

  private async sendLogToContentScript(level: LogLevel, levelName: string, message: string, args: any[]) {
    try {
      // Get active tab and send log message
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'EXTENSION_LOG',
          data: { level: levelName, message, args, context: this.context }
        }).catch(() => {
          // Ignore errors if content script not available
        });
      }
    } catch (error) {
      // Ignore errors if tabs API not available
    }
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, 'INFO', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, 'WARN', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, 'ERROR', message, ...args);
  }

  // Helper methods for common logging patterns
  apiCall(method: string, url: string, data?: any) {
    this.debug(`API ${method} ${url}`, data);
  }

  apiResponse(method: string, url: string, status: number, data?: any) {
    this.info(`API ${method} ${url} -> ${status}`, data);
  }

  apiError(method: string, url: string, error: any) {
    this.error(`API ${method} ${url} failed`, error);
  }

  userAction(action: string, data?: any) {
    this.info(`User action: ${action}`, data);
  }

  // Static methods for log management
  static async getLogs(): Promise<LogEntry[]> {
    try {
      const { extensionLogs = [] } = await chrome.storage.local.get(['extensionLogs']);
      return extensionLogs;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }
  
  static async clearLogs(): Promise<void> {
    try {
      await chrome.storage.local.remove(['extensionLogs']);
      console.info('Extension logs cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }
  
  static async exportLogs(): Promise<void> {
    try {
      const logs = await this.getLogs();
      const logText = logs.map(log => {
        const timestamp = new Date(log.timestamp).toISOString();
        const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
        return `${timestamp} [${log.level}] [${log.context}] ${log.message}${dataStr}`;
      }).join('\n');
      
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url: url,
        filename: `extension-logs-${new Date().toISOString().split('T')[0]}.txt`,
        saveAs: true
      });
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  }
}

// Global logger instances for different contexts
export const backgroundLogger = Logger.create('Background');
export const contentLogger = Logger.create('Content');
export const popupLogger = Logger.create('Popup');
export const apiLogger = Logger.create('API');
