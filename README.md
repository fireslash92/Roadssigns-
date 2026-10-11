# Road Sign Lens Pro v4.3 — Safari ONNX Compute-Runtime Compatibility

This is a minimal fix on top of v4.2. The **original navy/turquoise design**, camera tracking, saved MobileCLIP sign vectors, GPS, map, sign library, and inventory remain. The error addressed is:

`no available backend found. ERR: [wasm] TypeError: Importing a module script failed.`

That message is a failure to initialize the ONNX WebAssembly **compute engine**, not a missing MobileCLIP model filename.

## No GitHub Actions required

1. Download and extract the ZIP.
2. Upload ALL files from the extracted folder to the **root** of `fireslash92/Roadssigns-` (especially `wasm-runtime.js`). Replace existing files. **Do not upload the ZIP as a single file.**
3. Leave GitHub **Settings → Pages → Deploy from a branch → main → /(root)**.
4. After Pages updates, open `https://fireslash92.github.io/Roadssigns-/` and look for **v4.3** in the header.
5. Select **Prepare AI**. If the compute engine still fails, use **Try another runtime (reload)**; this reloads the page and changes the runtime CDN. Try again. There are four candidate sources.
6. If all sources fail, select **Copy details** and send its `ONNX runtime source`, `ONNX attempts`, and the full error fields.

## What changed

- Verifies an ONNX Runtime **JavaScript module** before initializing the text model.
- Uses a matching version of `ort-wasm-simd-threaded.mjs` and `ort-wasm-simd-threaded.wasm`, with explicitly configured URLs (Transformers.js v3.8.1 / ORT Web 1.22.0).
- Tries alternative runtime CDNs, including a preference that persists **within the browser tab** for retries.
- Removes aggressive `useWasmCache` prefetching; **browser model caching remains enabled**.
- For ONNX startup failures, the retry button rotates the runtime source and reloads, avoiding already-rejected ONNX initialization promises in the current page.
- The cache version and `app.js` query have been bumped, reducing risk of old code being reused.
- Improves error explanations and detailed diagnostics.

## Limits

- **Not a self-contained/offline runtime**: the first AI initialization still needs the network to reach an ONNX source and Hugging Face model files. CDNs may be blocked or fail on some mobile networks; selecting another source is a mitigation, not a guarantee.
- A successful preflight check confirms only that a runtime helper *imports*. It does not prove that the WASM binary initializes or that inference completes. These require a real iPhone test.
- This package has not been deployed to your repository or field-tested on your iPhone.
- Survey records remain in the unchanged `road-sign-lens-pro-v3-records` browser storage key; never clear website data to troubleshoot. Export records first as a precaution.
- Do not survey while driving. The app's GPS shows the phone's location, not the signpost's precise location.

### Technical reference

Hugging Face Transformers.js v3.8.1 custom usage: https://huggingface.co/docs/transformers.js/v3.8.1/en/custom_usage

ONNX Runtime Web deployment: https://onnxruntime.ai/docs/tutorials/web/deploy.html

Internal test: `node --test tests/wasm-runtime.test.mjs`. Tests are **not required** to deploy via GitHub Pages.
