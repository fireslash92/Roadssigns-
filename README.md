# Road Sign Lens Pro v3.1 — Restored Edition

This fixes the v3 release's visual-regression issue by restoring the original midnight-blue/turquoise visual identity and prioritizing the camera on mobile screens. Full CSS is embedded in `index.html`, so an omitted `styles.css` file cannot by itself cause a bare, unstyled interface. The standalone `styles.css` is retained for developers. It also updates the PWA cache and keeps the v3 camera candidate detection, AI classification, GPS, review and exports intact.

## Deploy to your existing GitHub Pages repository

1. Download and **extract** the package. Replace ALL matching files at the **repository root** (not inside a new subfolder). At minimum upload `index.html`, `app.js`, `signs.js`, `detector.js`, `sw.js`, `styles.css`, icons, and manifest. **Do not upload the ZIP directly.**
2. Commit the changes on the branch selected under GitHub **Settings → Pages** (often `main / root`).
3. Open the published URL in Safari. Reload once after the updated site appears so the previous service worker can activate and remove its old cache. If Safari still shows a stale site, open Safari settings and clear the saved website data *after exporting your observations*, because local browser data may be lost.
4. Do not clear browser data casually; inventory is stored locally on this device and has not been synced to the cloud.

## Limits

AI recognition is not yet validated for Oman or safety-critical use. Candidate regions track in camera frames, while classification runs periodically. Phone GPS ≠ physical signpost location. Manually review sign type and pin before trusting the inventory. Safari HTTPS required for camera and geolocation. Do not use while driving.

Accessibility design target: WCAG 2.2 AA with skip links, focus states, keyboard forms, high contrast and reduced motion controls, bilingual Arabic RTL, list alternative for map; independent VoiceOver and real-device audit still needed.
