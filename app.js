import {SIGNS,BY_ID} from './signs.js';
import {detectRegions,trackRegions,distanceMeters,validLatLon,shouldDeduplicate,geoFeature} from './detector.js';
import {createMobileClipClassifier} from './mobileclip-engine.js';
import {selectRuntime, configureWasmRuntime, preferredRuntime, advanceRuntime} from './wasm-runtime.js';
import {combineProposals,stopDetections,updateVotes,consensus,pickTracks,pruneHistory} from './tracking-engine.js';
import {assessRegionQuality,frameDelay,recommendedAIScanDelay} from './scan-quality.js';
import {rankSuggestion,stableAgreement,verificationSummary} from './recognition-policy.js';
import {positionSample,fixAssessment,choosePhoneFix,correctedPosition,provenanceText} from './geo-survey.js';
const $=id=>document.getElementById(id), all=sel=>[...document.querySelectorAll(sel)];
const STORAGE='road-sign-lens-pro-v3';
const defaults={language:'en',contrast:false,largeText:false,reduceMotion:false,interval:6000,radius:35,autosave:true,live:true,enhancedDetector:false,autoPrepare:false,performanceProfile:'balanced'};
function loadPrefs(){try{return {...defaults,...JSON.parse(localStorage.getItem(STORAGE+'-prefs')||'{}')};}catch{return {...defaults};}}
let aiStatus='standby', aiError='', aiLastFailure=0, aiPhase='idle', aiLastException='';
let aiVocabularyCached=false, aiStartupSeconds=null, aiLoadStarted=0, importedLibrary=null;
let lastQuality={usable:true,reason:'standby'},lastQualityAt=0,regionCostMs=0,aiCostMs=0,skippedForQuality=0,weakSuggestions=0;
let wasmRuntime=null,wasmRuntimeAttempts=[],wasmRepairNeeded=false;
// Static GitHub Pages edition. No package manager, build tooling, or GitHub Actions required.
// AI model and ESM download at runtime; separate published text and vision towers.
const AI_MODULE_SOURCES = [
  'https://esm.sh/@huggingface/transformers@3.8.1?bundle&target=es2020',
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1',
  'https://unpkg.com/@huggingface/transformers@3.8.1/dist/transformers.web.js',
];
let aiSource='',aiImportFailures=[];
async function importAI() {
  if (importedLibrary) return importedLibrary;
  aiImportFailures=[];
  for (let i=0; i<AI_MODULE_SOURCES.length; i++) {
    const url=AI_MODULE_SOURCES[i];
    $('modelProgressText').textContent=ui(`Connecting to AI library (${i+1}/${AI_MODULE_SOURCES.length})…`,`جارٍ الاتصال بمكتبة الذكاء الاصطناعي (${i+1}/${AI_MODULE_SOURCES.length})…`);
    try {
      const lib=await import(/* @vite-ignore */ url);
      if(!lib.env || !lib.CLIPTextModelWithProjection || !lib.CLIPVisionModelWithProjection)throw new Error('Missing split-tower CLIP exports');
      aiSource=new URL(url).host;
      importedLibrary=lib;
      return lib;
    } catch (error) {
      aiImportFailures.push(`${new URL(url).host}: ${String(error?.message || error).slice(0,220)}`);
      console.warn('AI module import failed, trying next source:',url,error);
    }
  }
  throw new Error('All AI module sources failed. '+aiImportFailures.join(' | '));
}
let detectorModel=null,detectorPromise=null,detectorBusy=false,detectorTimer=null,detectorStatus='off',detectorLastError='',recentDetected=[],recentDetectedAt=0,trackHistory=new Map(),scansCompleted=0,confirmedCount=0,recognizedDisplay='';
let prefs=loadPrefs(),lang=prefs.language,rows=[],currentTab='survey',editUid=null,map=null,mapPins=null,editFromMap=false,mapPick=false,editingDraft=null;
let gpsSamples=[],mapPhoneLayer=null,editorMapSelection=null,editorGPSFix=null,editorDraft=null,transient=null,model=null,modelPromise=null,busy=false,stream=null,photoUrl=null,cameraLive=false,geoWatch=null,gpsFix=null,candidateBoxes=[],nextTrackId=1,scanTimer=null,regionTimer=null,latestRecord=null,sessionId=crypto.randomUUID?.()||String(Date.now()),lastLiveScan=0,lastToast=0,activeToken=0;
const ui=(en,ar)=>lang==='ar'?ar:en;
function describeAIError(error){
  const s=String(error?.message||error||'');
  if(navigator.onLine===false)return ui('You are offline. Connect to the internet and retry.','لا يوجد اتصال بالإنترنت. اتصل ثم أعد المحاولة.');
  if(aiPhase==='module')return ui('Could not connect to an AI library provider. Check Safari network/content blockers, then retry; manual GPS mapping remains available.','تعذر الاتصال بمصدر مكتبة الذكاء الاصطناعي. تحقق من شبكة سفاري وحظر المحتوى ثم أعد المحاولة. يبقى التسجيل اليدوي متاحاً.');
  if(/no available backend|importing a module script failed|wasm.*(import|backend)|onnx runtime helper/i.test(s))return ui('The AI compute runtime could not start. Tap Try another runtime to reload with a different provider. Your saved records are safe.','تعذر بدء محرك حساب الذكاء الاصطناعي. اضغط تجربة مصدر آخر لإعادة تحميل الصفحة بمصدر مختلف. السجلات محفوظة.');
  if(/out of memory|memory access|allocation|wasm.*memory|memory limit/i.test(s))return ui('The model ran out of device memory. Close other Safari tabs and retry.','الذاكرة غير كافية لتشغيل النموذج. أغلق علامات تبويب سفاري الأخرى.');
  if(/Could not locate file/i.test(s))return ui('A published model component was not found. Open Copy details to see the requested filename.','تعذر العثور على أحد ملفات النموذج. افتح نسخ التفاصيل لمعرفة اسم الملف.');
  if(/fetch|network|failed to load|import|http|404|403|blocked|cors|resource/i.test(s))return ui('A recognition-model file or compute component could not download. Check your connection and retry.','تعذر تحميل ملف من النموذج أو محرك الحساب. تحقق من الاتصال وأعد المحاولة.');
  return ui('AI initialization failed. You can still record sign locations manually.','فشل بدء الذكاء الاصطناعي. ما زال بإمكانك تسجيل اللوحات يدويًا.');
}
function aiDiagnostics(){
  return ['Road Sign Lens Pro v4.5 Phase 2','build: direct upload, MobileCLIP split-tower' , 'AI module source: '+(aiSource||'none'),'ONNX runtime source: '+(wasmRuntime?.name||'not selected'),'ONNX runtime files: '+(wasmRuntime?.mjs||'none')+' | '+(wasmRuntime?.wasm||'none'),'ONNX binary HEAD: '+(wasmRuntime?.probe||'not checked'),'ONNX attempts: '+(wasmRuntimeAttempts.length?wasmRuntimeAttempts.join(' | '):'none'),'model requests: text_model_quantized.onnx + vision_model.onnx','AI vocabulary reused: '+aiVocabularyCached,'AI startup seconds: '+(aiStartupSeconds??'pending'),'vision AI last pass ms: '+Math.round(aiCostMs),'region detection last ms: '+Math.round(regionCostMs),'image quality rejected: '+skippedForQuality,'weak AI matches rejected: '+weakSuggestions,'performance profile: '+prefs.performanceProfile,'browser model cache: '+(typeof caches !== 'undefined'?'supported':'unavailable'),'enhanced detector: '+detectorStatus+' '+detectorLastError,'import attempts: '+(aiImportFailures.length?aiImportFailures.join(' | '):'none'),'stage: '+aiPhase,'status: '+aiStatus,'browser: '+navigator.userAgent,'online: '+navigator.onLine,'site: '+location.origin+location.pathname,'error: '+(aiLastException||'none')].join('\n');
}
function syncAI(){
  const states={
    standby:[ui('AI: standby','الذكاء الاصطناعي: استعداد'),ui('Tap Prepare AI to start; previously downloaded files may be cached','اضغط تهيئة AI للبدء؛ قد تكون الملفات محفوظة في ذاكرة المتصفح'),ui('Standby','استعداد'),ui('Prepare AI','تهيئة AI')],
    loading:[ui('AI: loading…','الذكاء الاصطناعي: تحميل…'),ui('Preparing recognition engine; cached files are reused when available','جارٍ تجهيز محرك التعرف؛ ستُستخدم الملفات المحفوظة إن توفرت'),ui('Loading','جارٍ التحميل'),ui('Loading…','جارٍ التحميل…')],
    ready:[ui('AI: ready','الذكاء الاصطناعي: جاهز'),ui(`Ready in ${aiStartupSeconds??'—'}s · ${aiVocabularyCached?'saved descriptions reused':'descriptions saved for next time'}`,`جاهز خلال ${aiStartupSeconds??'—'} ث · ${aiVocabularyCached?'استُخدمت أوصاف محفوظة':'حُفظت الأوصاف للمرة القادمة'}`),ui('Ready','جاهز'),ui('Ready','جاهز')],
    failed:[ui('AI: unavailable','الذكاء الاصطناعي: غير متاح'),aiError||ui('Could not load model','تعذر تحميل النموذج'),ui('Failed','فشل'),wasmRepairNeeded?ui('Try another runtime (reload)','تجربة مصدر آخر (إعادة تحميل)'):ui('Retry AI','إعادة المحاولة')]
  };
  const current=states[aiStatus]||states.standby;
  $('modelChip').textContent=current[0];$('aiDetail').textContent=current[1];$('aiState').textContent=current[2];
  const b=$('prepareAiBtn');if(b){b.textContent=current[3];b.hidden=aiStatus==='ready';b.disabled=aiStatus==='loading';b.setAttribute('aria-busy',String(aiStatus==='loading'));}
  const d=$('aiDiagnosticsBtn');if(d)d.hidden=aiStatus!=='failed';
}
function updateAIState(state,error=''){aiStatus=state;aiError=error;syncAI();}

