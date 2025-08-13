# Chrome Extension TypeScript Boilerplate

Minimal MV3 Chrome extension scaffold using TypeScript and esbuild.

## Features
- Manifest V3
- Background service worker (ES module)
- Content script
- Popup and Options pages (HTML/CSS/TS)
- TypeScript + chrome-types for autocompletion
- Single-file esbuild script with watch mode

## Scripts
- `npm run build` — build to `dist/`
- `npm run dev` — watch and rebuild on changes
- `npm run typecheck` — run TypeScript without emitting

## Load in Chrome
1. Run a build (dev or prod).
2. Open chrome://extensions.
3. Enable Developer mode.
4. Click "Load unpacked" and select the `dist` folder.

## Project structure
- `src/` — TypeScript sources (background, content, popup, options)
- `public/` — static assets copied verbatim (manifest, HTML, CSS, images)
- `dist/` — build output

## Notes
- Update `manifest.json` permissions and matches as needed.
- Background, popup, options, and content are bundled separately.
