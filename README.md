# Road Sign Lens Pro v4.4 — Phase 1.1
**Conservative accuracy and performance tuning, directly deployable to GitHub Pages.**

This is built on the user's previously working **v4.3** version. The existing navy/turquoise visual language, MobileCLIP split-tower AI model, ONNX/Safari runtime-source fallback, map tile fixes, sign records, exports, Arabic/English localization, and manual Analyze Now remain.

## New in Phase 1.1

1. **Image-quality indicator:** Auto-scans screen candidate crops for extremely low light, extreme glare, or almost no detail. Severe cases are skipped with a plain-language indication; **manual Analyze Now still works**.
2. **More conservative automatic suggestions:** The best sign must beat the runner-up and non-sign background labels. Two **recent consecutive matching results** on the same camera track are needed before an auto-save suggestion. MobileCLIP similarity scores are *not calibrated confidence probabilities*; the thresholds are heuristics, not accuracy guarantees. These stricter checks can cause missed signs.
3. **Adaptive scan pacing:** Settings → Camera performance → Responsive, Balanced (default), Battery saver. CPU-heavy region analysis automatically slows the next pass instead of increasing device load. Inference duration is measured without counting initial AI model download time.
4. **On-screen diagnostics:** Camera image quality, approximate region-processing milliseconds, AI-pass milliseconds, and severe-quality skipped-frame counts.
5. **Reviewer feedback:** Each new AI suggestion retains its original suggested type. If an inspector changes the sign type and marks the observation reviewed, the system stores that correction. Settings → Field validation shows how many *reviewed* AI suggestions were unchanged or corrected and exports a CSV **without coordinates or photos**. This is reviewer agreement on a selected subset, **not measured real-world model accuracy**.
6. **Backward-compatible exports:** GIS and CSV records include optional suggestion and review timestamps. Previous survey data is read from the same browser storage keys.

## Installation — no GitHub Actions

1. **Export your existing sign inventory before upgrading.** Keep the backup.
2. Extract `road-sign-lens-pro-v4.4-phase1.1-direct-upload.zip` and upload the CONTENTS to the repository root of `fireslash92/Roadssigns-`, replacing existing files. In particular, upload **`scan-quality.js`** and **`recognition-policy.js`**, alongside all existing JavaScript files.
3. GitHub repository → Settings → Pages → **Deploy from a branch** → `main` → `/(root)`.
4. After publishing, visit `https://fireslash92.github.io/Roadssigns-/` and verify the header says **v4.4**. Keep existing Safari website data; don't clear storage.
5. On a stationary survey, open Camera → Start camera → Prepare AI (or enable automatic preparation in settings). Use Settings → Camera performance to select a profile; start with **Balanced**.
6. Optional: review identified signs, change the sign type if needed, mark reviewed after checking the location, and download a Field validation CSV.

## Field test (essential before production)

For a stationary test, try at least 20 known Omani traffic signs with a variety of backgrounds, distances, angles, light levels, and no-sign scenes. Note time from camera startup to first valid match, number of correct and wrong suggestions, missed signs, battery/heat observations, and GPS accuracy. Inspectors should manually verify **every** proposed sign and map location.

Do **not** operate a camera or phone while driving; this is not an ADAS safety aid. The GPS fix is the **phone's** position, not the signpost's exact position.

## Verification

- JS module parse: `node --check app.js`, plus additional new modules.
- Automated tests: `node --test tests/*.test.mjs`. **31 passing tests** on the developer machine, including seven original ONNX runtime selection checks.
- Static checks: no missing HTML IDs, missing module files, or duplicate IDs.
- **Not verified:** live iPhone camera operation, live ONNX model download/startup, actual accuracy on Omani signs, sustained mobile frame rate, full WCAG 2.2 AA conformance, or this update's production GitHub Pages deployment. Browser automation of local websites was blocked by the test environment.

## Design and privacy

- No backend, no login, no account syncing, no photo uploads introduced by this update.
- Model components and map tiles still need network access to their existing external providers when not cached.
- Signed-in devices are not synced; inventory remains in browser localStorage. Export often.
- Live performance metrics are session-only; reviewer corrections persist alongside sign records in browser storage.

## Technical files

`index.html` UI and styles; `app.js` integration; `scan-quality.js` light/texture and adaptive schedule; `recognition-policy.js` conservative classification and review summaries; `detector.js` proposals and GIS export; `tracking-engine.js` temporal tracks; `mobileclip-engine.js` unchanged split-tower AI; `wasm-runtime.js` unchanged Safari runtime fallbacks; `sw.js` release cache version.
