import './embed.mjs';
import * as T from 'three';
import { RoomEnvironment } from '../macbook-lab/vendor/RoomEnvironment.js';
import { createKit } from '../macbook-lab/geometry.mjs';
import { buildHardware } from '../macbook-lab/hardware.mjs';
import { buildSilicon } from '../macbook-lab/silicon.mjs';

const $ = id => document.getElementById(id);
const chapters = [...document.querySelectorAll('[data-chapter]')];
const nav = [...document.querySelectorAll('.chapter-nav a')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = T.MathUtils.clamp;
const titles = ['THE OBJECT', 'UNDER THE SURFACE', 'THE LOGIC BOARD', 'APPLE SILICON', 'PATTERNS OF LOGIC', 'A TRANSISTOR', 'SILICON ATOMS'];
const scales = ['30 cm', '10 cm', '3 cm', '1 cm', '10 μm', '100 nm', '1 nm'];
const markers = [.05, .10, .15, .20, .50, .70, .90];
let renderer, world, camera, hardware, silicon, cells, transistor, atoms;
let target = 0, current = 0, last = 0, raf = 0, active = -1, failed = false;

function makeCells(k) {
  const root = new T.Group();
  k.slab(root, 10, 8, .18, 'silicon', [0, -.15, 0], .02);
  const bases = [], gates = [], contacts = [], wires = [];
  for (let x = 0; x < 36; x++) for (let z = 0; z < 28; z++) {
    const px = (x - 17.5) * .265, pz = (z - 13.5) * .27;
    bases.push({p: [px, .035, pz]});
    gates.push({p: [px, .15, pz]});
    for (const dx of [-.075, .075]) contacts.push({p: [px + dx, .12, pz]});
  }
  for (let x = 0; x < 36; x++) wires.push({p: [(x - 17.5) * .265, .215, 0]});
  k.instances(root, new T.BoxGeometry(.23, .11, .22), {color:0x505d5d, metalness:.65, roughness:.35}, bases);
  k.instances(root, new T.BoxGeometry(.045, .16, .24), {color:0xa9b497, metalness:.75, roughness:.29}, gates);
  k.instances(root, new T.BoxGeometry(.04, .09, .10), 'edge', contacts);
  k.instances(root, new T.BoxGeometry(.022, .022, 7.8), 'gold', wires);
  return root;
}

function makeTransistor(k) {
  const root = new T.Group();
  k.slab(root, 8.5, 6, .8, {color:0x646c70,metalness:.4,roughness:.43}, [0,-.6,0], .02);
  k.slab(root, 8.5, 6, .12, {color:0x85918a,metalness:.5,roughness:.32}, [0,-.14,0], .02);
  for (const x of [-2.8, 2.8]) {
    k.slab(root, 2.1, 3.3, .48, 'edge', [x,.12,0], .02);
    for (const z of [-1,0,1]) k.slab(root,.65,.65,1.45,'metal',[x,.99,z],.03);
  }
  for (const z of [-1,0,1]) {
    k.slab(root, 5.5, .30, .33, {color:0xb4cda4,metalness:.35,roughness:.4}, [0,.04,z], .015);
    k.slab(root, .8, .70, 1.25, {color:0x98a3a4,metalness:.75,roughness:.26}, [0,.50,z], .04);
  }
  k.slab(root, .95, 3.5, .26, 'gold', [0,1.26,0], .03);
  const signal = new T.Mesh(new T.BoxGeometry(5.5,.035,.11),new T.MeshBasicMaterial({color:0xccf899}));
  signal.position.set(0,.24,0);root.add(signal);
  return root;
}

function makeAtoms(k) {
  const root = new T.Group(), points = [], bonds = [];
  // Diamond-cubic lattice; ball-and-stick representation, not orbital sizes.
  const basis = [[0,0,0],[0,.5,.5],[.5,0,.5],[.5,.5,0],[.25,.25,.25],[.25,.75,.75],[.75,.25,.75],[.75,.75,.25]];
  for(let x=0;x<5;x++)for(let y=0;y<3;y++)for(let z=0;z<5;z++)for(const b of basis)points.push(new T.Vector3((x+b[0]-2.5)*1.65,(y+b[1]-1.5)*1.65,(z+b[2]-2.5)*1.65));
  const geo = new T.SphereGeometry(.115,12,9);
  k.instances(root,geo,{color:0xa8b3b3,metalness:.65,roughness:.30},points.map(p=>({p:p.toArray()})));
  const rodGeo = new T.CylinderGeometry(.035,.035,1,5);
  const up = new T.Vector3(0,1,0), direction = new T.Vector3(), position = new T.Vector3();
  const distance = Math.sqrt(3) / 4 * 1.65;
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(Math.abs(points[i].distanceTo(points[j])-distance)<.001)bonds.push([i,j]);
  const rods = new T.InstancedMesh(rodGeo,k.mat({color:0x65767b,metalness:.6,roughness:.4}),bonds.length);
  const dummy = new T.Object3D();
  bonds.forEach(([a,b],i)=>{direction.subVectors(points[b],points[a]);position.copy(points[a]).add(points[b]).multiplyScalar(.5);dummy.position.copy(position);dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());dummy.scale.set(1,direction.length(),1);dummy.updateMatrix();rods.setMatrixAt(i,dummy.matrix);});
  root.add(rods);
  const center=points.reduce((a,b)=>b.lengthSq()<a.lengthSq()?b:a,points[0]);
  const glow=new T.Mesh(new T.SphereGeometry(.16,20,14),new T.MeshStandardMaterial({color:0xd8ffac,emissive:0xb4ff70,emissiveIntensity:1.1,roughness:.4}));glow.position.copy(center);root.add(glow);
  const light=new T.PointLight(0xc9ff9a,4,4);light.position.copy(center);root.add(light);
  return root;
}

