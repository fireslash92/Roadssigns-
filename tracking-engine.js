// Phase 1: frame-level proposal merger, bounded per-track classification consensus.
// The numeric scores from MobileCLIP are RELATIVE similarities, not calibrated probabilities.
export function iou(a,b){
 const w=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
 const h=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 const overlap=w*h; return overlap/Math.max(1,a.w*a.h+b.w*b.h-overlap);
}
export function combineProposals(colors,ml,limit=7){
 const accepted=[];
 // Detector-provided STOP regions take precedence over color proposals on overlap.
 for(const box of [...ml,...colors]){
  if(!box||![box.x,box.y,box.w,box.h].every(Number.isFinite)||box.w<=0||box.h<=0)continue;
  if(accepted.some(other=>iou(box,other)>.40))continue;
  accepted.push({...box});if(accepted.length>=limit)break;
 }
 return accepted;
}
export function stopDetections(predictions,width,height){
 return (Array.isArray(predictions)?predictions:[]).filter(x=>/^(stop sign)$/i.test(String(x.label||''))&&Number(x.score)>=.42)
  .map(x=>{
   const b=x.box||{},x1=Math.max(0,Math.min(width,Number(b.xmin))),y1=Math.max(0,Math.min(height,Number(b.ymin))),
    x2=Math.max(0,Math.min(width,Number(b.xmax))),y2=Math.max(0,Math.min(height,Number(b.ymax)));
   return {x:x1,y:y1,w:x2-x1,h:y2-y1,score:Number(x.score),pixels:(x2-x1)*(y2-y1),source:'object-detector',signHint:'stop'};
  }).filter(b=>b.w>=8&&b.h>=8&&Number.isFinite(b.x)&&Number.isFinite(b.y)).slice(0,3);
}
export function updateVotes(current,signId,score,now=Date.now()){
 const previous=Array.isArray(current)?current:[];
 return [...previous.filter(v=>now-v.at<40000),{id:signId,score,at:now}].slice(-5);
}
export function consensus(votes,now=Date.now()){
 const recent=(votes||[]).filter(v=>now-v.at<40000);
 if(recent.length<2)return null;
 const counts=new Map();for(const v of recent){const a=counts.get(v.id)||[];a.push(v);counts.set(v.id,a);}
 const ordered=[...counts].sort((a,b)=>b[1].length-a[1].length);
 const [id,matches]=ordered[0]||[];if(!id||matches.length<2||ordered[1]?.[1]?.length>=matches.length)return null;
 const score=matches.reduce((s,v)=>s+v.score,0)/matches.length;
 if(score<.115)return null;
 return {id,score,votes:matches.length,lastAt:Math.max(...matches.map(v=>v.at))};
}
export function pickTracks(boxes,history,limit=2){
 return boxes.filter(b=>b.trackId&&b.missed===0&&(b.age||0)>=3&&!history.get(b.trackId)?.saved)
   .sort((a,b)=>{
    const ah=history.get(a.trackId),bh=history.get(b.trackId);
    const av=ah?.votes?.length||0,bv=bh?.votes?.length||0;
    // Follow up an existing first vote before starting another candidate.
    const apriority=av>0?0:1,bpriority=bv>0?0:1;
    if(apriority!==bpriority)return apriority-bpriority;
    if(av!==bv)return av-bv;
    return (b.pixels||b.w*b.h)-(a.pixels||a.w*a.h);
   }).slice(0,limit);
}
export function pruneHistory(history,regions,now=Date.now()){
 const active=new Set(regions.map(r=>r.trackId));
 for(const [id,entry] of history){if(!active.has(id)&&now-(entry.lastSeen||0)>18000)history.delete(id);}
}
