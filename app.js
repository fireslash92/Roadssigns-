/* Road Sign Lens: on-device visual similarity demo, not approved driving equipment.
 * Model: Xenova/mobileclip_s0 (Transformers.js / ONNX; loads from Hugging Face).
 * Classification requires one centered, clear sign. Results are NOT probabilities.
 */
const SIGNS = [
 {id:'stop',en:'Stop',ar:'قف',emoji:'🛑',group:'Rules',prompt:'a photo of a red octagonal STOP road traffic sign',meaning:['An octagonal STOP sign requires drivers to stop completely.','علامة قف ثُمانية الأضلاع وتُلزم السائق بالتوقف التام.'],action:['Stop completely and give way as required.','توقف تمامًا وأعطِ الأولوية حسب القواعد.']},
 {id:'giveway',en:'Give way / Yield',ar:'أعطِ الأولوية',emoji:'🔻',group:'Rules',prompt:'a photo of an upside down red bordered triangular YIELD give way traffic sign',meaning:['Give priority to vehicles or pedestrians with the right of way.','أعطِ الأولوية للمركبات أو المشاة أصحاب الحق في المرور.'],action:['Slow down and be prepared to stop.','خفّف سرعتك واستعد للتوقف.']},
 {id:'noentry',en:'No entry',ar:'ممنوع الدخول',emoji:'⛔',group:'Rules',prompt:'a photo of a red circular no entry road sign with a horizontal white bar',meaning:['Traffic is not permitted to enter from this direction.','يُمنع دخول المركبات من هذا الاتجاه.'],action:['Do not enter this road.','لا تدخل إلى هذا الطريق.']},
 {id:'speed',en:'Speed limit',ar:'السرعة القصوى',emoji:'🚗',group:'Rules',prompt:'a photo of a speed limit traffic sign, white circular disc, red outer border and large black speed number inside',meaning:['A maximum permitted speed is shown by the number inside the sign. This prototype does not reliably read the number.','تُحدد اللوحة السرعة القصوى المسموح بها بالرقم الموجود داخلها. لا يقرأ هذا النموذج الرقم بصورة موثوقة.'],action:['Read the number on the real sign; never rely on this app for the speed value.','اقرأ الرقم على اللوحة الحقيقية ولا تعتمد على التطبيق لتحديد قيمة السرعة.']},
 {id:'noparking',en:'No parking',ar:'ممنوع الوقوف',emoji:'🅿️',group:'Rules',prompt:'a photo of a blue circular no parking traffic sign with a red border and a diagonal red slash',meaning:['Parking is prohibited at the signed location.','يُمنع الوقوف في الموقع المحدد باللوحة.'],action:['Do not park in the indicated area.','لا توقف مركبتك في المنطقة المحددة.']},
 {id:'nostopping',en:'No stopping',ar:'ممنوع التوقف',emoji:'🚫',group:'Rules',prompt:'a photo of a blue circular no stopping traffic sign with red border and two crossing red diagonal lines',meaning:['Vehicles must not stop in this zone except where regulations allow.','يُمنع التوقف في هذه المنطقة إلا فيما تسمح به الأنظمة.'],action:['Keep the area clear.','حافظ على خلو المنطقة من المركبات المتوقفة.']},
 {id:'nouturn',en:'No U-turn',ar:'ممنوع الدوران للخلف',emoji:'↩️',group:'Rules',prompt:'a photo of a circular no U turn road traffic sign, U shaped arrow crossed out with red slash',meaning:['Making a U-turn is prohibited.','يُمنع الدوران بالمركبة إلى الخلف.'],action:['Continue to a location where turning is permitted.','واصل إلى موقع يسمح بالدوران فيه.']},
 {id:'noleft',en:'No left turn',ar:'ممنوع الانعطاف يسارًا',emoji:'↰',group:'Rules',prompt:'a photo of a no left turn road sign with a left arrow crossed out in red',meaning:['Turning left at this junction is prohibited.','يُمنع الانعطاف إلى اليسار عند هذا التقاطع.'],action:['Follow a permitted direction.','اتبع الاتجاهات المسموح بها.']},
 {id:'noright',en:'No right turn',ar:'ممنوع الانعطاف يمينًا',emoji:'↱',group:'Rules',prompt:'a photo of a no right turn road sign with a right arrow crossed out in red',meaning:['Turning right at this junction is prohibited.','يُمنع الانعطاف إلى اليمين عند هذا التقاطع.'],action:['Follow a permitted direction.','اتبع الاتجاهات المسموح بها.']},
 {id:'oneway',en:'One-way road',ar:'طريق باتجاه واحد',emoji:'➡️',group:'Directions',prompt:'a photo of a rectangular one way road traffic sign with one black arrow pointing right',meaning:['Traffic moves in one direction only.','تتحرك المركبات في اتجاه واحد فقط.'],action:['Follow the direction of the arrow.','اتبع اتجاه السهم.']},
 {id:'right',en:'Turn right',ar:'اتجه يمينًا',emoji:'↪️',group:'Directions',prompt:'a photo of a blue circular mandatory right turn traffic sign with a white arrow turning right',meaning:['Vehicles are required to turn right.','يجب على المركبات الانعطاف إلى اليمين.'],action:['Use the indicated direction when safe.','اتبع الاتجاه المحدد عندما يكون آمنًا.']},
 {id:'left',en:'Turn left',ar:'اتجه يسارًا',emoji:'↩️',group:'Directions',prompt:'a photo of a blue circular mandatory left turn road sign with a white arrow turning left',meaning:['Vehicles are required to turn left.','يجب على المركبات الانعطاف إلى اليسار.'],action:['Use the indicated direction when safe.','اتبع الاتجاه المحدد عندما يكون آمنًا.']},
 {id:'straight',en:'Straight ahead',ar:'إلى الأمام فقط',emoji:'⬆️',group:'Directions',prompt:'a photo of a blue circular straight ahead only mandatory traffic sign with a white arrow pointing up',meaning:['Vehicles must continue straight ahead.','يجب على المركبات الاستمرار إلى الأمام.'],action:['Continue in the permitted direction.','تابع السير في الاتجاه المسموح به.']},
 {id:'roundabout',en:'Roundabout',ar:'دوّار',emoji:'🔄',group:'Directions',prompt:'a photo of a blue roundabout mandatory traffic road sign with three circular white arrows',meaning:['A roundabout is ahead or the sign indicates the roundabout circulation direction.','يوجد دوّار أمامك أو تشير اللوحة إلى اتجاه السير فيه.'],action:['Follow road markings and give-way rules.','اتبع تخطيط الطريق وقواعد الأولوية.']},
 {id:'keep-right',en:'Keep right',ar:'الزم اليمين',emoji:'↘️',group:'Directions',prompt:'a photo of a blue circular keep right traffic sign with a white downward right diagonal arrow',meaning:['Keep to the right of the indicated obstruction or divider.','الزم يمين العائق أو الجزيرة المرورية.'],action:['Pass on the right where directed.','مر من اليمين حسب توجيه اللوحة.']},
 {id:'pedestrian',en:'Pedestrian crossing',ar:'عبور المشاة',emoji:'🚶',group:'Warning',prompt:'a photo of a pedestrian crossing traffic sign with a walking person on a zebra crossing',meaning:['A pedestrian crossing is present or ahead.','يوجد معبر للمشاة هنا أو في الأمام.'],action:['Slow down and give way to pedestrians as required.','خفّف سرعتك وأعطِ الأولوية للمشاة.']},
 {id:'children',en:'Children crossing',ar:'عبور الأطفال',emoji:'🚸',group:'Warning',prompt:'a photo of a triangular red bordered children crossing school traffic warning sign with two children walking',meaning:['Children may cross or be present near the road.','قد يعبر الأطفال الطريق أو يتواجدون بالقرب منه.'],action:['Reduce speed and watch carefully.','خفّف السرعة وانتبه جيدًا.']},
 {id:'roadwork',en:'Roadworks',ar:'أعمال على الطريق',emoji:'🚧',group:'Warning',prompt:'a photo of a triangular warning roadworks sign showing a person digging with a shovel',meaning:['Road construction or maintenance work may be underway.','قد تكون هناك أعمال إنشاء أو صيانة على الطريق.'],action:['Slow down and follow temporary directions.','خفّف السرعة واتبع الإرشادات المؤقتة.']},
 {id:'trafficlights',en:'Traffic signals ahead',ar:'إشارات ضوئية أمامك',emoji:'🚦',group:'Warning',prompt:'a photo of a triangular red bordered traffic light warning sign with red amber green lights symbol',meaning:['Traffic signals are ahead.','توجد إشارات ضوئية في الأمام.'],action:['Approach carefully and obey signals.','اقترب بحذر والتزم بإشارات المرور.']},
 {id:'speedbump',en:'Speed hump',ar:'مطب',emoji:'〰️',group:'Warning',prompt:'a photo of a triangular red bordered speed bump road sign showing a black bump in the road',meaning:['An uneven surface or speed hump is ahead.','توجد منطقة غير مستوية أو مطب أمامك.'],action:['Reduce speed smoothly.','خفّف السرعة تدريجيًا.']},
 {id:'slippery',en:'Slippery road',ar:'طريق زلق',emoji:'💧',group:'Warning',prompt:'a photo of a triangular slippery road traffic warning sign with a skidding car and tire tracks',meaning:['The road surface may offer less grip.','قد تقل درجة تماسك الإطارات مع سطح الطريق.'],action:['Slow down and avoid sharp maneuvers.','خفّف السرعة وتجنب المناورات المفاجئة.']},
 {id:'curve',en:'Sharp bend',ar:'منعطف حاد',emoji:'↪️',group:'Warning',prompt:'a photo of a triangular warning traffic sign showing a dangerous sharp bend curve in the road',meaning:['A sharp or dangerous curve is approaching.','يوجد منعطف حاد أو خطير في الأمام.'],action:['Adjust speed before the bend.','خفّف سرعتك قبل المنعطف.']},
 {id:'crossroads',en:'Crossroads ahead',ar:'تقاطع طرق أمامك',emoji:'✚',group:'Warning',prompt:'a photo of a triangular warning road sign showing a black crossroads plus shape',meaning:['Another road intersects this road ahead.','يوجد تقاطع طرق أمامك.'],action:['Watch for crossing traffic and right-of-way.','انتبه لحركة المرور المتقاطعة وللأولوية.']},
 {id:'two-way',en:'Two-way traffic',ar:'حركة مرور باتجاهين',emoji:'↕️',group:'Warning',prompt:'a photo of a triangular two way traffic warning sign with two opposing black arrows',meaning:['Traffic may move in both directions.','قد تتحرك المركبات في كلا الاتجاهين.'],action:['Keep to your lane and watch oncoming vehicles.','التزم بمسارك وانتبه للمركبات القادمة.']},
 {id:'no-trucks',en:'No heavy trucks',ar:'ممنوع مرور الشاحنات',emoji:'🚚',group:'Rules',prompt:'a photo of a round red bordered no trucks traffic prohibition sign with a black truck symbol',meaning:['Heavy trucks or the indicated vehicle class may be prohibited.','قد يُمنع مرور الشاحنات الثقيلة أو الفئة الموضحة.'],action:['Follow the prohibition and any posted weight limits.','التزم بالمنع وحدود الوزن المعلنة.']}
];
const byId = Object.fromEntries(SIGNS.map(s=>[s.id,s]));
const $ = id => document.getElementById(id);
const el = {
  video:$('video'), photo:$('photoPreview'), viewfinder:$('viewfinder'), placeholder:$('placeholder'),
  canvas:$('captureCanvas'), cameraStatus:$('cameraStatus'), cameraStatusText:$('cameraStatusText'),
  start:$('startCamera'), upload:$('uploadBtn'), file:$('fileInput'), analyze:$('analyzeBtn'), auto:$('autoScan'),
  empty:$('emptyResult'), loading:$('loadingResult'), actual:$('actualResult'), error:$('errorResult')
};
let lang = 'en';
try { if (localStorage.getItem('roadSignLensLanguage') === 'ar') lang = 'ar'; } catch { /* Storage can be unavailable in restricted browsing contexts. */ }
let model = null, modelLoadPromise = null, stream = null, photoData = null, cameraOn = false, busy = false, autoTimer = null, activeView = 'scan';
let latest = null, lastAutoId = '', lastAutoTime = 0;
const ui = (en,ar) => lang === 'ar' ? ar : en;
function showResult(section){[el.empty,el.loading,el.actual,el.error].forEach(n=>n.hidden = n !== section);}
function updateLanguage(){
 document.documentElement.lang=lang; document.documentElement.dir=lang==='ar'?'rtl':'ltr'; document.body.dir=document.documentElement.dir;
 $('languageText').textContent=lang==='en'?'العربية':'English';
 document.querySelectorAll('[data-en][data-ar]').forEach(n=>{
   const val=n.dataset[lang];
   if(n.tagName==='H1')n.innerHTML=val;else n.textContent=val;
 });
 $('signSearch').placeholder=ui('Search signs...','ابحث عن لوحة مرورية...');
 document.title=ui('Road Sign Lens • Camera Recognition','عدسة اللوحات المرورية • التعرف بالكاميرا');
 updateCameraButton();setCameraStatus(cameraOn);renderLibrary();renderHistory();
 if(latest)renderPrediction(latest);
 if(el.error.hidden===false && !lastError) showResult(el.empty);
}
function updateCameraButton(){ el.start.querySelector('[data-en]').textContent=cameraOn?ui('Stop camera','إيقاف الكاميرا'):ui('Start camera','تشغيل الكاميرا'); }
function setCameraStatus(live){el.cameraStatus.classList.toggle('live',live);el.cameraStatusText.textContent=live?ui('Camera live','الكاميرا تعمل'):photoData?ui('Photo selected','تم اختيار صورة'):ui('Camera off','الكاميرا مغلقة');}
function setSourceVisibility(){
 el.photo.hidden=!photoData;
 el.placeholder.hidden=!!photoData||cameraOn;
 el.viewfinder.classList.toggle('camera-on',cameraOn&&!photoData);
 el.analyze.disabled=!cameraOn&&!photoData||busy;
 el.auto.disabled=!cameraOn||busy;
 setCameraStatus(cameraOn);
}
function stopCamera(){
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 cameraOn=false;el.video.srcObject=null;
 if(autoTimer){clearInterval(autoTimer);autoTimer=null;}
 el.auto.checked=false;updateCameraButton();setSourceVisibility();
}
async function startCamera(){
 if(cameraOn){stopCamera();return;}
 if(!navigator.mediaDevices?.getUserMedia){displayError(ui('Camera unavailable','الكاميرا غير متاحة'),ui('Open the app from an HTTPS website in Safari or Chrome, or upload a photo.','افتح التطبيق عبر موقع HTTPS في سفاري أو كروم، أو ارفع صورة.'));return;}
 try{
  photoData=null;el.photo.src='';
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  el.video.srcObject=stream;await el.video.play();cameraOn=true;updateCameraButton();setSourceVisibility();
  stream.getVideoTracks()[0]?.addEventListener('ended',()=>stopCamera(),{once:true});
  if(el.auto.checked)beginAutoScan();
 }catch(err){console.warn('Camera request failed:',err);stopCamera();displayError(ui('Camera permission needed','يلزم السماح بالكاميرا'),ui('Allow camera access in your browser settings or use Upload photo. Secure HTTPS is required.','اسمح بالوصول إلى الكاميرا من إعدادات المتصفح أو استخدم رفع صورة. يلزم اتصال HTTPS.'));}
}
async function loadPhoto(file){
 if(!file||!file.type.startsWith('image/')){displayError(ui('Unsupported file','ملف غير مدعوم'),ui('Choose a JPG, PNG, HEIC (if supported) or other supported image.','اختر صورة مدعومة مثل JPG أو PNG أو HEIC إن كان مدعومًا.'));return;}
 if(file.size>25*1024*1024){displayError(ui('Photo too large','الصورة كبيرة جدًا'),ui('Please select an image smaller than 25 MB.','يرجى اختيار صورة أصغر من ٢٥ ميجابايت.'));return;}
 const objectUrl=URL.createObjectURL(file);
 try{
  const image=new Image();image.decoding='async';image.src=objectUrl;await image.decode();
  // Re-encode to a manageable JPEG locally; the original never leaves this device.
  const cv=document.createElement('canvas');const ratio=Math.min(1,1100/Math.max(image.naturalWidth,image.naturalHeight));
  cv.width=Math.max(1,Math.round(image.naturalWidth*ratio));cv.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  cv.getContext('2d').drawImage(image,0,0,cv.width,cv.height);stopCamera();photoData=cv.toDataURL('image/jpeg',.9);el.photo.src=photoData;setSourceVisibility();showResult(el.empty);
 }catch(err){console.error(err);displayError(ui('Could not open photo','تعذّر فتح الصورة'),ui('Try a JPG or PNG image.','جرّب صورة بصيغة JPG أو PNG.'));}
 finally{URL.revokeObjectURL(objectUrl);el.file.value='';}
}
function frameImage(){
 const c=el.canvas,ctx=c.getContext('2d',{willReadFrequently:false});
 const source=photoData?el.photo:el.video;
 const w=source.videoWidth||source.naturalWidth,h=source.videoHeight||source.naturalHeight;
 if(!w||!h)throw new Error('The camera frame is not ready.');
 // Center crop: square roughly covering the overlay; no object localization claimed.
 const square=Math.min(w,h)*.68;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);
 ctx.drawImage(source,(w-square)/2,(h-square)/2,square,square,0,0,c.width,c.height);
 return c.toDataURL('image/jpeg',.86);
}
function reportProgress(p){
 if(p.status==='progress'&&Number.isFinite(p.progress)){
  $('progressFill').style.width=`${Math.max(5,Math.min(100,p.progress))}%`;
  $('progressText').textContent=ui('Downloading AI components','جارٍ تحميل ملفات النموذج')+' · '+Math.round(p.progress)+'%';
 }else if(p.status==='initiate'||p.status==='download'){
  $('progressText').textContent=ui('Preparing: ','جارٍ التحضير: ')+(p.file||'model');
 }
}
async function ensureModel(){
 if(model)return model;
 if(modelLoadPromise)return modelLoadPromise;
 modelLoadPromise=(async()=>{
  $('loadingTitle').textContent=ui('Loading the AI model…','جارٍ تحميل نموذج الذكاء الاصطناعي...');
  $('loadingDesc').textContent=ui('First download needs an internet connection and may be slow. The model runs in your browser after loading.','يتطلب التحميل الأول اتصالًا بالإنترنت وقد يستغرق وقتًا. يعمل النموذج داخل المتصفح بعد التحميل.');
  $('progressFill').style.width='6%';
  const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
  env.allowLocalModels=false;
  // WASM is supported by iOS Safari; using q8 limits mobile download/memory.
  model=await pipeline('zero-shot-image-classification','Xenova/mobileclip_s0',{device:'wasm',dtype:'q8',progress_callback:reportProgress});
  return model;
 })();
 try{return await modelLoadPromise;}catch(err){modelLoadPromise=null;throw err;}
}
const candidates=SIGNS.map(s=>s.prompt).concat(['a photo of a street with no road sign visible','a photo of an ordinary landscape, not a traffic sign']);
const promptLookup=new Map(SIGNS.map(s=>[s.prompt,s]));
let lastError='';
function displayError(title,message){lastError=message;showResult(el.error);$('errorTitle').textContent=title;$('errorText').textContent=message;}
async function analyze({automatic=false}={}){
 if(busy||(!cameraOn&&!photoData))return;
 busy=true;el.analyze.disabled=true;el.auto.disabled=true;showResult(el.loading);$('loadingTitle').textContent=ui('Analyzing the sign…','جارٍ تحليل اللوحة...');$('loadingDesc').textContent=ui('Comparing the center of the image with known road sign descriptions.','مقارنة مركز الصورة بأوصاف اللوحات المرورية المعروفة.');
 try{
  const img=frameImage();
  const pipe=await ensureModel();
  $('loadingTitle').textContent=ui('Looking for a match…','جارٍ البحث عن أقرب تطابق...');
  const results=await pipe(img,candidates);
  const scored=results.map(r=>({sign:promptLookup.get(r.label)||null,score:Number(r.score)||0})).sort((a,b)=>b.score-a.score);
  if(!scored.length)throw new Error('No predictions returned.');
  const first=scored[0], runner=scored[1]||{score:0};
  // Open-vocabulary CLIP scores are relative within the chosen descriptions.
  // Reject non-road-sign top matches and unusually ambiguous results.
  const accepted=!!first.sign&&first.score>=.11&&(first.score-runner.score>=.014||first.score>=.28);
  latest={accepted,first,scored:scored.filter(s=>s.sign).slice(0,4),image:img,when:new Date().toISOString()};
  renderPrediction(latest);
  if(accepted&&(!automatic||lastAutoId!==first.sign.id||Date.now()-lastAutoTime>30000)){
   saveHistory({id:first.sign.id,at:latest.when,score:first.score});lastAutoId=first.sign.id;lastAutoTime=Date.now();
  }
 }catch(err){console.error('Recognition failure:',err);displayError(ui('Recognition unavailable','تعذّر تشغيل التعرّف'),ui('Check your internet connection, free memory, and model download permissions. You can still browse the sign guide. Technical detail: ','تحقق من اتصال الإنترنت ومساحة الذاكرة وإمكانية تنزيل النموذج. يمكنك استعراض دليل اللوحات. التفاصيل: ')+(err?.message||String(err)));}
 finally{busy=false;setSourceVisibility();}
}
function renderPrediction(p){
 showResult(el.actual);
 const first=p.first;const sign=p.accepted?first.sign:null;
 $('trustBanner').textContent=sign?ui('Possible match — verify on the actual sign','تطابق محتمل — تحقق من اللوحة الفعلية'):ui('Uncertain — try a clearer, closer image','نتيجة غير مؤكدة — التقط صورة أقرب وأوضح');
 $('signEmoji').textContent=sign?sign.emoji:'❔';
 $('resultName').textContent=sign?(lang==='ar'?sign.ar:sign.en):ui('Sign not identified','لم يتم التعرّف على اللوحة');
 $('resultSubtitle').textContent=sign?(lang==='ar'?sign.en:sign.ar):ui('No reliable match','لا يوجد تطابق موثوق');
 $('resultMeaning').textContent=sign?sign.meaning[lang==='ar'?1:0]:ui('The AI could not confidently distinguish a supported traffic sign in the center square.','لم يتمكن النموذج من تمييز لوحة مدعومة بوضوح داخل المربع.');
 $('resultAction').textContent=sign?sign.action[lang==='ar'?1:0]:ui('Center a single sign, move closer and try again.','ضع لوحة واحدة في المنتصف واقترب أكثر ثم أعد المحاولة.');
 $('alternativesTitle').textContent=ui('Other possible matches','تطابقات محتملة أخرى');
 const alternatives=p.scored.filter(s=>s.sign&&(!sign||s.sign.id!==sign.id)).slice(0,3);
 $('alternatives').replaceChildren(...alternatives.map(s=>{
  const row=document.createElement('div');row.className='alternate';const name=document.createElement('span');name.textContent=(lang==='ar'?s.sign.ar:s.sign.en);const rank=document.createElement('span');rank.textContent=ui('Alternative','بديل');row.append(name,rank);return row;
 }));
 $('resultDisclaimer').textContent=ui('Categories are suggestions, not a calibrated confidence score. A sign absent from this guide can be mistaken for another one.','الفئات المعروضة مجرد اقتراحات وليست نسب ثقة معتمدة. قد يخلط النموذج بين اللوحات غير الموجودة في الدليل ولوحات أخرى.');
}
function renderLibrary(){
 const q=$('signSearch').value.trim().toLocaleLowerCase();
 const filtered=SIGNS.filter(s=>[s.en,s.ar,s.group].join(' ').toLocaleLowerCase().includes(q));
 $('signGrid').replaceChildren(...filtered.map(s=>{
  const card=document.createElement('article');card.className='sign-card';
  const emoji=document.createElement('div');emoji.className='pictogram';emoji.textContent=s.emoji;
  const name=document.createElement('strong');name.textContent=lang==='ar'?s.ar:s.en;
  const desc=document.createElement('p');desc.textContent=s.meaning[lang==='ar'?1:0];
  card.append(emoji,name,desc);return card;
 }));
 if(!filtered.length){const x=document.createElement('div');x.className='history-blank';x.textContent=ui('No signs found.','لا توجد لوحات مطابقة.');$('signGrid').append(x);}
}
function getHistory(){try{return JSON.parse(localStorage.getItem('roadSignLensHistory')||'[]');}catch{return [];}}
function saveHistory(item){try{const all=getHistory();all.unshift(item);localStorage.setItem('roadSignLensHistory',JSON.stringify(all.slice(0,20)));renderHistory();}catch(err){console.warn('History not saved:',err);}}
function renderHistory(){
 const all=getHistory();$('historyCount').textContent=lang==='ar'?`${all.length} عملية مسح`: `${all.length} scans`;
 $('historyList').replaceChildren(...all.map(item=>{
  const s=byId[item.id];if(!s)return document.createTextNode('');
  const row=document.createElement('article');row.className='history-entry';const symbol=document.createElement('div');symbol.className='history-symbol';symbol.textContent=s.emoji;
  const meta=document.createElement('div');const title=document.createElement('strong');title.textContent=lang==='ar'?s.ar:s.en;
  const small=document.createElement('small');small.textContent=new Date(item.at).toLocaleString(lang==='ar'?'ar-OM':'en-GB',{dateStyle:'medium',timeStyle:'short'});
  meta.append(title,small);row.append(symbol,meta);return row;
 }));
 if(!all.length){const blank=document.createElement('div');blank.className='history-blank';blank.textContent=ui('Your recognized signs will appear here.','ستظهر اللوحات التي يتم التعرّف عليها هنا.');$('historyList').append(blank);}
}
function changeView(name){
 if(name!=='scan'&&el.auto.checked){el.auto.checked=false;if(autoTimer)clearInterval(autoTimer);autoTimer=null;}
 activeView=name;
 document.querySelectorAll('.view').forEach(e=>e.classList.toggle('active',e.id===name+'View'));
 document.querySelectorAll('[data-view]').forEach(btn=>{const selected=btn.dataset.view===name;btn.classList.toggle('selected',selected);if(selected)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});
 window.scrollTo({top:0,behavior:'instant'});
}
function beginAutoScan(){
 if(autoTimer)clearInterval(autoTimer);
 if(!cameraOn)return;
 autoTimer=setInterval(()=>{if(!busy&&cameraOn&&activeView==='scan'&&el.video.readyState>=2)analyze({automatic:true});},5000);
 analyze({automatic:true});
}
$('languageBtn').addEventListener('click',()=>{lang=lang==='en'?'ar':'en';try{localStorage.setItem('roadSignLensLanguage',lang);}catch{}updateLanguage();});
el.start.addEventListener('click',startCamera);
el.upload.addEventListener('click',()=>el.file.click());
el.file.addEventListener('change',e=>loadPhoto(e.target.files?.[0]));
el.analyze.addEventListener('click',()=>analyze());
el.auto.addEventListener('change',()=>{if(el.auto.checked)beginAutoScan();else if(autoTimer){clearInterval(autoTimer);autoTimer=null;}});
$('retryBtn').addEventListener('click',()=>{if(cameraOn||photoData)analyze();else showResult(el.empty);});
$('signSearch').addEventListener('input',renderLibrary);
$('clearHistory').addEventListener('click',()=>{if(confirm(ui('Delete the saved scan history on this device?','هل تريد حذف سجل المسح المحفوظ على هذا الجهاز؟'))){try{localStorage.removeItem('roadSignLensHistory');}catch{}renderHistory();}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));
window.addEventListener('pagehide',stopCamera);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&cameraOn)stopCamera();});
updateLanguage();setSourceVisibility();showResult(el.empty);
