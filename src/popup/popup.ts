import { Logger } from '../services/logger';

const logger = new Logger('popup');

const viewLogsBtn = document.createElement('button');
viewLogsBtn.textContent = 'View Logs';
viewLogsBtn.className = 'btn mt-sm';
viewLogsBtn.addEventListener('click', () => {
  logger.userAction('View logs button clicked');
  chrome.tabs.create({ url: chrome.runtime.getURL('logs.html') });
});

document.querySelector('main')?.appendChild(viewLogsBtn);