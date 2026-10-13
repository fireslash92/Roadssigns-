/** Camera-active automatic inventory helpers. Never equate phone GPS with a signpost survey. */
import {iou} from './tracking-engine.js';
import {groundDistance, fixAssessment} from './geo-survey.js';

export const REPEAT_WINDOW_MS=14000;
export const BACKFILL_WINDOW_MS=10000;

/** Only suppress a rapid re-acquisition of the SAME visual area, not all nearby signs. */
export function rapidReacquisition(recent, candidate, {now=Date.now()}={}) {
 if(!candidate?.id||!candidate?.box||!Array.isArray(recent))return null;
 return recent.find(prev=>{
  if(prev.id!==candidate.id||prev.session!==candidate.session)return false;
  const gap=now-prev.at;
  if(!Number.isFinite(gap)||gap<0||gap>REPEAT_WINDOW_MS)return false;
  if(!prev.box||iou(prev.box,candidate.box)<0.48)return false;
  if(prev.loc&&candidate.loc){
   const d=groundDistance(prev.loc,candidate.loc);
   if(!Number.isFinite(d)||d>Math.max(18,Math.min(42,Number(prev.loc.accuracy||0)+Number(candidate.loc.accuracy||0))))return false;
  }
  return true;
 })||null;
}

export function makeAutomaticRecord({uid,id,score,session,now=new Date().toISOString(),loc=null,trackId=null}){
 if(!uid||!id||!session)throw Error('Missing automatic observation identifiers');
 return {
  uid,id,aiSuggestedId:id,at:now,score,source:'auto-camera',loc,
  status:'pending',notes:'',session,autoMapped:!!loc,
  coordinateMeaning:loc?'phone-position-approximation':'waiting-for-phone-gps',
  trackingId:trackId
 };
}

/** Backfill only an observation taken almost at the same time as this GPS fix. */
export function canBackfillGPS(record,fix,now=Date.now()){
 if(!record||record.loc||record.source!=='auto-camera'||!fixAssessment(fix,now).usable)return false;
 const elapsed=Math.abs(Date.parse(record.at)-Date.parse(fix.at));
 return Number.isFinite(elapsed)&&elapsed<=BACKFILL_WINDOW_MS&&Math.abs(now-Date.parse(record.at))<=BACKFILL_WINDOW_MS;
}
