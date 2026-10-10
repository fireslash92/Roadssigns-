# Road Sign Lens v2 — camera recognition + GPS mapping

A mobile-first bilingual English/Arabic static web application. It identifies a **single centered sign** using the experimental `Xenova/mobileclip_s0` zero-shot image classifier via Transformers.js, then optionally logs the phone's location at the time of a camera scan.

## New in v2

- **Map** tab using Leaflet 1.9.4 and © OpenStreetMap map tiles. A detected sign with GPS is shown as a map pin.
- **GPS tagging** opt-in: tap **Enable GPS tagging** under the camera. Grant Safari's precise location permission for best results. The app records the *phone's GPS location*, not the surveyed position of the road sign.
- **Manual correction**: Map → choose a scan → Adjust on map → tap where the sign actually stands. You can add positions to photos and scans recorded without GPS.
- **GPS accuracy** displayed in metres when provided by the device.
- **GeoJSON, CSV, KML** export of mapped observations, usable in mapping/GIS applications, including QGIS and Google Earth. GeoJSON follows longitude/latitude ordering.
- **Persistent scan records** in this browser's `localStorage` (up to 500). No cloud database. Clearing browser site data deletes history and map pins.
- **De-duplication** when continuous scanning sees the same sign type within ~35 m in a 90-second window. Manual scanning saves each observation.

## Deploy to GitHub Pages

1. Create a public repository, such as `road-sign-lens`.
2. Upload all files from the *root of this ZIP* to the root of the default `main` branch (`index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, and the two PNG icons). **Do not upload just the ZIP.**
3. Repository → Settings → Pages → Deploy from branch → `main` / `(root)` → Save.
4. Open `https://YOUR_USERNAME.github.io/road-sign-lens/` in Safari and authorize **Camera** and optionally **Location**. You can use Share → Add to Home Screen.

## Deploy to Vercel

Upload this directory to a GitHub repository, import that repository into Vercel, and deploy the static site. Framework preset: Other; no build command; output directory: root. Or use another HTTPS-capable static host.

## Privacy and accuracy notes

- Camera and geolocation APIs require a secure HTTPS context (or localhost). Photo recognition and GPS collection stay in the browser; no dedicated recognition backend receives the sign photos.
- The AI model and WASM components download from remote services when first used, and Leaflet and tiles load from public CDN/OpenStreetMap services. Those providers will receive ordinary network requests, including map tile requests corresponding to the map area displayed.
- **Location is an observation from the phone, not the actual sign's coordinates**. GPS accuracy may be poor, particularly in vehicles or near buildings; manually correct the pin if needed. All records are unverified until reviewed.
- **Uploaded photos are not automatically geotagged**, as the current phone location may differ from where the photo was taken. Add or correct a pin manually in Map.
- Sign matches are experimental relative similarity classifications, **not verified confidence probabilities**. The system cannot reliably OCR speed numbers, detect every road sign in a scene, or guarantee Omani sign support. Do not use while driving or for road safety decisions.
- The site's local storage is per browser/device and is **not synchronized to GitHub**; export data regularly if needed.
- OpenStreetMap tile data © contributors, ODbL; attribution appears in the map. Avoid heavy automated tile downloads.

## Source files

- `index.html`: static layout and interface
- `styles.css`: responsive styling
- `app.js`: classification, GPS, map, and exports
- `manifest.webmanifest`: Add-to-Home-Screen metadata
- `icon-192.png`, `icon-512.png`: site icons
