/* Fast, transparent COLOR-REGION proposal generator, not a validated ML sign detector.
   Boxes are candidates only. AI classification is a separate, slower optional step. */
export function detectRegions({data,width:w,height:h}) {
 const N=w*h, mask=new Uint8Array(N); let colors=0;
 for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
  const i=y*w+x,k=i*4, r=data[k],g=data[k+1],b=data[k+2];
  const red=r>85&&r>g*1.34&&r>b*1.25;
  const blue=b>72&&b>r*1.23&&b>g*.99&&b-r>23;
  const orange=r>114&&g>66&&r>g*1.08&&g>b*1.35;
  if(red||blue||orange){mask[i]=1;colors++;}
 }
 if(colors<14)return [];
 // Connect narrow interrupted sign borders using one 3x3 binary dilation pass.
 const expanded=new Uint8Array(N);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=y*w+x;
  if(!mask[i])continue;
  expanded[i]=1;expanded[i+1]=1;expanded[i-1]=1;
  expanded[i+w]=1;expanded[i-w]=1;
  expanded[i+w+1]=1;expanded[i+w-1]=1;
  expanded[i-w+1]=1;expanded[i-w-1]=1;
 }
 const visited=new Uint8Array(N),queue=new Int32Array(N),found=[];
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const start=y*w+x;if(!expanded[start]||visited[start])continue;
  let read=0,write=1;queue[0]=start;visited[start]=1;
  let xmin=x,xmax=x,ymin=y,ymax=y,real=0;
  while(read<write){const i=queue[read++],xx=i%w,yy=(i/w)|0; if(mask[i])real++;
   xmin=Math.min(xmin,xx);xmax=Math.max(xmax,xx);ymin=Math.min(ymin,yy);ymax=Math.max(ymax,yy);
   for(const t of [i-1,i+1,i-w,i+w]) {if(t<0||t>=N||visited[t]||!expanded[t])continue;visited[t]=1;queue[write++]=t;}
  }
  const bw=xmax-xmin+1,bh=ymax-ymin+1,ar=bw/bh,area=bw*bh,fill=real/area;
  if(bw<11||bh<11||area<135||area>w*h*.22||ar<.46||ar>2||fill<.055||fill>.96)continue;
  // Shape candidates are coloured patches; they are not validated road signs.
  const pad=Math.round(Math.max(bw,bh)*.20);
  found.push({x:Math.max(0,xmin-pad),y:Math.max(0,ymin-pad),w:Math.min(w-1,xmax+pad)-Math.max(0,xmin-pad),h:Math.min(h-1,ymax+pad)-Math.max(0,ymin-pad),score:Math.min(1,real/Math.max(100,area)*2),pixels:real});
 }
 return found.sort((a,b)=>b.pixels-a.pixels).slice(0,4);
}
export function distanceMeters(a,b){if(!a||!b)return Infinity;const R=6371000,rad=Math.PI/180;const dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad,s=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(s)));}
export function validLatLon(lat,lon){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;}
export function shouldDeduplicate(records,next,radius=35,now=Date.now()){
 return records.some(r=>r.id===next.id&&Math.abs(now-new Date(r.at).getTime())<15*60*1000&&(next.loc&&r.loc?distanceMeters(next.loc,r.loc)<radius:!next.loc&&!r.loc&&Math.abs(now-new Date(r.at).getTime())<45000));
}
export function geoFeature(record,sign){return {type:'Feature',geometry:record.loc?{type:'Point',coordinates:[record.loc.lon,record.loc.lat]}:null,properties:{id:record.uid,sign_type:record.id,sign_en:sign?.en||record.id,sign_ar:sign?.ar||'',time:record.at,review_status:record.status||'pending',location_source:record.loc?.source||'none',phone_gps_accuracy_m:record.loc?.accuracy??null,ai_similarity_score:record.score??null,ai_suggested_sign_id:record.aiSuggestedId||null,reviewed_at:record.reviewedAt||null,notes:record.notes||'',road:record.road||'',sign_condition:record.condition||'unknown',post_condition:record.pole||'unknown',survey_session:record.session||''}};}
/** Lightweight within-frame-region tracking: candidate IDs are temporary and NOT physical post IDs. */
export function trackRegions(previous,proposals,nextId=1){
 const used=new Set(),current=[];
 for(const box of proposals){let best=null,score=0;
  for(const old of previous){if(used.has(old.trackId))continue;
   const lx=Math.max(0,Math.min(box.x+box.w,old.x+old.w)-Math.max(box.x,old.x));
   const ly=Math.max(0,Math.min(box.y+box.h,old.y+old.h)-Math.max(box.y,old.y));
   const intersection=lx*ly,union=box.w*box.h+old.w*old.h-intersection;
   const iou=union?intersection/union:0;
   if(iou>score){score=iou;best=old;}
  }
  if(best&&score>.19){used.add(best.trackId);const alpha=.6;current.push({...box,x:alpha*box.x+(1-alpha)*best.x,y:alpha*box.y+(1-alpha)*best.y,w:alpha*box.w+(1-alpha)*best.w,h:alpha*box.h+(1-alpha)*best.h,trackId:best.trackId,age:(best.age||1)+1,missed:0});}
  else current.push({...box,trackId:nextId++,age:1,missed:0});
 }
 for(const old of previous){if(used.has(old.trackId))continue;if(old.missed<2)current.push({...old,missed:(old.missed||0)+1});}
 return {regions:current,nextId};
}
