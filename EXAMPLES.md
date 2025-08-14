# Examples and Walkthroughs

## 1) Basic flow: capture + upload
- Go to a Faceit match room, e.g. `https://www.faceit.com/en/cs2/room/<match-id>`.
- Click "WATCH DEMO" to trigger the download.
- The extension captures the signed URL and marks the "Upload to Leetify" button as ready (shows a ✓ in the label).
- Click "Upload to Leetify". You should see a success toast and the button briefly shows "Uploaded!".

Notes:
- The captured URL is stored for ~4 minutes for the current match. After that, the URL may expire.

## 2) SPA navigation: return to a match room
- Navigate away (e.g. to a player page) and back to the same room.
- The extension reloads captured data for the current match (if still fresh) and re-injects the button.

## 3) Early upload failures (timeouts)
- Immediately after a download, Leetify can occasionally time out.
- The background now retries up to 4 times with exponential backoff and a 30s timeout.
- You generally don’t need to re-click; a single click will auto-retry in the background.

If it still fails:
- Wait 15–30 seconds and try again.
- If a 403/expired signature error appears, click "WATCH DEMO" again to refresh the URL.

## 4) Logs viewer
- Open the popup and click "View Logs".
- Use the page to refresh, clear, or export logs.

## 5) Styling and states
- Button lives next to Faceit’s "WATCH DEMO" and mirrors its style.
- States:
  - default: disabled-looking caption until a URL is captured
  - ready: after download; title includes the demo filename
  - success: after a successful upload; resets automatically

## 6) Known limitations
- Signed URLs can expire quickly. If too much time passes, you must click "WATCH DEMO" again.
- If Faceit changes DOM structure or class names, the injector may need tweaks (selector still looks for the visible text "watch demo").
