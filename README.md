# Road Sign Lens Pro v4.2 — Faster Repeat AI Startup

Deploy by uploading the **contents of this folder** to the GitHub Pages repository root.
**No GitHub Actions, build step, Vercel, Node.js, or npm are required to deploy.**

## What changed
- **IndexedDB vocabulary cache**: after the first successful preparation, saves only the 27 normalized MobileCLIP text vectors (road-sign descriptions + exclusions). On later launches with identical descriptions, it skips loading the 43 MB text model and skips recomputing its embeddings. The full image/vision model still has to initialize on every new page session.
- The Transformers.js **Cache API** and ONNX WASM cache are enabled when supported, to reuse downloaded model files and WASM dependencies.
- Optional checkbox: **Prepare AI automatically when I open the app**, under Survey readiness. It starts preparation when the website opens; switch it on only if desired. It may use cellular data if the browser has cleared its downloaded files.
- A visible `Ready in Xs` indicator measures current AI startup time and reports whether saved descriptions were reused.
- AI diagnostic report now includes cached vocabulary and startup duration.
- Original live camera tracking, working split-tower MobileCLIP, map CSS fix, inventory, sign types, Arabic/English, and accessibility are otherwise unchanged.

## What to expect
The first-ever launch **still downloads substantial AI files** and calculates sign vectors, and may be slow. The second launch should be faster if Safari has retained its model cache and IndexedDB storage. Safari can evict its cache during storage pressure, and the vision model still takes time to load into memory. No speed claim can be guaranteed without field measurement. On-device AI is not instant, especially on a cellular connection.

## Deployment
1. Download the ZIP; extract it, and upload all extracted site files to `https://github.com/fireslash92/Roadssigns-` in the repository root. Include `vocabulary-cache.js`.
2. Use **Settings → Pages → Deploy from a branch → main → /(root)** (no Actions).
3. Open `https://fireslash92.github.io/Roadssigns-/` on iPhone; reload if the old JS remains.
4. Tap **Prepare AI** once and wait for **Ready**. Close/reopen the page and prepare again to compare warm launch time. Optionally enable auto preparation for future launches.
5. Your saved inventory stays in the same browser `localStorage`; **do not clear Safari website data**. Export your records before updating as a precaution.

## Safety and limits
- Camera images and GPS are processed locally; the app still downloads ML assets from Hugging Face and CDNs.
- Cached label vectors contain **no photos, sign detections, GPS or personal data**.
- Do not operate while driving. Observations are provisional and locations are phone GPS positions, not measured signpost positions.

## Internal checks
`node --experimental-default-type=module --test tests/*.test.mjs` when testing in a Node environment; tests are not required for GitHub Pages deployment.
