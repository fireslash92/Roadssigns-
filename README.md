# Road Sign Lens Pro v4.5 — Phase 2: Intelligent GPS Mapping

**Direct GitHub Pages release. No GitHub Actions, build steps, npm installation, or account sign-in.**

Version 4.5 extends the v4.4 Phase 1.1 codebase. It retains the MobileCLIP split-tower model and the Safari ONNX/WASM runtime provider fallback **without changing those AI files**, and retains the familiar navy/turquoise design and Leaflet map tile layout fixes.

## What's new

1. **GPS freshness and quality gate:** When GPS is enabled in Survey, the app tracks recent phone fixes in memory. GPS readings older than 20 seconds or reporting horizontal accuracy worse than 75 metres are *not attached automatically* to sign observations. These records still appear in inventory as provisional **unmapped** observations; they are not discarded.
2. **Location choice for stationary field surveys:** For a stable phone position, a recent more accurate GPS reading can be selected. If the phone has moved, newer position is preferred instead of snapping back to an older fix. This is a practical heuristic, **not a precise surveying solution**.
3. **Phone location vs. sign location:** The Map shows a blue phone dot and translucent accuracy-radius circle, separate from signpost markers. A blue circle shows the reported uncertainty of the **phone**, not the actual signpost location.
4. **Pin correction workflow:** The Map's accessible list provides **Review** and **Correct pin** for each mapped observation. Correct pin → tap the map → inspect and save in the editor. You can cancel before saving. Manual latitude/longitude editing remains available if Leaflet or map tiles fail.
5. **Location provenance and review safeguards:** Phone-derived, map-corrected, and manually entered coordinates are distinct. When a previously reviewed observation's position changes, its review status resets to pending. Map corrections preserve an optional reference to the original phone GPS location instead of reusing phone GPS accuracy for the corrected sign location.
6. **Export improvements:** GeoJSON and CSV include positioning source, capture timestamp, optional original phone-position metadata, and provisional/review status. KML remains available.
7. **Map UX:** One-tap **Fit sign pins**, automatic initial centering on an available current fix or mapped observation, and clearly worded fallback/quality messages. Bilingual labels and accessible text list remain.

### Important limitation

A typical phone's geolocation API reports where the **phone** is, not where a roadside signpost stands. Do **not** interpret GPS accuracy ±10 m as an accuracy measurement for a sign across the road. Map tap correction is based on a human's estimate unless verified by proper surveying. AI recognition and signpost geolocation must be field-validated.

### Privacy and data

- GPS permission is requested only when you choose to enable GPS or center the map on yourself.
- Short-term GPS samples are **kept in memory**, not uploaded or retained as a movement trail.
- Sign observation coordinates are stored in the same existing browser localStorage key (`road-sign-lens-pro-v3-records`), with backward-compatible optional location fields.
- Sign observations and saved metadata remain on the device. Existing records are not deleted by the update; export a backup before uploading the new website files.
- Network access is still required for initial AI models, ONNX runtime helpers, and online map tiles.
- Scans are intended for stationary use. **Do not operate the app while driving.**

## Publish without GitHub Actions

1. In the existing app, export a GeoJSON or CSV backup of your observations.
2. Extract the ZIP. Upload its website files and new **`geo-survey.js`** to the repository root of `https://github.com/fireslash92/Roadssigns-`, replacing the older files. Upload `index.html`, `app.js`, `detector.js`, `sw.js`, and all other JavaScript modules as well. Do not upload the ZIP as one file.
3. GitHub → **Settings → Pages → Deploy from a branch** → `main` → `/(root)`.
4. Wait for publication, then visit `https://fireslash92.github.io/Roadssigns-/` and confirm that **v4.5** appears. Retain Safari's website data.
5. Stationary test: **Survey → Enable GPS → Start camera**; then open **Map → Fit sign pins**. Try **Correct pin** for an observation; inspect the coordinates and save. Confirm reviewed status and exported data.

## Verification performed

- Static JS syntax checks for every local `.js` module.
- **13 automated unit tests** for location validation, freshness and accuracy, position selection, correction provenance, and GIS serialization; all pass in the build environment.
- HTML DOM ID/reference checks: no missing referenced IDs or duplicate IDs; local ES module imports are present.
- Not verified here: iPhone Safari location permission handling, map tile downloads, tap-to-place interactions, live AI initialization, actual road sign coordinates, real-world GPS performance, or complete WCAG conformance. This build environment blocked browser-based local previews.

**No GitHub Actions are required.** Existing AI recognition, live tracking, map tile CSS, and the runtime-source recovery approach from v4.3 are preserved.
