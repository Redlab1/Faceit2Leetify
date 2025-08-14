# Faceit 2 Leetify

Chrome extension that captures real Faceit demo download URLs and uploads them to Leetify with a single click.

## What it does
- Injects an "Upload to Leetify" button next to Faceit’s "WATCH DEMO" on match room pages.
- Listens to the actual demo file download (after you press "WATCH DEMO") to capture the signed URL Faceit generates.
- Submits that URL to Leetify via their public API.
- Persists the captured URL per match for a few minutes so you can upload shortly after download, even across SPA navigations.
- Adds a simple logs viewer (open from the popup) for debugging.

See examples and walk-throughs in EXAMPLES.md.

## Quick start
1. Build the extension.
2. Load it into Chrome as an unpacked extension.
3. Open a Faceit CS2/CSGO match room and click "WATCH DEMO" to trigger the download.
4. Click "Upload to Leetify". The extension submits the captured URL and confirms when done.

### Build
- npm run build — build to dist/
- npm run dev — watch and rebuild on changes
- npm run typecheck — type-check only

### Load in Chrome
1. Build (dev or prod).
2. Go to chrome://extensions.
3. Enable Developer mode.
4. Click "Load unpacked" and select the dist folder.

## Features
- Manifest V3 + TypeScript + esbuild bundling
- Background service worker (ES module)
- Content script with DOM injection and SPA navigation handling
- Popup with a "View Logs" shortcut to a logs viewer page
- Centralized logging to chrome.storage.local with export/clear

## How it works
- The content script watches for Faceit’s demo button and injects the extension button.
- When you click "WATCH DEMO", Faceit initiates a signed download; the background captures that URL via the downloads API and notifies the content script.
- The content script marks the button "ready" and stores the URL (scoped by match) for ~4 minutes to avoid expiration.
- Clicking "Upload to Leetify" sends the URL to the background, which posts to Leetify. It now retries on transient errors with exponential backoff and uses a 30s HTTP timeout.

## Permissions
- downloads: needed to detect demo download and extract the real URL
- storage: used to persist the captured URL/metadata and logs
- host_permissions: <all_urls> to ensure the signed demo URL requests can be made
- content_scripts: runs on Faceit match room pages

## Troubleshooting
- Upload fails right after download: The extension now auto-retries with backoff and a longer timeout. If it still fails, wait a moment and try again.
- 403/expired URL: Click "WATCH DEMO" again to get a fresh signed URL, then "Upload to Leetify".
- No button appears: Ensure you’re on a Faceit match room page (URL includes /room/). SPA navigation can change the DOM; the extension re-injects automatically.
- View logs: open the popup and click "View Logs" (opens logs.html). You can export logs to a file.

## Development
Project structure:
- src/ — TypeScript sources (background, content, popup, logs viewer, services)
- public/ — static assets (manifest, HTML, CSS)
- dist/ — build output

Notes:
- Options page was removed. If you see references to options, they’re legacy and should be ignored.
- Styling lives in public/content.css. Button states: default, .ready, .success.

## Privacy
The extension detects Faceit demo download URLs and sends them to Leetify when you click the button. Logs are kept locally in chrome.storage.local and can be cleared/exported from the logs viewer.

## License
MIT