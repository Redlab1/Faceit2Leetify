import { Logger } from '../services/logger';

const logger = new Logger('logs-viewer');
const logsContainer = document.getElementById('logs') as HTMLDivElement;
const refreshButton = document.getElementById('refresh') as HTMLButtonElement;
const clearButton = document.getElementById('clear') as HTMLButtonElement;
const exportButton = document.getElementById('export') as HTMLButtonElement;

logger.debug('Logs viewer loaded');

// Load and display logs
async function loadLogs() {
  try {
    const logs = await Logger.getLogs();
    displayLogs(logs);
  } catch (error) {
    logger.error('Failed to load logs', error);
    logsContainer.innerHTML = '<div class="log-entry ERROR">Failed to load logs</div>';
  }
}

function displayLogs(logs: any[]) {
  if (logs.length === 0) {
    logsContainer.innerHTML = '<div class="log-entry">No logs available</div>';
    return;
  }
  
  const html = logs.map(log => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    return `
      <div class="log-entry ${log.level}">
        <span class="timestamp">${timestamp}</span>
        <span class="context">[${log.context}]</span>
        <span class="message">${log.message}</span>
        ${log.data ? `<br><span style="margin-left: 20px; color: #666;">${JSON.stringify(log.data)}</span>` : ''}
      </div>
    `;
  }).join('');
  
  logsContainer.innerHTML = html;
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Event listeners
refreshButton.addEventListener('click', loadLogs);

clearButton.addEventListener('click', async () => {
  try {
    await Logger.clearLogs();
    logger.info('Logs cleared');
    logsContainer.innerHTML = '<div class="log-entry">Logs cleared</div>';
  } catch (error) {
    logger.error('Failed to clear logs', error);
  }
});

exportButton.addEventListener('click', async () => {
  try {
    await Logger.exportLogs();
    logger.info('Logs exported');
  } catch (error) {
    logger.error('Failed to export logs', error);
  }
});

// Auto-refresh every 5 seconds
setInterval(loadLogs, 5000);

// Initial load
loadLogs();
