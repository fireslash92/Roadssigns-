# Road Sign Lens Pro v3.2 — AI Readiness UX Fix

## What changed
- The previous "AI: not loaded" label was misleading: it was an intentional lazy-load standby state, **not** proof of failure.
- New clear states: **Standby → Loading → Ready**, or **Unavailable** with a helpful reason and Retry AI button.
- **Prepare AI** starts model download without needing camera permission. Starting the camera in continuous recognition mode or selecting a photo also starts preparation automatically.
- Progress display during download and 60-second cooldown for failed background retries.
- Preserved the restored dark-blue/turquoise design, mapping, GPS, inventory and exports.
- Revisions do not guarantee model compatibility with every version of iOS Safari; this needs real-device testing.

## Use with GitHub Pages
Extract ZIP and replace files in the **repository root**. Commit to the Pages branch, refresh Safari after deployment (old service workers may cache v3.1).

On first use: allow internet access to download the AI model. The browser fetches transformers.js from jsDelivr and the MobileCLIP model from Hugging Face. On iOS Safari the model may exceed device memory or the download may be blocked by network settings. Use **Retry AI** after fixing the issue, or continue entering signs manually. Do not use while driving.

The recognition engine is experimental and not yet calibrated or field-validated for Omani signs. Phone GPS describes the device's location, not the signpost's surveyed coordinates. Review all AI suggestions and pins.
