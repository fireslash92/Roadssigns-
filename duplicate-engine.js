/** Phase 3 — cautious candidate matching for human-reviewed roadside assets.
 * A GPS fix is a PHONE location, never a proof of signpost identity.
 * Functions are pure and deliberately never delete or merge records automatically.
 */
import {distanceMeters, validLatLon} from './detector.js';

const hasCoordinates=r=>r?.loc&&validLatLon(Number(r.loc.lat),Number(r.loc.lon));
const timestamp=r=>Date.parse(r?.at||'');
const sameSession=(a,b)=>Boolean(a?.session&&a.session===b?.session);

export function possibleDuplicateMatches(records,candidate,{radius=35,limit=3,now=Date.now()}={}){
 if(!candidate?.id||!Array.isArray(records))return [];
 const metres=Math.max(8,Math.min(60,Number(radius)||35));
 const matches=[];
 for(const original of records){
  if(!original||original.uid===candidate.uid||original.id!==candidate.id)continue;
  const t=timestamp(original),n=timestamp(candidate);
  const seconds=Number.isFinite(t)&&Number.isFinite(n)?Math.abs(n-t)/1000:Infinity;
  const bothLocated=hasCoordinates(original)&&hasCoordinates(candidate);
  let distance=null, reason=null, quality='possible';
  if(bothLocated){
   distance=distanceMeters(original.loc,candidate.loc);
   if(distance>metres)continue;
   const corrected=original.loc.source!=='phone'&&candidate.loc.source!=='phone';
   const accuratePhones=Number(original.loc.accuracy)<=15&&Number(candidate.loc.accuracy)<=15&&original.loc.source==='phone'&&candidate.loc.source==='phone';
   quality=(distance<=6&&corrected)||(distance<=10&&accuratePhones&&seconds<=120)?'close':'possible';
   reason=original.loc.source==='phone'||candidate.loc.source==='phone'?'phone-proximity':'mapped-proximity';
  }else if(sameSession(original,candidate)&&seconds<=90){
   reason='recent-uncertain';
  }else continue;
  // The matching radius is a search heuristic, never a surveyed tolerance.
  const freshness=Number.isFinite(seconds)?Math.max(0,25-Math.min(seconds,3600)/144):0;
  const closeness=distance===null?10:Math.max(0,50*(1-distance/metres));
  const score=closeness+freshness+(quality==='close'?20:0)+(original.status==='reviewed'?5:0);
  matches.push({uid:original.uid,reason,quality,distanceMeters:distance,score,observedAt:original.at,signId:original.id,source:original.loc?.source||'none'});
 }
 return matches.sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(10,limit)));
}

export function linkRepeatSighting(original,observation){
 if(!original?.uid||!observation?.uid||original.id!==observation.id||original.uid===observation.uid)throw new Error('Cannot link unrelated or identical observations');
 const sighting={uid:observation.uid,at:observation.at,source:observation.source||'unknown',loc:observation.loc||null,session:observation.session||null,aiSuggestedId:observation.aiSuggestedId||null,score:observation.score??null};
 const old=Array.isArray(original.linkedSightings)?original.linkedSightings:[];
 if(old.some(x=>x.uid===sighting.uid))return original;
 const count=Number.isInteger(original.sightingCount)&&original.sightingCount>=1?original.sightingCount:1;
 const dates=[original.at,original.lastSeenAt,observation.at].map(x=>Date.parse(x)).filter(Number.isFinite);
 return {...original,linkedSightings:[...old,sighting].slice(-100),sightingCount:count+1,lastSeenAt:dates.length?new Date(Math.max(...dates)).toISOString():original.at};
}

export function duplicateQueueEntry(candidate,matches){
 if(!candidate?.uid||!Array.isArray(matches)||!matches.length)throw new Error('Expected an observation and at least one match');
 return {uid:candidate.uid,candidate,matches:matches.map(m=>({uid:m.uid,reason:m.reason,quality:m.quality,distanceMeters:m.distanceMeters})),addedAt:new Date().toISOString()};
}

export function summarizeDuplicates(inventory,queue=[]){
 return {pending:queue.length,linked:inventory.reduce((n,r)=>n+Math.max(0,(r.sightingCount||1)-1),0),separate:inventory.filter(r=>r.duplicateDecision==='separate').length};
}
