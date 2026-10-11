// Browser-only compatibility helper for ONNX Runtime Web 1.22 (Transformers.js 3.8.1).
// Uses the JS factory and WASM binary from the SAME pinned package release.
// No backend or model work is performed at import time.
export const RUNTIME_FILENAME = 'ort-wasm-simd-threaded';
export const RUNTIME_SOURCES = Object.freeze([
  { name: 'jsDelivr · Transformers.js 3.8.1', base: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/' },
  { name: 'UNPKG · Transformers.js 3.8.1', base: 'https://unpkg.com/@huggingface/transformers@3.8.1/dist/' },
  { name: 'jsDelivr · ONNX Runtime 1.22.0', base: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/' },
  { name: 'UNPKG · ONNX Runtime 1.22.0', base: 'https://unpkg.com/onnxruntime-web@1.22.0/dist/' },
]);
export const PREFERENCE_KEY='rsl-v4.3-onnx-cdn';
export function preferredRuntime(storage) {
  try { const value = Number(storage?.getItem(PREFERENCE_KEY)); return Number.isInteger(value) && value >= 0 ? value % RUNTIME_SOURCES.length : 0; } catch { return 0; }
}
export function advanceRuntime(storage, index) {
  const next = ((Number(index) || 0) + 1) % RUNTIME_SOURCES.length;
  try { storage?.setItem(PREFERENCE_KEY, String(next)); } catch {}
  return next;
}
async function defaultImport(url) { return import(/* @vite-ignore */ url); }
async function headCheck(url) {
  // HEAD avoids transferring multi-megabyte binaries a second time.
  // If a CDN blocks HEAD/CORS, leave validation to ONNX itself.
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6500);
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'cors', cache: 'no-store', signal: ctrl.signal });
      if (response.status === 404 || response.status === 403) return false;
      return response.ok ? true : null;
    } finally { clearTimeout(timer); }
  } catch { return null; }
}
/** Select a JS factory verified by the browser. Neither model nor full WASM is downloaded here. */
export async function selectRuntime({ startIndex=0, importer=defaultImport, probe=headCheck, onAttempt=()=>{} }={}) {
  const failures=[];
  for(let offset=0; offset<RUNTIME_SOURCES.length; offset++) {
    const index=((startIndex + offset)%RUNTIME_SOURCES.length + RUNTIME_SOURCES.length)%RUNTIME_SOURCES.length;
    const source=RUNTIME_SOURCES[index];
    const mjs=source.base+RUNTIME_FILENAME+'.mjs';
    const wasm=source.base+RUNTIME_FILENAME+'.wasm';
    onAttempt({index,source,attempt:offset+1,total:RUNTIME_SOURCES.length});
    try {
      const available=await probe(wasm);
      if(available===false)throw new Error('WASM binary missing or forbidden (HTTP 403/404)');
      const mod=await importer(mjs);
      if(typeof mod?.default!=='function')throw new Error('ONNX helper module did not export an initialization function');
      return {index,name:source.name,mjs,wasm,probe:available===true?'available':'not confirmed',failures};
    } catch(err) {
      failures.push(`${source.name}: ${String(err?.message||err).slice(0,180)}`);
    }
  }
  const error=new Error('No usable ONNX runtime helper from tested providers. '+failures.join(' | '));
  error.attempts=failures;
  throw error;
}
/** Must run BEFORE the first from_pretrained() call. */
export function configureWasmRuntime(lib, runtime) {
  const wasm=lib?.env?.backends?.onnx?.wasm;
  if(!wasm)throw new Error('The imported Transformers.js library has no ONNX/WASM configuration');
  wasm.numThreads=1; // Avoid SharedArrayBuffer / cross-origin isolation requirement on GitHub Pages.
  wasm.proxy=false;
  wasm.wasmPaths={mjs:runtime.mjs,wasm:runtime.wasm};
  // Keep ordinary browser model caching, avoid Transformers.js prefetching WASM
  // through a different CDN URL before this runtime source is selected.
  lib.env.useBrowserCache=true;
  lib.env.useWasmCache=false;
  return wasm.wasmPaths;
}
