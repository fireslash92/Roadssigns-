# Road Sign Lens — prototype v1.0

Mobile-first English/Arabic Progressive Web App (PWA) for *experimental* recognition of traffic signs with the phone camera or a photo.

## Features
- Rear-phone-camera viewfinder with focus square and manual capture
- Continuous scan option (approximately every 5 seconds, only when page active)
- Upload a road sign image from gallery; on-device resizing/cropping
- English/Arabic interface and road sign meanings
- Road sign guide (25 common categories) and local scan history
- Installs on iPhone Home Screen once served from an HTTPS website
- No account, API key, backend prediction service, or photo upload needed

## Important limitations
- **Prototype / learning only. Do not use while driving or for navigation.** A passenger may use it only when safe; ideally inspect signs when stationary.
- It classifies the **center crop of one sign**. It does not find or box traffic signs anywhere in a complex road scene.
- Uses **MobileCLIP S0** zero-shot image-text matching; not fine-tuned for Oman road signs. Incorrect matches are possible even when a top result appears clear.
- Similarity scores are *not calibrated confidence probabilities*. The app intentionally omits numeric percentages.
- It cannot reliably read speed limit digits, damaged signs, Arabic sign text, or unusual Oman-specific signs. Always read the actual sign.
- The first AI download requires internet, a CDN, and Hugging Face model access. Downloads may be tens of megabytes and run slowly or fail on memory-limited devices. Later loading may be cached by browser but full offline AI use is not guaranteed.
- Browser camera access requires **HTTPS** (or local `localhost`); opening `index.html` directly as a file may allow photo upload but not the camera.
- Photos are converted and analyzed locally by browser JavaScript / ONNX Runtime. The app does not send photos to a prediction server. The browser requests scripts/model weights from CDN/Hugging Face.

## Quick testing on a computer

From the folder with `index.html`:

```bash
python3 -m http.server 8000
```

Go to `http://localhost:8000` in a web browser. Choose `Upload photo` and `Identify road sign`, or test your webcam. Needs internet on initial AI download.

## Put it on an iPhone

1. Deploy all files to any static website hosting that gives **HTTPS** (for example Netlify Drop, GitHub Pages, or Cloudflare Pages). Do not publish only `index.html`: CSS, JavaScript, icon files, and manifest must also be included.
2. Open the resulting HTTPS URL in iPhone Safari.
3. Tap **Start camera**, allow camera permission, and center a large, clearly visible sign in the target box.
4. Tap **Identify road sign** (first use downloads the AI model). Optionally enable Continuous scan after the model has loaded.
5. To install as an app: Safari Share > Add to Home Screen > Add.

## Main files
- `index.html` — web layout and controls
- `styles.css` — responsive dark dashboard design
- `app.js` — browser camera, bilingual UI, image preprocessing, model inference, history
- `manifest.webmanifest` + icons — Home Screen installation

## Technology / attribution
- Transformers.js (`@huggingface/transformers` v3.8.1): https://huggingface.co/docs/transformers.js/
- Model: Xenova/mobileclip_s0: https://huggingface.co/Xenova/mobileclip_s0 (view original model license before redistribution/commercial use)
- No external signs dataset is bundled. Examples and meanings written for this prototype; local regulations take precedence.

## Production version / Oman deployment
Recommended next step: train/finetune an Oman-specific sign classification model (and optionally a separate object detection model) using permissioned local image data; independently evaluate per-sign precision/recall under realistic lighting, distance, motion blur, and bilingual signs. Add speed number OCR with verification and native iOS app packaging.
