const CACHE='road-sign-lens-v4.4-phase11';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./app.js','./mobileclip-engine.js','./wasm-runtime.js','./vocabulary-cache.js','./signs.js','./detector.js','./tracking-engine.js','./scan-quality.js','./recognition-policy.js'];
self.addEventListener('install', event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x.startsWith('road-sign-lens-')||x.startsWith('sign-lens-')).filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;
 if(request.mode==='navigate'||request.destination==='document'){
   event.respondWith(fetch(request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(request,r.clone()));return r;}).catch(()=>caches.match(request).then(r=>r||caches.match('./index.html'))));return;
 }
 // Cache after fetching so a new deploy updates its chunk files.
 event.respondWith(fetch(request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(request,r.clone()));return r;}).catch(()=>caches.match(request)));
});
