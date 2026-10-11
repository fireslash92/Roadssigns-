/** Lightweight camera-frame quality check. All numbers are heuristics, not an image-quality certification. */
export function assessRegionQuality(frame, rect){
 const {data,width,height}=frame;
 if(!data||!width||!height)return {usable:false,reason:'no-frame',brightness:0,edge:0};
 const x0=Math.max(1,Math.floor(rect.x)),y0=Math.max(1,Math.floor(rect.y));
 const x1=Math.min(width-2,Math.ceil(rect.x+rect.w)),y1=Math.min(height-2,Math.ceil(rect.y+rect.h));
 if(x1<=x0||y1<=y0)return {usable:false,reason:'no-region',brightness:0,edge:0};
 const step=Math.max(2,Math.round(Math.max(x1-x0,y1-y0)/48));
 let luminance=0,edge=0,dark=0,light=0,n=0;
 const yAt=(x,y)=>{const k=(y*width+x)*4;return .2126*data[k]+.7152*data[k+1]+.0722*data[k+2]};
 for(let y=y0;y<=y1-step;y+=step){for(let x=x0;x<=x1-step;x+=step){
  const l=yAt(x,y);luminance+=l;n++;
  if(l<28)dark++;if(l>246)light++;
  edge+=(Math.abs(l-yAt(x+step,y))+Math.abs(l-yAt(x,y+step)))/2;
 }}
 if(!n)return {usable:false,reason:'no-region',brightness:0,edge:0};
 const brightness=luminance/n, texture=edge/n, darkFraction=dark/n, lightFraction=light/n;
 // Only reject *severely* unusable samples; dark and white sign backgrounds remain valid.
 let reason='ready';
 if(darkFraction>.88||brightness<24)reason='too-dark';
 else if(lightFraction>.91||brightness>249)reason='overexposed';
 else if(texture<1.5)reason='low-detail';
 return {usable:reason==='ready',reason,brightness:Math.round(brightness),edge:Number(texture.toFixed(1)),darkFraction,lightFraction};
}
/** Sample scheduling should cap CPU use; adaptive throttling is based on observed processing cost. */
export function frameDelay(profile='balanced',costMs=0){
 const base={responsive:250,balanced:420,battery:800}[profile]??420;
 return Math.max(base,Math.ceil(Math.max(0,costMs)*3),200);
}
export function recommendedAIScanDelay(profile='balanced',configured=6000,classificationMs=0){
 const minimum=profile==='battery'?10000:profile==='responsive'?3000:4000;
 return Math.max(minimum,Number(configured)||6000,Math.ceil(Math.max(0,classificationMs)*1.35));
}
