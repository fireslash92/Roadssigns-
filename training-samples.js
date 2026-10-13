/** Opt-in, local-only labelled imagery for eventual region-specific training.
 * No uploading, no phone GPS in saved samples. User confirms all boxes.
 */
const DB_NAME='road-sign-lens-omani-training-v1', STORE='samples';
export function openTrainingDB(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in globalThis))return reject(new Error('IndexedDB unavailable'));
  const r=indexedDB.open(DB_NAME,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'});};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('Database error'));
 });
}
async function withStore(mode, action){const db=await openTrainingDB();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);const req=action(store);
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Storage error'));
 });}finally{db.close();}}
export const saveTrainingSample=sample=>withStore('readwrite',store=>store.put(sample));
export const getTrainingSamples=()=>withStore('readonly',store=>store.getAll());
export const removeTrainingSamples=()=>withStore('readwrite',store=>store.clear());
export function crc32(data){let c=0xFFFFFFFF;for(const byte of data){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^(-(c&1)&0xEDB88320);}return(c^0xFFFFFFFF)>>>0;}
const enc=new TextEncoder();
export function createStoreZip(files){
 let ofs=0;const records=[],chunks=[];
 const u16=(arr,i,v)=>{arr[i]=v&255;arr[i+1]=(v>>>8)&255;};
 const u32=(arr,i,v)=>{u16(arr,i,v&65535);u16(arr,i+2,Math.floor(v/65536));};
 for(const file of files){const name=enc.encode(file.name),data=file.bytes instanceof Uint8Array?file.bytes:enc.encode(String(file.bytes));
  if(name.length>65535||data.byteLength>0xFFFFFFFF)throw Error('Dataset file too large');
  const crc=crc32(data),local=new Uint8Array(30+name.length);u32(local,0,0x04034b50);u16(local,4,20);u16(local,6,0x0800);u16(local,8,0);u32(local,14,crc);u32(local,18,data.length);u32(local,22,data.length);u16(local,26,name.length);local.set(name,30);
  chunks.push(local,data);
  const central=new Uint8Array(46+name.length);u32(central,0,0x02014b50);u16(central,4,20);u16(central,6,20);u16(central,8,0x0800);u32(central,16,crc);u32(central,20,data.length);u32(central,24,data.length);u16(central,28,name.length);u32(central,42,ofs);central.set(name,46);records.push(central);ofs+=local.length+data.length;
 }
 const start=ofs;for(const r of records){chunks.push(r);ofs+=r.length;}
 const tail=new Uint8Array(22);u32(tail,0,0x06054b50);u16(tail,8,records.length);u16(tail,10,records.length);u32(tail,12,ofs-start);u32(tail,16,start);chunks.push(tail);
 return new Blob(chunks,{type:'application/zip'});
}
export async function trainingZip(samples,signNames){const files=[],manifest=[];
 for(const [i,s] of samples.entries()){
  const name=`omani-sign-${String(i+1).padStart(4,'0')}`;
  files.push({name:`images/${name}.jpg`,bytes:new Uint8Array(await s.jpeg.arrayBuffer())});
  const b=s.box;
  files.push({name:`labels/${name}.txt`,bytes:`${s.classIndex} ${(b.x+b.w/2).toFixed(6)} ${(b.y+b.h/2).toFixed(6)} ${b.w.toFixed(6)} ${b.h.toFixed(6)}\n`});
  manifest.push({file:name+'.jpg',signId:s.signId,classIndex:s.classIndex,annotatedAt:s.at,imageWidth:s.width,imageHeight:s.height,bbox:b,verifiedByUser:true});
 }
 // Training/validation split is not performed here; obtain representative samples and split by drive/site later.
 files.push({name:'data.yaml',bytes:`path: .\ntrain: images/train\nval: images/val\nnc: ${signNames.length}\nnames:\n`+signNames.map((n,i)=>`  ${i}: ${JSON.stringify(n)}`).join('\n')+'\n'});
 files.push({name:'manifest.json',bytes:JSON.stringify({schema:1,purpose:'Human-reviewed candidate boxes for an Omani traffic-sign detector',createdAt:new Date().toISOString(),samples:manifest},null,2)});
 files.push({name:'IMPORTANT.txt',bytes:'LOCAL DATASET EXPORT. Boxes must be manually checked before training. A true training/validation split is required: first move images and labels into train/val folders. The data.yaml lists those folders but they are not created automatically. Remove private content and check permission to use imagery before sharing. No phone GPS positions are included.\n'});
 return createStoreZip(files);
}