const label=s=>s?(lang==='ar'?s.ar:s.en):ui('Unknown sign','لوحة غير معروفة');
const when=at=>new Date(at).toLocaleString(lang==='ar'?'ar-OM':'en-GB',{dateStyle:'medium',timeStyle:'short'});
const coords=loc=>loc?`${Number(loc.lat).toFixed(6)}, ${Number(loc.lon).toFixed(6)}`:'—';
function safeGet(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function persist(){try{localStorage.setItem(STORAGE+'-records',JSON.stringify(rows.slice(0,650)));return true;}catch{toast(ui('Storage full or blocked. Export your survey and free browser space.','التخزين ممتلئ أو محظور. صدّر السجلات وأفرغ مساحة المتصفح.'));return false;}}
function savePrefs(){try{localStorage.setItem(STORAGE+'-prefs',JSON.stringify(prefs));}catch{}}
function migrate(){const old=safeGet('roadSignLensHistory');if(!Array.isArray(old))return [];return old.filter(r=>BY_ID[r.id]).map((r,i)=>({uid:r.uid||`legacy-${i}-${r.at}`,id:r.id,at:r.at||new Date().toISOString(),score:r.score??null,loc:r.loc||null,status:'pending',notes:'Migrated from Road Sign Lens v2',source:'legacy',session:'v2-import'}));}
rows=(safeGet(STORAGE+'-records')||migrate()).filter(r=>r&&r.uid&&BY_ID[r.id]&&r.at);if(rows.length)persist();
function toast(message){$('toastArea').textContent=message;clearTimeout(toast._timeout);toast._timeout=setTimeout(()=>$('toastArea').textContent='',5000);}
function nav(to){currentTab=to;all('.page').forEach(el=>{const yes=el.id===to+'Page';el.hidden=!yes;el.classList.toggle('active',yes);});all('[data-tab]').forEach(btn=>{const yes=btn.dataset.tab===to;btn.classList.toggle('current',yes);if(yes)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});const heads={survey:ui('Live survey','المسح المباشر'),map:ui('Sign map','خريطة اللوحات'),records:ui('Inventory','السجل'),catalog:ui('Sign library','دليل اللوحات'),settings:ui('Settings & access','الإعدادات والإتاحة')};$('headerLocation').textContent=heads[to];if(to!=='map'&&mapPick)cancelMapCorrection();if(to==='map'){requestAnimationFrame(()=>requestAnimationFrame(()=>{showMap();setTimeout(()=>map?.invalidateSize({pan:false}),250);}));}if(to==='records')renderRecords();if(to==='catalog')renderCatalog();window.scrollTo({top:0,behavior:'instant'});}
function changeLanguage(){lang=lang==='en'?'ar':'en';prefs.language=lang;savePrefs();document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';all('[data-en][data-ar]').forEach(n=>{if(n.tagName==='H1')n.innerHTML=n.dataset[lang];else n.textContent=n.dataset[lang];});$('langBtn').textContent=lang==='ar'?'English':'العربية';$('catalogSearch').placeholder=ui('Search 25 sign categories','ابحث في ٢٥ نوعاً من اللوحات');$('recordSearch').placeholder=ui('Search sign types or notes','ابحث بنوع اللوحة أو الملاحظات');$('photoPreview').alt=ui('Photo selected for analysis','الصورة المحددة للتحليل');$('video').setAttribute('aria-label',ui('Live rear-camera preview','معاينة الكاميرا الخلفية'));$('recordFilter').options[0].text=ui('All statuses','جميع الحالات');$('recordFilter').options[1].text=ui('Pending review','للمراجعة');$('recordFilter').options[2].text=ui('Reviewed','تمت المراجعة');$('intervalSetting').options[0].text=ui('Every 3.5 seconds','كل ٣٫٥ ثوان');$('intervalSetting').options[1].text=ui('Every 6 seconds','كل ٦ ثوان');$('intervalSetting').options[2].text=ui('Every 10 seconds','كل ١٠ ثوان');$('profileSetting').options[0].text=ui('Responsive · more camera updates','سريع · تحديثات أكثر');$('profileSetting').options[1].text=ui('Balanced · recommended','متوازن · موصى به');$('profileSetting').options[2].text=ui('Battery saver · slower updates','توفير البطارية · تحديثات أبطأ');$('radiusSetting').options[0].text=ui('15 metres','١٥ متراً');$('radiusSetting').options[1].text=ui('35 metres','٣٥ متراً');$('radiusSetting').options[2].text=ui('60 metres','٦٠ متراً');$('sidebarStatus').textContent=cameraLive?ui('Survey active','المسح نشط'):ui('Survey ready','جاهز للمسح');$('cameraBtnLabel').textContent=cameraLive?ui('Stop camera','إيقاف الكاميرا'):ui('Start camera','تشغيل الكاميرا');$('gpsBtn').textContent=geoWatch!==null?ui('Disable','إيقاف'):ui('Enable','تفعيل');$('regionCount').textContent=ui(`${candidateBoxes.length} possible regions`,`${candidateBoxes.length} مناطق محتملة`);$('viewfinderLabel').textContent=ui('LIVE SIGN TRACKING','تتبع اللوحات المباشر');syncDetectorUI();syncAI();renderStats();renderRecords();renderMapList();renderCatalog();renderLatest();nav(currentTab);}
function applyPrefs(){if($('autoPrepareToggle'))$('autoPrepareToggle').checked=Boolean(prefs.autoPrepare);document.body.classList.toggle('high-contrast',prefs.contrast);document.body.classList.toggle('large-text',prefs.largeText);document.body.classList.toggle('reduce-motion',prefs.reduceMotion);$('contrastSetting').checked=prefs.contrast;$('largeTextSetting').checked=prefs.largeText;$('motionSetting').checked=prefs.reduceMotion;$('intervalSetting').value=String(prefs.interval);$('radiusSetting').value=String(prefs.radius);$('profileSetting').value=['responsive','balanced','battery'].includes(prefs.performanceProfile)?prefs.performanceProfile:'balanced';$('liveToggle').checked=prefs.live;$('autosaveToggle').checked=prefs.autosave;$('enhancedDetectorToggle').checked=Boolean(prefs.enhancedDetector);syncDetectorUI();}
function renderStats(){$('totalStat').textContent=rows.length;$('pendingStat').textContent=rows.filter(r=>r.status!=='reviewed').length;$('mappedStat').textContent=rows.filter(r=>r.loc).length;$('gpsStat').textContent=gpsFix?(Math.round(gpsFix.accuracy)||'?')+'m':'—';$('gpsStatCaption').textContent=gpsFix?ui('Phone horizontal accuracy','الدقة الأفقية للهاتف'):ui('GPS permission off','صلاحية GPS غير مفعلة');$('sidebarCount').textContent=rows.length;renderValidation();}
function gpsStatusLabel(fix){
 const status=fixAssessment(fix);
 if(status.tier==='none')return ui('Waiting for phone GPS','بانتظار موقع الهاتف');
 if(status.tier==='stale')return ui('GPS stale · wait for a fresh fix','بيانات GPS قديمة · انتظر تحديث الموقع');
 if(status.tier==='poor')return ui(`GPS too imprecise (±${Math.round(fix.accuracy)} m) · not mapped automatically`,`GPS غير دقيق (±${Math.round(fix.accuracy)} م) · لن يُسجل تلقائياً`);
 if(status.tier==='invalid')return ui('Invalid GPS reading','قراءة GPS غير صالحة');
 return ui(`Phone GPS ±${Math.round(fix.accuracy)} m · ${status.ageSeconds}s old · ${status.tier==='good'?'good':'approximate'}`,`GPS الهاتف ±${Math.round(fix.accuracy)} م · قبل ${status.ageSeconds} ث · ${status.tier==='good'?'جيد':'تقريبي'}`);
}
function updateGPS(){
 const enabled=geoWatch!==null,fix=choosePhoneFix(gpsSamples);
 $('gpsBtn').textContent=enabled?ui('Disable','إيقاف'):ui('Enable','تفعيل');
 $('gpsBtn').setAttribute('aria-pressed',String(enabled));
 $('gpsDetail').textContent=enabled?gpsStatusLabel(gpsFix):ui('Off · no location collected','متوقف · لا تُجمع المواقع');
 const status=$('mapGpsQuality');if(status){status.parentElement.dataset.quality=fixAssessment(gpsFix).tier;status.textContent=enabled?gpsStatusLabel(gpsFix):ui('Phone GPS is off. Enable it in Survey to tag new observations.','GPS الهاتف متوقف. فعّله في المسح لربط المشاهدات بالموقع.');status.dataset.quality=fixAssessment(gpsFix).tier;}
 if($('mapPhoneTip'))$('mapPhoneTip').textContent=fix?ui('Blue circle = phone GPS uncertainty, not the signpost location.','الدائرة الزرقاء = نطاق عدم يقين موقع الهاتف، لا موقع اللوحة.') :ui('Sign pins show recorded locations; adjust each sign individually.','تمثل العلامات مواقع مسجلة؛ صحح كل لوحة على حدة.');
 renderStats();renderPhonePosition();
}
function fromPosition(pos){return positionSample(pos);}
function enableGPS(){
 if(!navigator.geolocation){toast(ui('Location unavailable. Enter sign coordinates manually.','الموقع غير متاح. أدخل إحداثيات اللوحة يدوياً.'));return;}
 if(geoWatch!==null)return;
 geoWatch=navigator.geolocation.watchPosition(p=>{
   const sample=fromPosition(p);
   if(!sample)return;
   // Brief in-memory history; never send the phone's movement history to the server.
   gpsSamples=[...gpsSamples.filter(f=>Date.now()-Date.parse(f.at)<25000),sample].slice(-12);
   gpsFix=sample;updateGPS();
 },e=>{toast(ui(`GPS unavailable: ${e.message}`,`GPS غير متاح: ${e.message}`));stopGPS();},{enableHighAccuracy:true,maximumAge:2000,timeout:18000});
 updateGPS();
}
function stopGPS(){if(geoWatch!==null)navigator.geolocation.clearWatch(geoWatch);geoWatch=null;gpsFix=null;gpsSamples=[];updateGPS();}
function currentFix(){return choosePhoneFix(gpsSamples);}
function addRecord(record,{announce=true}={}){rows.unshift(record);rows=rows.slice(0,650);persist();transient=null;latestRecord=record.uid;renderStats();renderRecords();renderMapList();if(currentTab==='map')renderPins();renderLatest();if(announce)toast(ui(`Saved ${label(BY_ID[record.id])} · pending review`,`تم تسجيل ${label(BY_ID[record.id])} · بانتظار المراجعة`));return true;}
function newUid(){return crypto.randomUUID?.()||`r-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function recordSign(sign,score,{automatic=true,source='camera'}={}){const location=source==='camera'?currentFix():null;const record={uid:newUid(),id:sign.id,aiSuggestedId:sign.id,at:new Date().toISOString(),score,source,loc:location,status:'pending',notes:'',session:sessionId};if(automatic&&shouldDeduplicate(rows,record,Number(prefs.radius))){return null;}addRecord(record,{announce:!automatic});return record;}
function updateRecord(r){const index=rows.findIndex(item=>item.uid===r.uid);if(index<0)return;rows[index]=r;persist();renderStats();renderRecords();renderMapList();renderLatest();renderPins();}
function make(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
function empty(text){return make('p','empty-state',text);}
function renderValidation(){
 const s=verificationSummary(rows);
 const info=$('validationSummary');if(info)info.textContent=s.reviewed?
   ui(`${s.accepted} unchanged · ${s.corrected} corrected out of ${s.reviewed} reviewer-checked AI suggestions. This is not field accuracy.`,`${s.accepted} دون تعديل · ${s.corrected} مصححة من أصل ${s.reviewed} اقتراحات تمت مراجعتها. هذا ليس مقياس الدقة الميدانية.`):
   ui('No AI suggestions reviewed yet. Correct a proposed sign type and mark the record reviewed to collect feedback.','لا توجد اقتراحات تمت مراجعتها بعد. صحح نوع اللوحة واعتمد السجل لتسجيل الملاحظات.');
}
function downloadValidation(){
 const reviewed=rows.filter(r=>r.aiSuggestedId&&r.status==='reviewed');
 if(!reviewed.length){toast(ui('Review AI suggestions before exporting results.','راجع اقتراحات الذكاء الاصطناعي قبل التصدير.'));return;}
 const columns=['record_id','observed_at','suggested_sign_id','reviewed_sign_id','agreed','reviewed_at'];
 const csv='\uFEFF'+[columns.map(csvQuote).join(','),...reviewed.map(r=>[r.uid,r.at,r.aiSuggestedId,r.id,r.aiSuggestedId===r.id?'yes':'no',r.reviewedAt||''].map(csvQuote).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),anchor=document.createElement('a');
 anchor.href=url;anchor.download='road-sign-ai-review-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
 toast(ui('Reviewer feedback exported; no photos or GPS coordinates included.','تم تصدير مراجعات المستخدم دون صور أو إحداثيات.'));
}
function renderRecords(){const q=$('recordSearch').value.trim().toLowerCase(),filter=$('recordFilter').value;const shown=rows.filter(r=>(filter==='all'||(filter==='pending'?r.status!=='reviewed':r.status==='reviewed'))&&(!q||[r.id,BY_ID[r.id]?.en,BY_ID[r.id]?.ar,r.notes].join(' ').toLowerCase().includes(q)));$('recordCount').textContent=ui(`${shown.length} of ${rows.length} observations`,`${shown.length} من ${rows.length} مشاهدة`);const list=$('inventoryList');list.replaceChildren();if(!shown.length){list.append(empty(ui('No observations match your search.','لا توجد مشاهدات مطابقة.')));return;}for(const r of shown){const entry=make('article','inventory-entry');const icon=make('span','inventory-symbol',BY_ID[r.id].emoji);icon.setAttribute('aria-hidden','true');const info=make('div','inventory-info');const title=make('strong','',label(BY_ID[r.id]));const time=make('small','',when(r.at));const meta=make('div','entry-meta');const badge=make('span','entry-status'+(r.status==='reviewed'?' reviewed':''),r.status==='reviewed'?ui('Reviewed','تمت المراجعة'):ui('Pending review','بانتظار المراجعة'));const location=make('small','',r.loc?`⌖ ${coords(r.loc)}`:ui('⌖ No coordinates','⌖ دون إحداثيات'));meta.append(badge,location);info.append(title,time,meta);if(r.road)info.append(make('small','',r.road));if(r.condition&&r.condition!=='unknown')info.append(make('small','',ui('Sign: '+r.condition,'حالة اللوحة: '+r.condition)));if(r.notes)info.append(make('small','',r.notes));const action=make('button','entry-action',ui('Review','مراجعة'));action.type='button';action.setAttribute('aria-label',ui(`Review ${label(BY_ID[r.id])} from ${when(r.at)}`,`مراجعة ${label(BY_ID[r.id])} بتاريخ ${when(r.at)}`));action.addEventListener('click',()=>openEditor(r.uid));entry.append(icon,info,action);list.append(entry);}}
function renderMapList(){
 const list=$('mapRecordList');list.replaceChildren();
 const mapped=rows.filter(r=>r.loc&&validLatLon(Number(r.loc.lat),Number(r.loc.lon)));
 $('mapCount').textContent=mapped.length;
 if(!mapped.length){list.append(empty(ui('No map pins yet. Enable GPS for stationary scans or enter sign coordinates manually.','لا توجد مواقع بعد. فعّل GPS عند التوقف أو أدخل إحداثيات اللوحة يدوياً.')));return;}
 for(const r of mapped){
  const row=make('article','map-record geo-record');
  const icon=make('span','',BY_ID[r.id].emoji);icon.setAttribute('aria-hidden','true');
  const info=make('div','geo-record-info');info.append(make('strong','',label(BY_ID[r.id])),make('small','',coords(r.loc)),make('small','',
    ui(provenanceText(r.loc),r.loc.source==='phone'?`موقع الهاتف ±${Math.round(r.loc.accuracy||0)} م · تقريبي`:r.loc.source==='map'?'الموقع مصحح بالخريطة · يحتاج مراجعة':'موقع مدخل يدوياً · يحتاج مراجعة')),
    make('small','',r.status==='reviewed'?ui('Reviewed','تمت المراجعة'):ui('Pending verification','بانتظار التحقق')));
  const actions=make('div','geo-record-actions');
  const inspect=make('button','btn btn-outline geo-small',ui('Review','مراجعة'));inspect.type='button';inspect.addEventListener('click',()=>openEditor(r.uid));
  const correct=make('button','btn btn-outline geo-small',ui('Correct pin','تصحيح الموقع'));correct.type='button';correct.addEventListener('click',()=>startMapCorrection(r.uid));
  actions.append(inspect,correct);row.append(icon,info,actions);list.append(row);
 }
}
function renderCatalog(){const grid=$('catalogGrid');grid.replaceChildren();const q=$('catalogSearch').value.trim().toLowerCase();const selected=SIGNS.filter(s=>[s.en,s.ar,s.group,s.meaning.join(' ')].join(' ').toLowerCase().includes(q));if(!selected.length){grid.append(empty(ui('No signs match the search.','لا توجد لوحات مطابقة.')));return;}for(const s of selected){const card=make('article','catalog-card');const em=make('div','emoji',s.emoji);em.setAttribute('aria-hidden','true');card.append(em,make('span','group',s.group),make('strong','',label(s)),make('p','',s.meaning[lang==='ar'?1:0]));grid.append(card);}}
function renderLatest(){const r=transient||rows.find(x=>x.uid===latestRecord);$('candidateEmpty').hidden=!!r;$('candidateResult').hidden=!r;$('candidateTag').textContent=transient?ui('NOT SAVED','غير محفوظ'):r?(r.status==='reviewed'?ui('REVIEWED','تمت المراجعة'):ui('PENDING','للمراجعة')):ui('WAITING','بانتظار الرصد');if(!r)return;$('latestEmoji').textContent=BY_ID[r.id].emoji;$('latestName').textContent=label(BY_ID[r.id]);$('latestSecondary').textContent=lang==='ar'?BY_ID[r.id].en:BY_ID[r.id].ar;$('latestHint').textContent=ui('Relative similarity score († not calibrated confidence). Verify sign type and signpost location.','درجة تقارب نسبية († ليست دقة مُعايرة). تحقّق من اللوحة وموقعها.');$('latestScore').textContent=r.score!=null?(r.score*100).toFixed(1)+'%†':ui('Manual','يدوي');$('latestTime').textContent=when(r.at);$('latestReviewBtn').disabled=false;$('latestReviewBtn').textContent=transient?ui('Save & review suggestion →','حفظ المقترح ومراجعته ←'):ui('Review in inventory →','مراجعة في السجل ←');}
// Leaflet is an enhancement: full access to records remains through the text list.
let mapTileErrorCount=0;
function showMap(){
 const el=$('mapCanvas');if(!el||$('mapPage').hidden)return;
 if(!window.L){$('mapLoadHint').textContent=ui('Map tiles unavailable. Coordinates and the accessible record list remain usable.','خريطة الخلفية غير متاحة. لا تزال الإحداثيات وقائمة السجلات متاحة.');return;}
 try{
  if(!map){
   const firstMapped=rows.find(r=>r.loc&&validLatLon(Number(r.loc.lat),Number(r.loc.lon)));const preferred=currentFix()||firstMapped?.loc;
   map=L.map(el,{zoomControl:true,scrollWheelZoom:false,preferCanvas:true}).setView(preferred?[preferred.lat,preferred.lon]:[24.2507,55.7931],preferred?16:13);
   const tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
   tiles.on('tileerror',()=>{mapTileErrorCount++;if(mapTileErrorCount>=3)$('mapLoadHint').textContent=ui('Map tiles are not loading. Check internet; coordinates and sign records are still available.','تعذر تحميل طبقات الخريطة. تحقق من الإنترنت؛ الإحداثيات والسجلات محفوظة.');});
   tiles.on('tileload',()=>{mapTileErrorCount=0;});tiles.addTo(map);
   mapPins=L.layerGroup().addTo(map);mapPhoneLayer=L.layerGroup().addTo(map);
   map.on('click',e=>{
    if(!mapPick)return;
    const picked={lat:e.latlng.lat,lon:e.latlng.lng};
    if(!validLatLon(picked.lat,picked.lon))return;
    mapPick=false;$('cancelMapPickBtn').hidden=true;
    editorMapSelection={...picked,source:'map'};
    editingDraft=picked;
    $('mapLoadHint').textContent=ui('Pin selected. Verify and save the coordinates in the editor.','تم تحديد الموقع. تحقق من الإحداثيات واحفظها في نافذة التحرير.');
    openEditor(editUid,picked);
   });
  }
  map.invalidateSize({pan:false});renderPins();renderPhonePosition();
  requestAnimationFrame(()=>map?.invalidateSize({pan:false}));setTimeout(()=>map?.invalidateSize({pan:false}),350);
 }catch(err){$('mapLoadHint').textContent=ui('Map display failed. Records and coordinates remain accessible below.','تعذر عرض الخريطة. تظل السجلات والإحداثيات متاحة أدناه.');console.warn('Road Sign Lens map',err);}
}
function renderPhonePosition(){
 if(!map||!mapPhoneLayer)return;
 mapPhoneLayer.clearLayers();
 const fix=choosePhoneFix(gpsSamples);if(!fix)return;
 // Circle radius expresses the phone's reported horizontal accuracy, not sign accuracy.
 L.circle([fix.lat,fix.lon],{radius:Math.min(300,fix.accuracy),color:'#227fb6',weight:2,fillColor:'#4fa8df',fillOpacity:.10,interactive:false}).addTo(mapPhoneLayer);
 L.circleMarker([fix.lat,fix.lon],{radius:6,color:'#ffffff',weight:2,fillColor:'#248dce',fillOpacity:1,interactive:false}).addTo(mapPhoneLayer);
}
function renderPins(){
 if(!map||!mapPins)return;mapPins.clearLayers();
 for(const r of rows){if(!r.loc||!validLatLon(Number(r.loc.lat),Number(r.loc.lon)))continue;
  const div=L.divIcon({className:'',html:`<div class="sign-marker ${r.status==='reviewed'?'reviewed':''}" aria-hidden="true">${BY_ID[r.id].emoji}</div>`,iconSize:[35,35],iconAnchor:[18,18]});
  const marker=L.marker([r.loc.lat,r.loc.lon],{icon:div,title:label(BY_ID[r.id]),recordId:r.uid}).addTo(mapPins);
  const wrap=document.createElement('div');
  wrap.append(make('strong','',label(BY_ID[r.id])),make('p','',coords(r.loc)),make('p','',ui(provenanceText(r.loc),r.loc.source==='phone'?'موقع الهاتف · تقريبي':r.loc.source==='map'?'موقع مصحح بالخريطة':'موقع يدوي')));
  const inspect=make('button','entry-action',ui('Review','مراجعة'));inspect.type='button';inspect.addEventListener('click',()=>openEditor(r.uid));
  const correct=make('button','entry-action',ui('Correct pin','تصحيح الموقع'));correct.type='button';correct.addEventListener('click',()=>{map?.closePopup();startMapCorrection(r.uid);});
  wrap.append(inspect,correct);marker.bindPopup(wrap);
 }
}
function fitMapPins(){
 nav('map');requestAnimationFrame(()=>requestAnimationFrame(()=>{showMap();if(!map)return;
 const positions=rows.filter(r=>r.loc&&validLatLon(Number(r.loc.lat),Number(r.loc.lon))).map(r=>[r.loc.lat,r.loc.lon]);
 if(positions.length>1)map.fitBounds(L.latLngBounds(positions),{padding:[35,35],maxZoom:17});
 else if(positions.length===1)map.setView(positions[0],17);
 else toast(ui('No mapped observations yet.','لا توجد مشاهدات على الخريطة بعد.'));
 }));
}
function cancelMapCorrection(){mapPick=false;editFromMap=false;editingDraft=null;editorDraft=null;editorMapSelection=null;editUid=null;$('cancelMapPickBtn').hidden=true;$('mapLoadHint').textContent=ui('Pin correction cancelled. No coordinates were changed.','أُلغي تصحيح الموقع. لم تُعدّل أي إحداثيات.');}
function startMapCorrection(uid){
 const r=rows.find(x=>x.uid===uid);if(!r)return;
 editUid=uid;editFromMap=true;mapPick=true;editorDraft=null;editingDraft=null;editorMapSelection=null;
 $('cancelMapPickBtn').hidden=false;nav('map');
 if(r.loc&&map)map.setView([r.loc.lat,r.loc.lon],Math.max(16,map.getZoom()));
 $('mapLoadHint').textContent=ui(`Tap the map at the actual ${label(BY_ID[r.id])} signpost location. No change is saved until you confirm in the editor.`,`اضغط على موقع عمود ${label(BY_ID[r.id])} الحقيقي. لن يُحفظ التعديل حتى تؤكده في نافذة التحرير.`);
 $('cancelMapPickBtn').focus();
}
async function centerMap(){
 nav('map');if(!navigator.geolocation){toast(ui('Location unavailable.','الموقع غير متاح.'));return;}
 const existing=choosePhoneFix(gpsSamples);
 if(existing){showMap();map?.setView([existing.lat,existing.lon],16);return;}
 navigator.geolocation.getCurrentPosition(p=>{const fix=fromPosition(p);if(!fix)return;showMap();map?.setView([fix.lat,fix.lon],16);},e=>toast(ui(e.message,e.message)),{enableHighAccuracy:true,timeout:15000});
}
function openEditor(uid=null,override=null){editUid=uid;editorGPSFix=null;const r=rows.find(x=>x.uid===uid);$('dialogTitle').textContent=r?ui('Review sign observation','مراجعة لوحة مرورية'):ui('New manual observation','تسجيل مشاهدة يدوية');$('editSign').replaceChildren(...SIGNS.map(s=>{const option=new Option(label(s),s.id);return option;}));$('editSign').value=r?.id||'stop';$('editLat').value=override?.lat??r?.loc?.lat??'';$('editLon').value=override?.lon??r?.loc?.lon??'';$('editNotes').value=r?.notes||'';$('editCondition').value=r?.condition||'unknown';$('editPole').value=r?.pole||'unknown';$('editRoad').value=r?.road||'';$('editReviewed').checked=r?.status==='reviewed';$('deleteRecordBtn').hidden=!r;$('editLocationSource').textContent=editorMapSelection?ui('Map-selected position: check and save. Not a surveyed GPS measurement.','موقع محدد من الخريطة: تحقق ثم احفظ. ليس قياس GPS ميداني.'):r?.loc?ui(`Source: ${r.loc.source==='phone'?'phone GPS':r.loc.source}. GPS accuracy: ${r.loc.accuracy??'—'} metres.`,`المصدر: ${r.loc.source==='phone'?'GPS الهاتف':r.loc.source}. الدقة: ${r.loc.accuracy??'—'} متر.`):ui('No coordinates set · edit manually, use GPS, or choose on the map.','لا توجد إحداثيات · أدخلها يدويًا أو حدد عبر GPS أو الخريطة.');if(editorDraft){$('editSign').value=editorDraft.id;$('editNotes').value=editorDraft.notes;$('editReviewed').checked=editorDraft.reviewed;$('editCondition').value=editorDraft.condition;$('editPole').value=editorDraft.pole;$('editRoad').value=editorDraft.road;editorDraft=null;}$('recordDialog').showModal();}
function closeEditor(){$('recordDialog').close();editUid=null;editorMapSelection=null;editFromMap=false;}
function saveEditor(){const a=$('editLat').value.trim(),b=$('editLon').value.trim(),hasA=a!=='',hasB=b!=='';if(hasA!==hasB){toast(ui('Enter both latitude and longitude or leave both blank.','أدخل خط العرض والطول معاً أو اتركهما فارغين.'));return false;}const lat=Number(a),lon=Number(b);if(hasA&&!validLatLon(lat,lon)){toast(ui('Coordinates out of range. Latitude −90..90, longitude −180..180.','إحداثيات خارج النطاق. العرض من −٩٠ إلى ٩٠ والطول من −١٨٠ إلى ١٨٠.'));return false;}const old=rows.find(r=>r.uid===editUid);const fromFreshGPS=editorGPSFix&&Math.abs(lat-editorGPSFix.lat)<.0000008&&Math.abs(lon-editorGPSFix.lon)<.0000008;const unchanged=old?.loc&&lat===Number(old.loc.lat)&&lon===Number(old.loc.lon);const newLoc=hasA?(fromFreshGPS?{...editorGPSFix,gpsAt:editorGPSFix.at,positionVerified:false}:unchanged?{...old.loc}:correctedPosition(lat,lon,{source:editorMapSelection?'map':'manual',previous:old?.loc,phoneFix:currentFix()})):null;
if(old?.status==='reviewed'&&newLoc&&!unchanged&&$('editReviewed').checked){$('editReviewed').checked=false;toast(ui('Position changed: review status reset. Verify the sign location and review again.','تغير الموقع: أعيدت حالة السجل إلى المراجعة. تحقق من الموقع ثم اعتمده.'));}
if($('editReviewed').checked&&!hasA){toast(ui('Enter the sign position before marking it reviewed.','أدخل موقع اللوحة قبل اعتماد المراجعة.'));return false;}const record={uid:old?.uid||newUid(),at:old?.at||new Date().toISOString(),source:old?.source||'manual',session:old?.session||sessionId,score:old?.score??null,aiSuggestedId:old?.aiSuggestedId??null,reviewedAt:$('editReviewed').checked?old?.reviewedAt||new Date().toISOString():null,id:$('editSign').value,notes:$('editNotes').value.trim(),status:$('editReviewed').checked?'reviewed':'pending',condition:$('editCondition').value,pole:$('editPole').value,road:$('editRoad').value.trim(),loc:newLoc};if(old){updateRecord(record);toast(ui('Observation updated.','تم تحديث المشاهدة.'));}else{addRecord(record);}closeEditor();return true;}
async function editorGPS(){
 if(!navigator.geolocation){toast(ui('GPS unavailable in this browser.','GPS غير متاح.'));return;}
 toast(ui('Requesting a fresh phone location…','جارٍ طلب موقع هاتف جديد…'));
 navigator.geolocation.getCurrentPosition(p=>{
  const fix=fromPosition(p),status=fixAssessment(fix);
  if(!status.usable){toast(ui('Phone location is too imprecise or old. Try again outdoors or select the sign on the map.','موقع الهاتف غير دقيق أو قديم. حاول في مكان مفتوح أو اختر موقع اللوحة على الخريطة.'));return;}
  editorMapSelection=null;editorGPSFix=fix;
  $('editLat').value=fix.lat.toFixed(6);$('editLon').value=fix.lon.toFixed(6);
  $('editLocationSource').textContent=ui(`Phone GPS ±${Math.round(fix.accuracy)} m. This is the phone's position, NOT the signpost location.`,`GPS الهاتف ±${Math.round(fix.accuracy)} م. هذا موقع الهاتف وليس اللوحة.`);
 },e=>toast(ui(`GPS error: ${e.message}`,`خطأ GPS: ${e.message}`)),{enableHighAccuracy:true,maximumAge:0,timeout:18000});
}
function editorMapPick(){editorDraft={id:$('editSign').value,notes:$('editNotes').value,reviewed:$('editReviewed').checked,condition:$('editCondition').value,pole:$('editPole').value,road:$('editRoad').value};const lat=$('editLat').value,lon=$('editLon').value;editingDraft=lat!==''&&lon!==''?{lat:Number(lat),lon:Number(lon)}:null;editFromMap=true;mapPick=true;editorMapSelection=null;$('cancelMapPickBtn').hidden=false;$('recordDialog').close();nav('map');toast(ui('Tap the actual sign location on the map.','اضغط موقع اللوحة الفعلي على الخريطة.'));}
function csvQuote(x){let value=String(x??'');if(typeof x==='string'&&/^[\s]*[=+@-]/.test(value))value="'"+value;return '"'+value.replaceAll('"','""')+'"';}
function xmlEscape(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));}
function exportData(format){let content,name,type;const fileDate=new Date().toISOString().slice(0,10);const mapped=rows.filter(r=>r.loc&&validLatLon(Number(r.loc.lat),Number(r.loc.lon)));
 if(format==='geojson'){content=JSON.stringify({type:'FeatureCollection',name:'Road Sign Lens Pro',features:rows.map(r=>geoFeature(r,BY_ID[r.id]))},null,2);name='road-sign-inventory-'+fileDate+'.geojson';type='application/geo+json';}
 else if(format==='csv'){const cols=['uid','sign_id','sign_en','sign_ar','latitude','longitude','gps_accuracy_m','location_source','gps_fix_at','phone_reference_lat','phone_reference_lon','phone_reference_accuracy_m','observed_at','review_status','sign_condition','post_condition','road','ai_similarity_score','ai_suggested_sign_id','reviewed_at','notes','session'];content='\uFEFF'+[cols.join(','),...rows.map(r=>[r.uid,r.id,BY_ID[r.id]?.en,BY_ID[r.id]?.ar,r.loc?.lat,r.loc?.lon,r.loc?.accuracy,r.loc?.source,r.loc?.gpsAt||r.loc?.phoneReference?.at||(r.loc?.source==='phone'?r.loc?.at:'')||'',r.loc?.phoneReference?.lat,r.loc?.phoneReference?.lon,r.loc?.phoneReference?.accuracy,r.at,r.status,r.condition||'unknown',r.pole||'unknown',r.road||'',r.score,r.aiSuggestedId||'',r.reviewedAt||'',r.notes,r.session].map(csvQuote).join(','))].join('\r\n');name='road-sign-inventory-'+fileDate+'.csv';type='text/csv;charset=utf-8';}
 else{content='<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Road Sign Lens Pro</name>'+mapped.map(r=>`<Placemark><name>${xmlEscape(BY_ID[r.id].en)}</name><description>${xmlEscape(`Status: ${r.status}; sign: ${r.condition||'unknown'}; pole: ${r.pole||'unknown'}; road: ${r.road||''}; ${r.notes}; location source: ${r.loc.source}`)}</description><Point><coordinates>${r.loc.lon},${r.loc.lat},0</coordinates></Point></Placemark>`).join('')+'</Document></kml>';name='road-sign-inventory-'+fileDate+'.kml';type='application/vnd.google-earth.kml+xml';}
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast(ui(`Exported ${rows.length} records.`, `تم تصدير ${rows.length} سجلاً.`));}
function toggleCameraUI(){const shown=cameraLive||!!photoUrl;$('cameraFallback').hidden=shown;$('cameraChip').classList.toggle('live',cameraLive);$('cameraChipText').textContent=cameraLive?ui('Camera live','الكاميرا تعمل'):photoUrl?ui('Photo selected','تم اختيار صورة'):ui('Camera offline','الكاميرا مغلقة');$('cameraBtnLabel').textContent=cameraLive?ui('Stop camera','إيقاف الكاميرا'):ui('Start camera','تشغيل الكاميرا');$('scanBtn').disabled=!shown||busy;$('sidebarLed').classList.toggle('on',cameraLive);$('sidebarStatus').textContent=cameraLive?ui('Survey active','المسح نشط'):ui('Survey ready','جاهز للمسح');}
function stopCamera(){activeToken++;lastQuality={usable:true,reason:'standby'};lastQualityAt=0;syncQualityUI();if(stream){for(const track of stream.getTracks())track.stop();stream=null;}$('video').srcObject=null;cameraLive=false;clearTimeout(regionTimer);clearTimeout(scanTimer);clearTimeout(detectorTimer);candidateBoxes=[];recentDetected=[];nextTrackId=1;trackHistory.clear();drawBoxes([]);updateTrackSummary();toggleCameraUI();}
async function startCamera(){if(cameraLive){stopCamera();return;}if(!navigator.mediaDevices?.getUserMedia){toast(ui('Camera needs HTTPS and Safari permission. Use photo upload if unavailable.','تحتاج الكاميرا إلى HTTPS وصلاحية سفاري. يمكن رفع صورة.'));return;}try{if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;$('photoPreview').hidden=true;}const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});stream=s;$('video').srcObject=stream;await $('video').play();cameraLive=true;$('video').hidden=false;toggleCameraUI();const token=++activeToken;regionLoop(token);if(prefs.live){void ensureModel().catch(()=>{});aiLoop(token);}if(prefs.enhancedDetector)startDetectorLoop(token);s.getVideoTracks()[0]?.addEventListener('ended',()=>{if(cameraLive)stopCamera();},{once:true});}catch(err){stopCamera();toast(ui(`Camera unavailable: ${err.message}`,`الكاميرا غير متاحة: ${err.message}`));}}
async function selectPhoto(file){if(!file||!file.type.startsWith('image/')){toast(ui('Select an image.','اختر ملف صورة.'));return;}if(file.size>20*1024*1024){toast(ui('Photo must be under 20 MB.','يجب أن تقل الصورة عن ٢٠ ميجابايت.'));return;}stopCamera();if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=URL.createObjectURL(file);$('photoPreview').src=photoUrl;try{await $('photoPreview').decode();$('video').hidden=true;$('photoPreview').hidden=false;const frame=drawInputFrame();candidateBoxes=detectRegions(frame);drawBoxes(candidateBoxes);$('regionCount').textContent=ui(`${candidateBoxes.length} possible regions`,`${candidateBoxes.length} مناطق محتملة`);toggleCameraUI();void ensureModel().catch(()=>{});}catch{URL.revokeObjectURL(photoUrl);photoUrl=null;toast(ui('Could not open this image. Try a JPG or PNG.','تعذر فتح الصورة. جرّب JPG أو PNG.'));toggleCameraUI();}}
function drawInputFrame(){const source=photoUrl?$('photoPreview'):$('video');const w=source.videoWidth||source.naturalWidth,h=source.videoHeight||source.naturalHeight;if(!w||!h)throw Error('Camera frame is not ready');const stage=$('cameraStage');const cw=256,ch=Math.max(144,Math.round(256*stage.clientHeight/Math.max(1,stage.clientWidth)));const c=$('scanCanvas');c.width=cw;c.height=ch;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#14263a';ctx.fillRect(0,0,cw,ch);const sc=Math.min(cw/w,ch/h),dw=w*sc,dh=h*sc;ctx.drawImage(source,(cw-dw)/2,(ch-dh)/2,dw,dh);return ctx.getImageData(0,0,cw,ch);}
function syncDetectorUI(){
 const status=$('enhancedDetectorStatus');if(!status)return;
 status.textContent=detectorStatus==='ready'?ui('Stop-sign detector ready','كاشف قف جاهز'):
 detectorStatus==='loading'?ui('Downloading optional detector…','جارٍ تحميل الكاشف الإضافي…'):
 detectorStatus==='failed'?ui('Optional detector unavailable; color tracking still works.','الكاشف الإضافي غير متاح؛ يتواصل التتبع اللوني.'):
 prefs.enhancedDetector?ui('Waiting for camera and AI…','بانتظار الكاميرا والذكاء الاصطناعي…'):
 ui('Off · reduces memory and data use','متوقف · لتقليل استهلاك الذاكرة والبيانات');
 $('enhancedDetectorToggle').disabled=false;
}
function syncQualityUI(){
 const el=$('scanQuality'),cost=$('scanTiming');if(!el||!cost)return;
 const names={standby:ui('Waiting for camera','بانتظار الكاميرا'),ready:ui('Image quality: usable','جودة الصورة: مناسبة'),'too-dark':ui('Image too dark · add light','الصورة مظلمة · حسن الإضاءة'),overexposed:ui('Too bright · reduce glare','الصورة شديدة السطوع · قلل الوهج'),'low-detail':ui('Low detail · hold steady / move closer','تفاصيل قليلة · ثبّت الهاتف أو اقترب'),'no-region':ui('Waiting for a stable sign region','بانتظار منطقة لوحة ثابتة'),'no-frame':ui('Waiting for camera frame','بانتظار صورة الكاميرا')};
 el.textContent=names[lastQuality.reason]||names.standby;el.dataset.state=lastQuality.usable?'good':'poor';
 cost.textContent=ui(`Region ${Math.round(regionCostMs)} ms · AI ${Math.round(aiCostMs)} ms · ignored ${skippedForQuality} weak frames`, `الرصد ${Math.round(regionCostMs)} ملث · AI ${Math.round(aiCostMs)} ملث · تجاهل ${skippedForQuality} إطارات ضعيفة`);
}
function updateTrackSummary(){
 const live=candidateBoxes.filter(b=>b.missed===0);
 $('regionCount').textContent=ui(`${live.length} tracks · ${confirmedCount} confirmed`,`${live.length} مسارات · ${confirmedCount} مؤكدة`);
 $('liveTrackCount').textContent=String(live.length);
 $('liveScanCount').textContent=String(scansCompleted);
 $('liveConfirmedCount').textContent=String(confirmedCount);
}
function drawBoxes(boxes){
 const overlay=$('overlay');const view=overlay.getBoundingClientRect();const scale=Math.min(3,window.devicePixelRatio||1);
 overlay.width=Math.max(1,Math.round(view.width*scale));overlay.height=Math.max(1,Math.round(view.height*scale));
 const ctx=overlay.getContext('2d');if(!boxes.length)return;
 const w=$('scanCanvas').width,h=$('scanCanvas').height;
 ctx.scale(overlay.width/w,overlay.height/h);ctx.lineWidth=2.6*w/overlay.width;
 ctx.font='bold 10px system-ui';
 for(const [i,b] of boxes.entries()){
  if(b.missed>0)continue;
  const item=trackHistory.get(b.trackId),match=consensus(item?.votes),signed=match&&BY_ID[match.id];
  const color=signed?'#6df4c5':'#f4ca78';
  ctx.strokeStyle=color;ctx.fillStyle=signed?'#063e32df':'#4a3720dc';
  const x=Math.max(0,b.x),y=Math.max(0,b.y),width=Math.max(1,b.w),height=Math.max(1,b.h);
  ctx.strokeRect(x,y,width,height);
  const title=signed?`${lang==='ar'?signed.ar:signed.en} · #${b.trackId}`:`${ui('TRACK','مسار')} #${b.trackId}`;
  const tw=Math.min(Math.max(60,ctx.measureText(title).width+12),w-x);
  ctx.fillRect(x,y>=20?y-20:y,tw,19);
  ctx.fillStyle=signed?'#e7fff6':'#ffefd2';ctx.fillText(title,x+5,y>=20?y-6:y+13,Math.max(20,tw-10));
 }
}
function regionLoop(token){
 if(!cameraLive||token!==activeToken)return;
 const cycleStart=performance.now();
 try{
  const frame=drawInputFrame();
  const colors=detectRegions(frame).map(b=>({...b,source:'color'}));
  const ml=Date.now()-recentDetectedAt<4200?recentDetected:[];
  const tracked=trackRegions(candidateBoxes,combineProposals(colors,ml),nextTrackId);
  candidateBoxes=tracked.regions;nextTrackId=tracked.nextId;
  const now=Date.now();for(const box of candidateBoxes){if(box.missed===0){const history=trackHistory.get(box.trackId)||{votes:[],saved:false};history.lastSeen=now;trackHistory.set(box.trackId,history);}}
  pruneHistory(trackHistory,candidateBoxes,now);
  if(now-lastQualityAt>1250){const active=candidateBoxes.find(b=>b.missed===0);lastQuality=assessRegionQuality(frame,active||{x:frame.width*.2,y:frame.height*.2,w:frame.width*.6,h:frame.height*.6});lastQualityAt=now;syncQualityUI();}
  drawBoxes(candidateBoxes);updateTrackSummary();
 }catch(err){if(!regionLoop.warned){console.warn('Camera region detection:',err);regionLoop.warned=true;}}
 regionCostMs=performance.now()-cycleStart;regionTimer=setTimeout(()=>regionLoop(token),frameDelay(prefs.performanceProfile,regionCostMs));
}
async function prepareDetector(){
 if(detectorModel)return detectorModel;
 if(detectorPromise)return detectorPromise;
 detectorStatus='loading';detectorLastError='';syncDetectorUI();
 detectorPromise=(async()=>{
  // YOLOS is trained on COCO and only supplies the STOP SIGN class here.
  const lib=await importAI();
  if(!lib.pipeline)throw new Error('Object detection pipeline unavailable in AI library');
  lib.env.allowLocalModels=false;
  if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
  return lib.pipeline('object-detection','Xenova/yolos-tiny',{device:'wasm',dtype:'q8'});
 })();
 try{detectorModel=await detectorPromise;detectorStatus='ready';syncDetectorUI();return detectorModel;}
 catch(err){detectorPromise=null;detectorStatus='failed';detectorLastError=String(err?.message||err);syncDetectorUI();toast(ui('Extra Stop-sign detector could not start. Normal tracking remains available.','تعذر بدء كاشف قف الإضافي؛ يستمر التتبع العادي.'));throw err;}
}
function startDetectorLoop(token){
 clearTimeout(detectorTimer);
 if(token!==activeToken||!cameraLive||!prefs.enhancedDetector)return;
 detectorTimer=setTimeout(async()=>{
  if(token!==activeToken||!cameraLive||!prefs.enhancedDetector)return;
  if(busy||detectorBusy||aiStatus==='loading'){startDetectorLoop(token);return;}
  detectorBusy=true;
  try{
   const detect=await prepareDetector();if(token!==activeToken||!cameraLive)return;
   const frame=drawInputFrame(),c=$('scanCanvas');
   const image=c.toDataURL('image/jpeg',.78);
   const result=await detect(image,{threshold:.42});
   if(token!==activeToken||!cameraLive)return;
   recentDetected=stopDetections(result,frame.width,frame.height);recentDetectedAt=Date.now();
  }catch(err){console.warn('Optional detector:',err);prefs.enhancedDetector=false;savePrefs();$('enhancedDetectorToggle').checked=false;syncDetectorUI();}
  finally{detectorBusy=false;if(token===activeToken&&cameraLive&&prefs.enhancedDetector)startDetectorLoop(token);}
 },6800);
}
function progressReport(x){if(!x||!x.status)return;$('modelProgress').hidden=false;if(x.status==='progress'&&Number.isFinite(x.progress)){$('modelProgressPct').textContent=`${Math.round(x.progress)}%`;$('progressBar').style.width=Math.max(2,Math.min(100,x.progress))+'%';$('progressBar').parentElement?.setAttribute('aria-valuenow',String(Math.max(0,Math.min(100,Math.round(x.progress)))));}if(x.file)$('modelProgressText').textContent=ui('Downloading AI components…','جارٍ تنزيل النموذج…');}
async function ensureModel(){
  if(model)return model;
  if(modelPromise)return modelPromise;
  updateAIState('loading');
  $('modelProgress').hidden=false;
  $('modelProgressText').textContent=ui('Downloading AI model…','جارٍ تنزيل نموذج الذكاء الاصطناعي…');
  $('modelProgressPct').textContent='0%';$('progressBar').style.width='2%';$('progressBar').parentElement?.setAttribute('aria-valuenow','0');
  aiLoadStarted=performance.now();aiVocabularyCached=false;aiStartupSeconds=null;
  modelPromise=(async()=>{
    // Browser-native ESM loading from several CDN providers. No bundler or GitHub Actions.
    aiPhase='module';
    $('modelProgressText').textContent=ui('Connecting to recognition library…','جارٍ الاتصال بمكتبة التعرف…');
    const lib=await importAI();
    lib.env.allowLocalModels=false;
    // Safari can fail when esm.sh tries to dynamically import an ONNX/WASM helper.
    // Verify a pinned compatible helper and point the library to that source *before*
    // initializing either MobileCLIP tower. No GitHub build step required.
    aiPhase='wasm-runtime';
    wasmRuntimeAttempts=[]; wasmRepairNeeded=false;
    const first=preferredRuntime(sessionStorage);
    wasmRuntime=await selectRuntime({startIndex:first,onAttempt:({index,source,attempt,total})=>{
      wasmRuntimeAttempts.push(source.name);
      $('modelProgressText').textContent=ui(`Checking compute runtime ${attempt}/${total}…`,`جارٍ فحص محرك الحساب ${attempt}/${total}…`);
    }});
    configureWasmRuntime(lib,wasmRuntime);
    aiPhase='model';
    const stages={
      'vocabulary-cache':ui('Checking saved sign descriptions…','جارٍ فحص أوصاف اللوحات المحفوظة…'),
      'cached-vocabulary':ui('Saved sign descriptions restored · skipping text model','تم استرجاع الأوصاف · تخطي النموذج النصي'),
      tokenizer:ui('Preparing sign vocabulary…','جارٍ تهيئة مفردات اللوحات…'),
      processor:ui('Preparing image processor…','جارٍ تهيئة معالج الصور…'),
      'text-model':ui('Loading the text model (about 43 MB)…','جارٍ تحميل النموذج النصي (حوالي ٤٣ م.ب)…'),
      'text-embeddings':ui('Learning sign descriptions…','جارٍ تجهيز أوصاف اللوحات…'),
      'vision-model':ui('Loading the vision model (about 46 MB)…','جارٍ تحميل النموذج البصري (حوالي ٤٦ م.ب)…'),
      ready:ui('Finishing AI setup…','جارٍ إنهاء تهيئة الذكاء الاصطناعي…')
    };
    return createMobileClipClassifier(lib,prompts,{
      onStage:stage=>{aiPhase='model: '+stage;$('modelProgressText').textContent=stages[stage]||stage;},
      onProgress:progressReport,
      onVocabularyCache:used=>{aiVocabularyCached=used;},
    });
  })();
  try{
    model=await modelPromise;
    aiStartupSeconds=((performance.now()-aiLoadStarted)/1000).toFixed(1);
    $('modelProgress').hidden=true;
    aiPhase='ready';aiLastException='';
    updateAIState('ready');
    return model;
  }catch(e){
    modelPromise=null;
    aiLastFailure=Date.now();aiLastException=[`name: ${e?.name||'unknown'}`,`message: ${e?.message||String(e)}`,`cause: ${e?.cause?.message||e?.cause||'none'}`,`stack: ${e?.stack||'none'}`].join('\n').slice(0,2400);
    wasmRepairNeeded=aiPhase==='wasm-runtime'||/no available backend|importing a module script failed|wasm.*(import|backend)/i.test(aiLastException);
    $('modelProgress').hidden=true;
    updateAIState('failed',describeAIError(e));
    console.error('Road Sign Lens AI startup failed:',e);
    throw e;
  }
}
const prompts=SIGNS.map(s=>s.prompt).concat(['a photo with no road sign visible, a building or an ordinary street landscape','a photo of a colorful advertisement or unrelated object']);const promptMap=new Map(SIGNS.map(s=>[s.prompt,s]));
function cropRegion(region){const source=$('scanCanvas'),output=$('cropCanvas');const ctx=output.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,224,224);const size=Math.max(region.w,region.h),x=Math.max(0,region.x-(size-region.w)/2),y=Math.max(0,region.y-(size-region.h)/2);const actual=Math.min(size,source.width-x,source.height-y);ctx.drawImage(source,x,y,actual,actual,0,0,224,224);return output.toDataURL('image/jpeg',.82);}
function cropCenter(){const c=$('scanCanvas'),w=c.width,h=c.height,s=Math.min(w,h)*.67;return {x:(w-s)/2,y:(h-s)/2,w:s,h:s};}
async function classifyCandidate(image,pipe,automatic=false){const res=await pipe(image,prompts);const verdict=rankSuggestion(res,SIGNS,{automatic});if(!verdict.suggestion)weakSuggestions++;return verdict.suggestion;}
async function analyze(automatic=false,token=activeToken){
 if(busy||detectorBusy||!cameraLive&&!photoUrl)return;
 if(automatic&&aiStatus==='failed'&&Date.now()-aiLastFailure<60000)return;
 let inferenceStart=0;busy=true;$('scanBtn').disabled=true;$('scanBtn').textContent=ui('Analyzing…','جارٍ التحليل…');
 try{
  const pipe=await ensureModel();if(token!==activeToken)return;inferenceStart=performance.now();
  const frame=drawInputFrame();
  const boxes=detectRegions(frame);
  if(!cameraLive){candidateBoxes=boxes;drawBoxes(boxes);}
  const stable=cameraLive?pickTracks(candidateBoxes,trackHistory,2):boxes.slice(0,2);
  const candidates=stable.length?stable:automatic?[]:[cropCenter()];
  if(!candidates.length){if(!automatic)toast(ui('No possible signs found. Try moving closer.','لم تُرصد لوحة محتملة. حاول الاقتراب.'));return;}
  scansCompleted++;
  for(const box of candidates){
   if(automatic){const quality=assessRegionQuality(frame,box);if(!quality.usable){skippedForQuality++;lastQuality=quality;syncQualityUI();continue;}}
   const snap=cropRegion(box);
   const guess=await classifyCandidate(snap,pipe,automatic);
   if(token!==activeToken)return;
   if(!guess)continue;
   if(cameraLive&&box.trackId){
    const meta=trackHistory.get(box.trackId);if(!meta||meta.saved)continue;
    if(!automatic){
     // Explicit Analyze now remains a one-tap provisional result, as in v4.0.
     meta.saved=true;
     recordSign(guess.sign,guess.score,{automatic:false,source:'camera'});
     $('livePhaseText').textContent=ui(`Manual analysis: ${label(guess.sign)} (review required)`,`التحليل اليدوي: ${label(guess.sign)} (تتطلب المراجعة)`);
     break;
    }
    meta.votes=updateVotes(meta.votes,guess.sign.id,guess.score);
    meta.lastClassified=Date.now();
    const agreed=stableAgreement(meta.votes);
    if(!agreed){
     $('livePhaseText').textContent=ui(`Track #${box.trackId}: verifying across frames…`,`المسار #${box.trackId}: جارٍ التحقق عبر الإطارات…`);
     continue;
    }
    const s=BY_ID[agreed.id];if(!s)continue;
    confirmedCount++;
    meta.saved=true;meta.confirmed=agreed;
    $('livePhaseText').textContent=ui(`Confirmed ${label(s)} on track #${box.trackId}` ,`تم تأكيد ${label(s)} في المسار #${box.trackId}`);
    if(automatic&&!prefs.autosave){
     transient={uid:newUid(),id:s.id,aiSuggestedId:s.id,at:new Date().toISOString(),score:agreed.score,source:'camera',loc:currentFix(),status:'pending',notes:'',session:sessionId};
     renderLatest();
    }else{
     recordSign(s,agreed.score,{automatic,source:'camera'});
    }
   }else{
    // Photo and manual analysis: one explicit action creates a provisional suggestion.
    if(!automatic)recordSign(guess.sign,guess.score,{automatic:false,source:photoUrl?'photo':'camera'});
   }
  }
  drawBoxes(candidateBoxes);updateTrackSummary();
 }catch(err){console.error(err);if(!automatic)toast(ui('AI unavailable: '+err.message,'الذكاء الاصطناعي غير متاح: '+err.message));}
 finally{if(inferenceStart)aiCostMs=performance.now()-inferenceStart;syncQualityUI();busy=false;$('scanBtn').textContent=ui('✧ Analyze now','✧ تحليل الآن');toggleCameraUI();}
}
function aiLoop(token){if(token!==activeToken||!cameraLive||!prefs.live)return;const scanDelay=recommendedAIScanDelay(prefs.performanceProfile,prefs.interval,aiCostMs);const wait=Math.max(500,scanDelay-(Date.now()-lastLiveScan));scanTimer=setTimeout(async()=>{if(token!==activeToken||!cameraLive||!prefs.live)return;lastLiveScan=Date.now();await analyze(true,token);aiLoop(token);},wait);}
function restartAI(){clearTimeout(scanTimer);if(cameraLive&&prefs.live)aiLoop(activeToken);}
function toggleEnhancedDetector(checked){prefs.enhancedDetector=checked;savePrefs();if(checked){detectorStatus=detectorModel?'ready':'off';if(cameraLive)startDetectorLoop(activeToken);}else{clearTimeout(detectorTimer);recentDetected=[];recentDetectedAt=0;}syncDetectorUI();}
function setup(){applyPrefs();changeLanguage();changeLanguage();$('langBtn').addEventListener('click',changeLanguage);$('accessBtn').addEventListener('click',()=>{prefs.contrast=!prefs.contrast;savePrefs();applyPrefs();toast(ui('Contrast preference updated.','تم تحديث التباين.'));});all('[data-tab]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.tab)));
 $('cameraBtn').addEventListener('click',startCamera);$('prepareAiBtn').addEventListener('click',()=>{
   // After a failed ORT initialization, its internal promise may remain rejected.
   // A clean reload, selecting the next provider, is safer than reusing that state.
   if(aiStatus==='failed'&&wasmRepairNeeded){
     const i=wasmRuntime?.index??preferredRuntime(sessionStorage);
     advanceRuntime(sessionStorage,i);location.reload();return;
   }
   void ensureModel().catch(()=>toast(aiError||ui('Could not start AI','تعذر تشغيل الذكاء الاصطناعي')));
 });
 $('autoPrepareToggle').addEventListener('change',e=>{prefs.autoPrepare=e.target.checked;savePrefs();if(prefs.autoPrepare&&!document.hidden)void ensureModel().catch(()=>{});});$('aiDiagnosticsBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(aiDiagnostics());toast(ui('Diagnostics copied. Share them with the developer.','تم نسخ التشخيص. أرسله إلى المطور.'));}catch{window.prompt(ui('Copy diagnostics','انسخ التشخيص'),aiDiagnostics());}});$('scanBtn').addEventListener('click',()=>analyze(false));$('uploadBtn').addEventListener('click',()=>$('photoFile').click());$('photoFile').addEventListener('change',e=>{selectPhoto(e.target.files[0]);e.target.value='';});$('gpsBtn').addEventListener('click',()=>geoWatch!==null?stopGPS():enableGPS());$('enhancedDetectorToggle').addEventListener('change',e=>toggleEnhancedDetector(e.target.checked));$('liveToggle').addEventListener('change',e=>{prefs.live=e.target.checked;savePrefs();restartAI();});$('autosaveToggle').addEventListener('change',e=>{prefs.autosave=e.target.checked;savePrefs();});$('newManualBtn').addEventListener('click',()=>openEditor());$('recordsAddBtn').addEventListener('click',()=>openEditor());$('latestReviewBtn').addEventListener('click',()=>{if(transient){addRecord(transient);transient=null;}nav('records');openEditor(latestRecord);});$('mapShortcut').addEventListener('click',()=>nav('map'));$('exportShortcut').addEventListener('click',()=>{nav('records');exportData('geojson');});$('locateMapBtn').addEventListener('click',centerMap);$('fitMapPinsBtn').addEventListener('click',fitMapPins);$('cancelMapPickBtn').addEventListener('click',cancelMapCorrection);$('recordSearch').addEventListener('input',renderRecords);$('recordFilter').addEventListener('change',renderRecords);$('catalogSearch').addEventListener('input',renderCatalog);$('downloadBtn').addEventListener('click',()=>exportData($('formatSelect').value));$('dialogClose').addEventListener('click',closeEditor);$('cancelDialog').addEventListener('click',closeEditor);$('deleteRecordBtn').addEventListener('click',()=>{if(!editUid)return;const yes=window.confirm(ui('Delete this observation? This cannot be undone.','حذف هذه المشاهدة؟ لا يمكن التراجع.'));if(!yes)return;rows=rows.filter(r=>r.uid!==editUid);if(latestRecord===editUid)latestRecord=null;persist();closeEditor();renderStats();renderRecords();renderMapList();renderLatest();renderPins();toast(ui('Observation deleted.','تم حذف المشاهدة.'));});$('recordForm').addEventListener('submit',e=>{e.preventDefault();saveEditor();});$('useCurrentGpsBtn').addEventListener('click',editorGPS);$('chooseMapBtn').addEventListener('click',editorMapPick);$('contrastSetting').addEventListener('change',e=>{prefs.contrast=e.target.checked;savePrefs();applyPrefs();});$('largeTextSetting').addEventListener('change',e=>{prefs.largeText=e.target.checked;savePrefs();applyPrefs();});$('motionSetting').addEventListener('change',e=>{prefs.reduceMotion=e.target.checked;savePrefs();applyPrefs();});$('intervalSetting').addEventListener('change',e=>{prefs.interval=Number(e.target.value);savePrefs();restartAI();});$('profileSetting').addEventListener('change',e=>{prefs.performanceProfile=e.target.value;savePrefs();restartAI();toast(ui('Camera pacing updated.','تم تعديل سرعة الرصد.'));});$('downloadValidationBtn').addEventListener('click',downloadValidation);$('radiusSetting').addEventListener('change',e=>{prefs.radius=Number(e.target.value);savePrefs();});$('clearDataBtn').addEventListener('click',()=>{$('confirmLayer').hidden=false;$('confirmCancel').focus();});$('confirmCancel').addEventListener('click',()=>{$('confirmLayer').hidden=true;$('clearDataBtn').focus();});$('confirmYes').addEventListener('click',()=>{rows=[];latestRecord=null;persist();renderStats();renderRecords();renderMapList();renderLatest();renderPins();$('confirmLayer').hidden=true;toast(ui('Local survey records deleted.','تم حذف السجلات المحلية.'));});window.addEventListener('pagehide',()=>{stopCamera();stopGPS();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&cameraLive){stopCamera();toast(ui('Camera stopped while app was in background.','توقفت الكاميرا عند الانتقال للخلفية.'));}});window.addEventListener('resize',()=>{if(candidateBoxes.length)drawBoxes(candidateBoxes);map?.invalidateSize();});window.addEventListener('keydown',e=>{if($('confirmLayer').hidden)return;if(e.key==='Escape'){e.preventDefault();$('confirmLayer').hidden=true;$('clearDataBtn').focus();}if(e.key==='Tab'){const a=$('confirmCancel'),b=$('confirmYes');if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus();}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();}}});renderStats();renderRecords();renderMapList();renderCatalog();renderLatest();toggleCameraUI();updateGPS();syncAI();syncQualityUI();setInterval(()=>{if(currentTab==='map'||currentTab==='survey')updateGPS();},6000);if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js?v=4.5').catch(()=>{});}
setup();
// Optional warm-up: only after a user has deliberately enabled it in Settings.
// Never download a large model automatically for first-time visitors.
if (prefs.autoPrepare) setTimeout(()=>{if(!document.hidden)void ensureModel().catch(()=>{});},900);
