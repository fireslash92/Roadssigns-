# Road Sign Lens Pro v4.1 — Phase 1: Live camera tracking

**Deploy directly to GitHub Pages (main / root). No GitHub Actions, npm, or build step.** Upload the *contents* of this folder (not the ZIP), replacing files from v4.0. Preserve your browser data by not clearing Safari website storage.

## What's new
- Camera candidate boxes update roughly every 320 ms while the page is active; actual frame rate depends on hardware.
- Temporary track IDs, live track/analysis/confirmed counters and bilingual status messages.
- Individual candidate crops classified repeatedly with the proven MobileCLIP split-tower engine.
- Automatic logging requires at least two agreeing results for the same active track, each on a separate scan. Saves are provisional pending review; relative AI scores are **not calibrated confidence**.
- Optional `Xenova/yolos-tiny` COCO object detector (about 10 MB quantized download), which only contributes bounding boxes for the COCO **Stop sign** category. Disabled by default to protect iPhone memory, network and battery. Color proposals remain available for other signs. First enable camera, then toggle it on.
- Existing records/GPS map/Arabic-accessibility and working MobileCLIP loader remain intact.

## Limitations and safety
- This is a browser prototype, not a traffic safety device or a calibrated road asset survey instrument. Stop-sign detector may not work on all Omani signs. Color-based proposals can miss signs without distinct red/blue/orange regions. Auto logs are provisional, and GPS coordinates are the **PHONE location**.
- Do not operate the phone while driving. Use while stationary or by a passenger.
- Camera processing stops when the page is hidden. Optional detector might load slowly on iOS and hasn't been hardware-validated. App is not guaranteed to detect every sign and cannot estimate exact post position from one phone GPS fix.
- Additional downloaded model weights, map tiles and JS are sourced from Hugging Face and other third-party services. Stored records remain in localStorage.

## How to verify
- Open the site on Safari over HTTPS and Start camera → Prepare AI (if needed).
- Point camera at a stationary visible sign. Yellow boxes mean **possible region**; green box with name means **two matching model results on the same temporary track**.
- Observe 'AI passes' and 'Confirmed this session'; if auto-save is on, suggestions go to Records pending review.
- Enable optional detector only if needed; leave it off if performance drops.

## Tests
`node --experimental-default-type=module --test tests/*.test.mjs`

## Deployment
Upload root files to https://github.com/fireslash92/Roadssigns- then GitHub Settings → Pages → Deploy from a branch → main → / (root). The service worker cache name was bumped to v4.1.
