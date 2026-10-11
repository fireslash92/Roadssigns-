/* Road Sign Lens Phase 2: geolocation quality and provenance helpers.
   GPS reports the *phone position*, not the roadside signpost position.
   This module uses no browser APIs and is unit-testable. */
const EARTH_RADIUS_M=6371000;
export function validPoint(lat,lon){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;}
export function groundDistance(a,b){
  if(!a||!b||!validPoint(Number(a.lat),Number(a.lon))||!validPoint(Number(b.lat),Number(b.lon)))return Infinity;
  const toRad=Math.PI/180,lat1=a.lat*toRad,lat2=b.lat*toRad,dLat=(b.lat-a.lat)*toRad,dLon=(b.lon-a.lon)*toRad;
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*EARTH_RADIUS_M*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function positionSample(position){
  const c=position?.coords||{};
  const lat=Number(c.latitude),lon=Number(c.longitude),accuracy=Number(c.accuracy);
  const time=Number(position?.timestamp);
  if(!validPoint(lat,lon)||!Number.isFinite(accuracy)||accuracy<=0||!Number.isFinite(time)||time<=0)return null;
  return {lat,lon,accuracy:Math.round(accuracy*10)/10,at:new Date(time).toISOString(),source:'phone'};
}
export function fixAssessment(fix,now=Date.now()){
  if(!fix)return {tier:'none',usable:false,ageSeconds:null};
  const timestamp=Date.parse(fix.at),age=now-timestamp;
  if(!validPoint(Number(fix.lat),Number(fix.lon))||!Number.isFinite(fix.accuracy)||fix.accuracy<=0||!Number.isFinite(age)||age< -5000)return {tier:'invalid',usable:false,ageSeconds:null};
  const ageSeconds=Math.max(0,Math.round(age/1000));
  if(age>20000)return {tier:'stale',usable:false,ageSeconds};
  if(fix.accuracy>75)return {tier:'poor',usable:false,ageSeconds};
  return {tier:fix.accuracy<=15?'good':'approximate',usable:true,ageSeconds};
}
export function choosePhoneFix(samples,now=Date.now()){
  // Use the freshest position, but allow a recent, more precise sample if
  // it is very close to the latest one (avoids snapping to a previous road position).
  const recent=(samples||[]).filter(s=>fixAssessment(s,now).usable&&now-Date.parse(s.at)<=12000).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  if(!recent.length)return null;
  const newest=recent[0];
  const nearby=recent.filter(f=>groundDistance(f,newest)<=Math.max(12,Math.min(35,newest.accuracy)));
  const best=nearby.sort((a,b)=>a.accuracy-b.accuracy)[0]||newest;
  return {...best,accuracy:best.accuracy,source:'phone',gpsAt:best.at,positionVerified:false};
}
export function correctedPosition(lat,lon,{source='map',previous=null,phoneFix=null,now=new Date().toISOString()}={}){
  if(!validPoint(Number(lat),Number(lon)))throw new RangeError('Invalid coordinates');
  const reference=previous?.phoneReference||(
    previous?.source==='phone'?{lat:previous.lat,lon:previous.lon,accuracy:previous.accuracy,at:previous.gpsAt||previous.at}:
    phoneFix?{lat:phoneFix.lat,lon:phoneFix.lon,accuracy:phoneFix.accuracy,at:phoneFix.at}:null
  );
  return {lat:Number(lat),lon:Number(lon),accuracy:null,source,at:now,positionVerified:false,...(reference?{phoneReference:reference}:{})};
}
export function provenanceText(location){
  if(!location)return 'No coordinates';
  if(location.source==='phone')return `Approximate phone GPS ±${Math.round(location.accuracy||0)} m`;
  if(location.source==='map')return 'Map-adjusted sign position · requires review';
  return 'Manually entered sign position · requires review';
}
