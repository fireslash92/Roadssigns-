# Road Sign Lens Pro 3.3 — Safari AI library import repair

**This is a source-code GitHub Pages project that MUST be built by GitHub Actions.** Do not host the unbuilt `index.html` using "Deploy from a branch": its AI engine imports require a Vite build.

## Why the previous version failed
v3.2 asked Safari to `import()` the Transformers.js library from jsDelivr at runtime. iOS can fail to fetch or execute third-party JavaScript modules, reporting a module-import error. This version packages Transformers.js with the website and also publishes ONNX Runtime's supporting JavaScript / WASM files on the same GitHub Pages domain. Only the AI model weights are fetched separately from Hugging Face on first use.

## Deploy to the existing website
1. Export any survey records you care about from the existing live site before changing deployment settings (this update uses the same localStorage key, but browser clearing is irreversible).
2. Extract this ZIP locally and upload **all its contents, including the hidden `.github/` folder**, into your `fireslash92/Roadssigns-` repository root. GitHub's web uploader may not preserve hidden folders from some file-pickers; verify `.github/workflows/deploy.yml` is present on GitHub afterward.
3. In **GitHub → Roadssigns- → Settings → Pages → Build and deployment → Source**, choose **GitHub Actions** (NOT "Deploy from a branch").
4. Open the repository's **Actions** tab and confirm that **Build and publish Road Sign Lens** succeeds. If no run starts, run `workflow_dispatch` manually (Actions → workflow → Run workflow).
5. Open https://fireslash92.github.io/Roadssigns-/ in Safari. Refresh after the new deployment. Tap **Prepare AI** while connected to Wi-Fi.

## Design & behavior
- Preserves v3.1 visual layout, camera and photo input, GPS mapping, inventory, accessibility options, and GIS exports.
- AI library and ONNX compute files load from your GitHub Pages site. The MobileCLIP model **still downloads from Hugging Face**, can be tens of MB, and may require Wi-Fi. A blocked or unsuccessful model fetch can still prevent recognition.
- AI startup errors are separated into `module` and `model` stages. If AI fails, tap **Copy details** and share the diagnostic message; the app still supports manual observations.
- AI sign types and phone GPS locations are provisional and require review. Not a driver assistance system or a field-validated Omani sign detector. Never use it while driving.

## Local development
`npm install && npm run dev` (in local development the ONNX assets copied by `npm run build` are not necessarily available; use `npm run build` then `npm run preview` to test a full setup.)

## Verification scope
Source syntax + geometry tests can be checked without downloading model weights. Production GitHub Actions build and actual iPhone Safari recognition are not verified in this environment, and should be tested on the deployed site.
