# Road Sign Lens Pro v3.8 — split-model repair (no GitHub Actions)

## What actually caused the failures
The app previously used `pipeline('zero-shot-image-classification', 'Xenova/mobileclip_s0')` which attempted to download `onnx/model_quantized.onnx`. That filename does not exist in this repository. It publishes separate text and vision towers.

v3.8 explicitly loads:
- `onnx/text_model_quantized.onnx` (`CLIPTextModelWithProjection`, q8, approximately 43 MB)
- `onnx/vision_model.onnx` (`CLIPVisionModelWithProjection`, fp32, approximately 46 MB)

It then computes text embeddings **once**, compares those vectors to the live camera/image frames, and avoids the generic zero-shot pipeline. This is based on the model publisher's usage example.

## Deploy to the same GitHub Pages URL — no Actions
1. Export current survey records from the app first (browser storage is preserved by updates but you should have a backup).
2. Unzip this archive. Upload **the individual extracted files** to the repository root, including `mobileclip-engine.js`, `app.js`, and `sw.js`. Replace older files.
3. In GitHub repository Settings > Pages use **Deploy from a branch**, `main`, `/ (root)`.
4. Allow the normal Pages publication to finish, then open https://fireslash92.github.io/Roadssigns-/ . In Safari refresh/reopen the page.
5. Tap **Prepare AI** while connected to Wi-Fi. First download is roughly 90 MB plus runtime assets. GPS and manual inventory work independently.

If AI fails, use Copy details; the error report includes the exact requested file and init stage.

## Notes and limitations
- No GitHub Actions, npm, Vercel, or build step. Source is static ES modules, with the Transformers.js library and ONNX model assets downloaded over HTTPS at runtime.
- Real-device iOS Safari/Chrome success and sign recognition accuracy are **not yet verified**. Downloads, ONNX WebAssembly and memory can fail independently. The core bug (nonexistent model filename) is specifically corrected.
- Inferences are similarity rankings across 25 categories, **not** an audited Omani traffic-sign detector. For field surveys, verify every observation and correct phone GPS coordinates to the actual sign location. Do not operate while driving.
- No changes to the design, local record storage key or existing navigation.

Official model: https://huggingface.co/Xenova/mobileclip_s0 .