function updateText(index, local) {
  $('progress').style.transform=`scaleX(${clamp(current/7,0,1)})`;
  const next=Math.min(6,index+1);
  $('scale-marker').style.top=`${T.MathUtils.lerp(markers[index],markers[next],local)*100}%`;
  if(active===index)return;
  active=index;
  $('object-label').textContent=`0${index+1} / ${titles[index]}`;
  $('step-count').textContent=`0${index+1} / 07`;
  $('scale-value').textContent=scales[index];
  $('model-note').textContent=index<3?'แบบจำลองการจัดวาง ไม่ใช่แบบโรงงาน':index===3?'ผังหน้าที่เชิงแนวคิด ไม่ใช่ผังชิปจริง':'แบบจำลองหลักการ ไม่ใช่โครงสร้างชิป Apple จริง';
  nav.forEach((a,i)=>{if(i===index)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});
  document.body.dataset.chapter=String(index);
}

function render(time) {
  raf=0;
  if(document.hidden)return;
  const dt=Math.min(.05,(time-last)/1000||.016);last=time;
  current=reduced.matches?target:T.MathUtils.lerp(current,target,1-Math.exp(-dt*9));
  if(Math.abs(target-current)<.0005)current=target;
  const index=Math.min(6,Math.floor(current)), local=current-index;
  updateText(index,clamp(local,0,1));
  if(renderer&&!failed&&!document.body.classList.contains('reading-mode')&&$('journey').getBoundingClientRect().bottom>0) {
    const mobile=innerWidth<=700;
    const motion=reduced.matches?.2:local;
    const zoom=reduced.matches?1.1:1+Math.pow(clamp((motion-.12)/.88,0,1),3)*5;
    hardware.root.visible=index<3;silicon.root.visible=index===3;
    cells.visible=index===4;transistor.visible=index===5;atoms.visible=index===6;
    const views=[[[8,7,11],[0,1.3,0]],[[1,13,7],[0,.2,0]],[[2,11,6],[0,.5,-1.1]],[[2,12,7],[0,.1,0]],[[4,11,8],[0,.1,0]],[[7,5,9],[0,.2,0]],[[8,5,10],[0,0,0]]];
    if(index<3){hardware.update(index===0?2:index===1?3:4,1,0,1);hardware.root.rotation.y=index===0?-.18+motion*.15:motion*.08;}
    if(index===3)silicon.update(5,1,-1);
    const [position,look]=views[index];
    const vec=new T.Vector3(...position).sub(new T.Vector3(...look));
    vec.multiplyScalar((mobile?1.65:1.18)/zoom);
    camera.position.copy(vec).add(new T.Vector3(...look));camera.lookAt(...look);
    // Short exposure dip hides the change between explanatory levels of detail.
    const edge=reduced.matches?1:Math.min(1,index===0?1:local/.065,index===6?1:(1-local)/.065);
    renderer.toneMappingExposure=1.15*(.45+.55*clamp(edge,0,1));
    renderer.render(world,camera);
  }
  if(current!==target)raf=requestAnimationFrame(render);
}

function requestRender(){if(!raf)raf=requestAnimationFrame(render);}
function measure(){
  const y=scrollY;
  let next=0;
  for(let i=0;i<chapters.length;i++){
    const rect=chapters[i].getBoundingClientRect(),top=rect.top+y;
    if(y>=top)next=i+clamp((y-top)/rect.height,0,.999);
  }
  target=clamp(next,0,6.999);
  const menu=document.querySelector('.chapter-nav');
  if(menu)menu.hidden=$('journey').getBoundingClientRect().bottom<innerHeight*.4;
  requestRender();
}
function resize(){
  if(renderer&&!failed&&$('scene').clientWidth){const r=$('scene').getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.setViewOffset(r.width,r.height,innerWidth<=700?0:-r.width*.16,innerWidth<=700?r.height*.16:0,r.width,r.height);camera.updateProjectionMatrix();}
  measure();
}
function failure(){failed=true;$('status').hidden=false;$('status').textContent='ภาพ 3D เปิดไม่ได้ในเบราว์เซอร์นี้ เลื่อนอ่านเรื่องราวต่อได้';document.body.dataset.ready='fallback';document.body.classList.remove('story-enhanced');}
try {
  world=new T.Scene();camera=new T.PerspectiveCamera(36,1,.03,160);
  renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;
  $('scene').append(renderer.domElement);
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);world.environment=pmrem.fromScene(room,.035).texture;room.dispose();pmrem.dispose();
  world.add(new T.HemisphereLight(0xe7eef1,0x263d32,3));
  for(const [color,strength,pos]of [[0xfff3df,4,[-5,12,8]],[0xbddeed,3,[9,6,-5]],[0xc8ffc0,1,[-7,3,-6]]]){const light=new T.DirectionalLight(color,strength);light.position.fromArray(pos);world.add(light);}
  const kit=createKit(renderer);hardware=buildHardware(kit);silicon=buildSilicon(kit);cells=makeCells(kit);transistor=makeTransistor(kit);atoms=makeAtoms(kit);
  world.add(hardware.root,silicon.root,cells,transistor,atoms);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();failure();});
  $('status').hidden=true;document.body.dataset.ready='true';document.body.classList.add('story-enhanced');
} catch(error){console.error('Apple story scene failed',error);failure();}
addEventListener('scroll',measure,{passive:true});addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestRender();});
reduced.addEventListener('change',requestRender);
resize();
