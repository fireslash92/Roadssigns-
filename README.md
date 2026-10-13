# Road Sign Lens Pro v4.8 — Rapid Confirmation + Oman Dataset Builder

Direct-upload static GitHub Pages release. No npm install, GitHub Actions, server, or build pipeline. Upload the **contents** of this ZIP to the root of `fireslash92/Roadssigns-` (including `.nojekyll`), and select **Settings → Pages → Deploy from branch → main → /(root)**.

## What is new

1. **Quicker second confirmation:** When a tracked region already has one acceptable MobileCLIP classification, a follow-up is scheduled sooner. Balanced mode targets a minimum of ~1.7 seconds between AI scan starts after the first vote, adjusted upward for slow inference. The normal delay applies to initial searches. This does **not** guarantee a certain recognition rate on an iPhone; MobileCLIP may still take many seconds per inference.
2. **More forgiving track matching:** Candidate IDs survive modest handheld movement and up to a few missed frames, reducing repeated first votes. These are temporary image tracks, **not permanent signpost identities**.
3. **More colored signs:** The fast on-device region proposer now considers saturated yellow warnings and green direction panels as well as red, blue, and orange. This is a heuristic region proposal, not a validated AI object detector. False positives and missed signs are possible.
4. **Opt-in Oman dataset builder:** Below the camera, expand **Omani sign training examples**. While stationary, capture a frame, pick the **correct** sign type and drag a rectangle around it (or enter percentages), then **Save reviewed example**. The images remain in browser IndexedDB and can be downloaded as a ZIP containing JPEGs, YOLO text labels, `data.yaml`, and a manifest. The exporter intentionally does not include phone GPS. A separate training/validation split and representative annotated imagery are required before training a detector. The ZIP does not contain a trained Oman-specific model.

Existing features preserved: the MobileCLIP split-tower model, Safari WASM fallback, automatic GPS tagging and provisional map pins, short-window reacquisition protection, geospatial exports, accessible manual coordinate correction, camera-first midnight/turquoise design, Arabic/English, and locally saved inventory. No uploads to an application backend are made by this app; external hosting services are still used for AI models and basemap tiles.

## Install / deploy

1. Back up existing survey records (CSV or GeoJSON) before updating.
2. Extract `road-sign-lens-pro-v4.8-rapid-detection-no-actions.zip` and upload every root file into the repository root, replacing old files. Include `fast-survey.js`, `training-samples.js`, `sw.js`, and `.nojekyll`.
3. Keep **GitHub Pages → Deploy from a branch → main → /(root)**.
4. Open `https://fireslash92.github.io/Roadssigns-/` in Safari, confirm **v4.8** in the header, and reload after Pages publishes.
5. Allow GPS and camera only while stationary. Start automatic survey; hold a visible sign steady until classified twice. Compare with v4.7's time-to-save. Open the Map tab and inspect the *provisional phone-based* marker.
6. In the Training Examples section, capture a labelled image, correct the box in its editor, save, and export ZIP. Check ZIP contents on a computer before using them to train an object detector.

## Safety and accuracy limitations

- **The sign's exact location is not measured.** A pin represents the **phone's approximate location at observation time**, until corrected. Do not treat this as a surveyed post coordinate.
- **No Oman-specific detector has been trained.** Training requires a sufficiently varied collection of permission-cleared images with human-verified boxes and a held-out validation dataset. A browser app alone does not solve model training.
- MobileCLIP gives **relative similarities**, not calibrated probabilities. All automatic detections remain **pending review**. Color heuristics can misidentify backgrounds.
- Camera scanning runs only while the page is foregrounded; local records and optional training images are device-specific. Export and back up regularly. Do not operate a phone while driving.
- The initial recognition-model download is large and requires internet. The training image collection uses local IndexedDB and does not synchronize between phones.

## Verification and follow-up

- 15 Node unit checks cover color candidates, moving-track continuity, fast follow-up scheduling, bounding-box coordinates, YOLO label format, and ZIP generation.
- JavaScript syntax and structural file checks passed; generated sample ZIP passed CRC validation in Python.
- **Actual iPhone ML performance, camera layout, and storage-export behavior remain unverified here**, since the automated browser blocks local website navigation.

The next true detector-model milestone is to collect and annotate representative Omani sign frames, split by road or survey session, train a lightweight YOLO-style detector offline, evaluate it on unseen Omani roads, then export a quantized ONNX/WebAssembly-compatible runtime for Safari. Do not change the currently working MobileCLIP until the new model has measurable field accuracy.
