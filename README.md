# Road Sign Lens Pro v3.5 — No GitHub Actions required

This is an **upload-ready, static website** for your existing GitHub Pages repo. Do not upload the ZIP as a file; **extract** it and upload the files inside.

## Deploy in GitHub's web interface

1. Open https://github.com/fireslash92/Roadssigns- and select **Add file → Upload files**.
2. Extract `road-sign-lens-v3_5-no-actions.zip`. Upload **index.html, app.js, detector.js, signs.js, sw.js, manifest.webmanifest, both PNG icons, and .nojekyll** to the **root** of the `main` branch, replacing the old files with the same names. `.nojekyll` is optional for this version.
3. Go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch**, **Branch: main**, **Folder: / (root)**. Save.
4. After GitHub Pages publishes, open https://fireslash92.github.io/Roadssigns-/ in Safari and tap **Prepare AI**.

**Important:** Removing the old `.github/workflows/` directory is optional. Branch publishing does not need Actions. If the repository still has an old deploy workflow enabled, disable it to avoid confusing deployments.

## AI loading and limitations

Unlike v3.4, this build has **no bare NPM import**, no Vite config, and no build requirement. It downloads Transformers.js from available CDN sources (first esm.sh, then jsDelivr, then unpkg), and downloads MobileCLIP weights from Hugging Face. Internet access is still required for first use and service restrictions may prevent loading. If all CDN sources fail, **Copy details** will list the attempted sources. This approach cannot guarantee recognition on Safari; a *fully self-hosted* AI build would require bundling dependencies elsewhere and uploading its output.

The AI is a general zero-shot image classifier, not a road-sign-specific field-validated detector. Treat its predictions as provisional. Phone GPS marks the phone location, not the exact sign location. Manual correction and inventory review are available. Do not use the application while driving.

## Preserve records

The app uses the existing `road-sign-lens-pro-v3-records` localStorage key. **Export records before upgrading**, and avoid deleting Safari website data while testing. A new domain or browser will not share the saved records.

## Included files

- `index.html` — complete responsive interface and embedded styling
- `app.js`, `signs.js`, `detector.js` — scanning/AI initialization and inventory logic
- `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png` — home-screen/offline shell assets
- `.nojekyll` — GitHub Pages static hosting marker

Tests cover code syntax, existing detection/data tests, basic local static file serving and linking. Real iPhone model initialization is not verified in this environment.
