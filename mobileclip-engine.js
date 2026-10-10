// Road Sign Lens Pro v3.8 - MobileCLIP split-tower engine.
// The published Xenova/mobileclip_s0 repository contains text_model*.onnx and
// vision_model*.onnx. It does NOT contain a generic model_quantized.onnx.
// Use the documented explicit tower classes, not zero-shot-image-classification pipeline.
export const MODEL_ID = 'Xenova/mobileclip_s0';

/** Initializes the two published ONNX towers and computes text vectors once.
 * No build tools required; called only after the user starts AI.
 */
export async function createMobileClipClassifier(lib, labels, callbacks = {}) {
  const required = ['AutoTokenizer', 'AutoProcessor', 'CLIPTextModelWithProjection',
    'CLIPVisionModelWithProjection', 'RawImage', 'dot', 'softmax'];
  const missing = required.filter(name => !lib[name]);
  if (missing.length) throw new Error(`AI library is missing: ${missing.join(', ')}`);
  if (!Array.isArray(labels) || !labels.length || labels.some(x => typeof x !== 'string')) {
    throw new TypeError('Recognition labels must be a non-empty array of strings');
  }
  const { AutoTokenizer, AutoProcessor, CLIPTextModelWithProjection,
          CLIPVisionModelWithProjection, RawImage, dot, softmax } = lib;
  const report = callbacks.onStage || (() => {});
  const progress_callback = callbacks.onProgress || (() => {});
  const common = { device: 'wasm', progress_callback };

  report('tokenizer');
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  report('processor');
  const processor = await AutoProcessor.from_pretrained(MODEL_ID);

  // q8 loads onnx/text_model_quantized.onnx, present in this repository.
  report('text-model');
  const textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL_ID, {
    ...common, dtype: 'q8',
  });
  let textVectors;
  try {
    report('text-embeddings');
    const inputs = tokenizer(labels, {
      padding: 'max_length', truncation: true, max_length: 77,
    });
    const { text_embeds } = await textModel(inputs);
    textVectors = text_embeds.normalize().tolist();
    if (textVectors.length !== labels.length) throw new Error('Invalid text embedding dimensions');
  } finally {
    // The text tower is no longer needed after computing label vectors.
    if (typeof textModel.dispose === 'function') {
      try { await textModel.dispose(); } catch (err) { console.warn('Text model cleanup:', err); }
    }
  }

  // FP32 vision avoids quantization degradation and requests onnx/vision_model.onnx.
  report('vision-model');
  const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, {
    ...common, dtype: 'fp32',
  });
  report('ready');

  return async function classify(image, requestedLabels = labels) {
    if (requestedLabels.length !== labels.length || requestedLabels.some((x, i) => x !== labels[i])) {
      throw new Error('The loaded model is calibrated for the app’s fixed label set');
    }
    const rawImage = await RawImage.read(image);
    const imageInputs = await processor(rawImage);
    const { image_embeds } = await visionModel(imageInputs);
    const imageVec = image_embeds.normalize().tolist()[0];
    if (!imageVec) throw new Error('AI produced no image embedding');
    const probabilities = softmax(textVectors.map(vec => 100 * dot(imageVec, vec)));
    return labels.map((label, i) => ({label, score: Number(probabilities[i]) || 0}));
  };
}
