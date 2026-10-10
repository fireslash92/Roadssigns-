# Road Sign Lens Pro v3.0 — accessible traffic sign field survey

**Status:** functioning mobile-first research / field-survey prototype, **not** a validated road-safety or asset-survey product. Prepared for GitHub Pages and Safari. UI flows and core geometry are tested; live iOS camera/GPS, remote model, Omani road-sign accuracy, and complete WCAG conformance require field validation.

## What is implemented

- **Live camera candidate tracker:** the rear-camera view is analyzed about 3 times/sec using local color/shape region proposals and lightweight overlapping-frame IDs. These IDs are temporary screen-region IDs, not persistent physical asset identifiers. Green boxes mean **possible** signs, not confirmed objects.
- **Asynchronous sign type suggestions:** a browser-based `Xenova/mobileclip_s0` zero-shot vision model (Transformers.js) classifies up to two candidate crops at a time against the 25 sign types provided. It loads on first use and can take time on Safari. Semantic inference is throttled to roughly 3.5/6/10 seconds, **not** video-frame-rate recognition. The result scores are *relative similarities*, not calibrated confidence.
- **Record capture:** continuous recognition can create provisional inventory records. Automatic duplicate throttling reduces repeated detection of the same class at nearby phone locations within 15 minutes (or 45 seconds if neither record has GPS). Choose to turn off automatic saving and accept the suggested sign manually.
- **GPS survey:** opt-in geolocation with accuracy reading and freshness check. The saved GPS point is the **phone location**, not the signpost. Correct the real signpost position by typing precise lat/lon or tapping the map. Photo uploads deliberately do not inherit the current location.
- **Review workflow:** mark records as reviewed only after assigning coordinates, edit sign type, road/landmark, sign condition, pole condition, notes, delete individual observations; statistics and review statuses update.
- **Sign map:** Leaflet/OpenStreetMap pins, visual review status legend and **keyboard-friendly, screen-reader-readable list alternative**. The map itself needs network access to load the external library/tiles.
- **GIS exports:** GeoJSON including unlocated records with `geometry:null`, CSV with BOM for Excel, or KML for located signs (Google Earth/QGIS). GeoJSON uses WGS84 `[longitude, latitude]`.
- **Mobile PWA:** Add to Home Screen, responsive desktop/mobile layout, service-worker app-shell caching, automatic camera shutdown when backgrounded, localized English/Arabic, and migration of v2 browser records.
- **Privacy:** no account and no application-owned server; camera pixels and inference run locally once the model downloads; records live in browser `localStorage` (capped at 650 entries). Third-party AI/CDN requests and OSM tile requests are used. No sign photos are retained with records. Export frequently; clearing browser site storage removes data.

## Publish through GitHub Pages

1. Download the ZIP and **extract** it. Do not upload the ZIP itself to the GitHub repository.
2. Create a public GitHub repository, such as `road-sign-lens`.
3. Upload the files from this package root into the repository root (`index.html`, JS files, CSS, icons, manifest, service worker, etc.).
4. In **Settings → Pages**, select **Deploy from a branch** → `main` → `/ (root)`, then Save.
5. Wait for deployment; open `https://YOUR_USERNAME.github.io/road-sign-lens/` in **Safari** on an iPhone.
6. Allow the camera. For GPS survey records, enable GPS and allow Precise Location. Use **Share → Add to Home Screen** if desired.

Secure `https://` (or `localhost` during development) is required for Safari camera/geolocation access.

## Model and technical limits

The present classifier is *not* a detector trained specifically for Omani road scenes. The color region proposal fails for some uncolored/low-contrast/distant signs; other colored objects can create false proposals. Speed-limit digits are not OCR-verified. It cannot measure the physical signpost location or orientation from a single camera/GPS reading. A low score must not be interpreted as confidence or used for regulatory enforcement.

**To move to production:** collect and label representative Omani signs; train and validate a dedicated multi-class **object detection** model (e.g. YOLO optimized to ONNX/Core ML, subject to licensing) with an evaluation set containing day/night/glare/occlusion; calibrate precision/recall, hard negatives, and confidence thresholds; implement frame-to-frame object IDs with optical-flow or object tracking; support measured signpost positions via surveyed GNSS or multi-view triangulation; build encrypted role-based synchronization/audit logs, admin moderation and secure evidence storage; perform real-device battery, heat, GPS and WCAG 2.2 AA audits.

Do **not** hold or operate the device while driving. Survey only while stopped or when safely operated by a passenger/field worker.

## Accessibility (W3C / WCAG)

**Target: WCAG 2.2 AA. Not a certification.** Current design includes semantic landmark regions, skip to content, descriptive visible labels, focus indicators, approximately 44px touch controls, Arabic RTL, ARIA live status alerts, high contrast toggle, text enlargement, reduced motion, native dialog editing, status labels beyond color, keyboard accessible list-based map alternative and manual coordinates when map is inaccessible. Independent automated and manual WCAG/VoiceOver/keyboard testing still required.

## Structure

| File | Responsibility |
|---|---|
| `index.html` | Accessible five-section UI and edit form |
| `styles.css` | Desktop/mobile layout, contrast and motion preferences |
| `signs.js` | Bilingual traffic sign metadata/prompts |
| `detector.js` | Browser-friendly sign-shaped region proposal, geo distance/dedup, GeoJSON |
| `app.js` | Cameras, AI classification, GPS, maps, storage, reviews, exports, localization |
| `sw.js` | Offline app-shell cache (not offline AI/map tiles) |
| `manifest.webmanifest` and icons | Installable PWA |
| `tests/detector.test.mjs` | Small automated unit test suite |

Use `python -m http.server 8080` and open `http://localhost:8080` on a development computer. Or run `npm test` (Node 20+) for pure detector unit tests. Actual iPhone testing needs HTTPS.

Attributions: © OpenStreetMap contributors; Leaflet MIT license; Transformers.js/Hugging Face model subject to their respective terms and licenses.
