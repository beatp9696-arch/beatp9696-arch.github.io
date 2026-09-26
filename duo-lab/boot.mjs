const embedded = new URLSearchParams(location.search).has('embed');
function failed(error) {
  if (embedded) parent.postMessage({type:'apple-duo-failed'},location.origin);
  else {
    document.getElementById('lead').textContent = 'เปิดภาพ 3D ไม่ได้ในเบราว์เซอร์นี้ ลองเปิดใหม่ด้วยเบราว์เซอร์ที่รองรับ WebGL';
  }
  console.warn('Duo visual unavailable',error);
}
document.getElementById('stage').addEventListener('webglcontextlost',event=>{
  event.preventDefault();failed('WebGL context lost');
});
import('./lab.mjs').catch(failed);
