// Stable, private browser cache of MobileCLIP's normalized label embeddings.
// Only tiny numeric label vectors are persisted: no camera frames or GPS records.
// The cached vectors are invalidated automatically whenever labels/model change.
const DATABASE = 'road-sign-lens-vocabulary-v1';
const STORE = 'vectors';
const KEY = 'mobileclip-s0-sign-prompts';
const openDatabase = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { resolve(null); return; }
  let request;
  try { request = indexedDB.open(DATABASE, 1); } catch (e) { reject(e); return; }
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error('AI vocabulary cache is locked'));
});
const withDatabase = async (mode, task) => {
  const db = await openDatabase();
  if (!db) return null;
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = task(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
};
export function validVocabulary(entry, modelId, labels) {
  if (!entry || entry.modelId !== modelId || entry.precision !== 'q8' ||
      !Array.isArray(entry.labels) || entry.labels.length !== labels.length ||
      !entry.labels.every((label, i) => label === labels[i])) return false;
  const vectors = entry.vectors;
  if (!Array.isArray(vectors) || vectors.length !== labels.length) return false;
  const dimension = vectors[0]?.length;
  return Number.isInteger(dimension) && dimension >= 32 && dimension <= 2048 &&
    vectors.every(v => Array.isArray(v) && v.length === dimension &&
      v.every(x => typeof x === 'number' && Number.isFinite(x)));
}
export async function readVocabulary(modelId, labels) {
  try {
    const data = await withDatabase('readonly', store => store.get(KEY));
    return validVocabulary(data, modelId, labels) ? data.vectors : null;
  } catch (error) {
    console.info('AI vocabulary cache unavailable; normal initialization will continue.', error);
    return null;
  }
}
export async function writeVocabulary(modelId, labels, vectors) {
  const data = { modelId, precision: 'q8', labels: [...labels], vectors };
  if (!validVocabulary(data, modelId, labels)) return false;
  try {
    await withDatabase('readwrite', store => store.put(data, KEY));
    return typeof indexedDB !== 'undefined';
  } catch (error) {
    console.info('AI vocabulary could not be stored. Model still works.', error);
    return false;
  }
}
