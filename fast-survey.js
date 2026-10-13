/** Phase 1.2: timely second verification, without treating scores as probabilities. */
export function hasPendingVerification(boxes, history) {
  return (boxes||[]).some(b => b.missed===0 && b.trackId &&
    (history.get(b.trackId)?.votes||[]).length>0 && !history.get(b.trackId)?.saved);
}
export function nextRecognitionDelay({profile='balanced', configured=6000, costMs=0, pending=false}={}) {
  if (!pending) {
    const base = profile==='responsive'?3000:profile==='battery'?10000:4000;
    return Math.max(base, Number(configured)||6000, Math.ceil(costMs*1.35));
  }
  // Do not wait the normal 4-10 seconds when a track already has its first vote.
  // Allow the processing cost to slow the loop naturally on older phones.
  const min = profile==='responsive'?1200:profile==='battery'?3500:1700;
  return Math.max(min, Math.ceil(Math.max(0,costMs)*1.25));
}
export function useHighResolutionRecovery(boxes, profile, cycle) {
  return profile!=='battery' && (!boxes||boxes.length===0) && cycle%4===0;
}
export function normalizeTrainingBox(box, width, height) {
  if(!box||width<=0||height<=0) return null;
  const x=Math.max(0,Math.min(width-1,Number(box.x)));
  const y=Math.max(0,Math.min(height-1,Number(box.y)));
  const w=Math.max(0,Math.min(width-x,Number(box.w)));
  const h=Math.max(0,Math.min(height-y,Number(box.h)));
  if (![x,y,w,h].every(Number.isFinite)||w<4||h<4) return null;
  return {x:x/width,y:y/height,w:w/width,h:h/height};
}
export function yoloRow(classIndex, box) {
  if (!box||!Number.isInteger(classIndex)||classIndex<0) throw new Error('Invalid training annotation');
  return [classIndex, box.x+box.w/2, box.y+box.h/2, box.w, box.h].map((x,i)=>i===0?String(x):x.toFixed(6)).join(' ');
}
