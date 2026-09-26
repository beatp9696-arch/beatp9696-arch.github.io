// Kept independent from the Three.js scene so either visual can fail safely.
const host = document.getElementById('duo-embed');
const track = document.getElementById('duo-scroll-track');
const article = document.body.classList.contains('article-story');
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
let frame, ready = false, syncFrame = 0, timeout;
function sync() {
  syncFrame = 0;
  if (!frame || !ready) return;
  const rect = track.getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.top < innerHeight && !document.body.classList.contains('reading-mode') && !document.hidden;
  frame.contentWindow.postMessage({type:'apple-story-visibility',visible},location.origin);
  const progress = clamp(-rect.top / Math.max(1,rect.height-host.clientHeight) * 7,0,6.999);
  frame.contentWindow.postMessage({type:'apple-story-progress',progress},location.origin);
}
function requestSync(){if(!syncFrame)syncFrame=requestAnimationFrame(sync);}
function fail(){
  clearTimeout(timeout); ready = false;
  frame?.remove(); frame = null;
  document.body.classList.remove('duo-enhanced');
  document.body.classList.add('duo-failed');
  const message = host.querySelector('.duo-loading');
  message.hidden = false;
  message.textContent = 'ฉาก 3D เปิดไม่ได้ อ่านคำอธิบายทุกฉากและบทวิเคราะห์ต่อด้านล่างได้';
}
function load(){
  if(frame || document.body.classList.contains('duo-failed') || document.body.classList.contains('reading-mode'))return;
  document.body.classList.add('duo-enhanced');
  host.append(document.getElementById('duo-template').content.cloneNode(true));
  frame = host.querySelector('iframe');
  frame.addEventListener('error',fail);
  frame.addEventListener('load',requestSync);
  timeout = setTimeout(fail,25000);
}
if(host && track){
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))load();},{rootMargin:'600px'}).observe(document.getElementById('iphone-duo'));
  } else load();
  addEventListener('scroll',requestSync,{passive:true});
  addEventListener('resize',()=>{if(!frame && track.getBoundingClientRect().top<innerHeight)load();requestSync();});
  document.addEventListener('visibilitychange',requestSync);
  addEventListener('message',event=>{
    if(event.origin!==location.origin || event.source!==frame?.contentWindow)return;
    if(event.data?.type==='apple-duo-ready'){
      clearTimeout(timeout); ready=true;
      host.querySelector('.duo-loading').hidden=true;
      document.body.dataset.duoReady='true';
      sync();
    }
    if(event.data?.type==='apple-duo-failed')fail();
    if(event.data?.type==='apple-story-scroll'&&Number.isFinite(event.data.delta))scrollBy({top:clamp(event.data.delta,-innerHeight,innerHeight),behavior:'instant'});
  });
}
