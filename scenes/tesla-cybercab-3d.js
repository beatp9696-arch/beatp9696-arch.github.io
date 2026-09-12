import * as THREE from '../vendor/three/three.module.min.js';
import {OrbitControls} from '../vendor/three/OrbitControls.js';

// Original procedural illustration of a two-seat robotaxi silhouette; not a Tesla engineering model.
export function createCybercab(host, wake, reduced) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden','true');
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,70);
  const initial=new THREE.Vector3(-5.3,2.65,5.7);
  camera.position.copy(initial);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,.73,0);controls.enablePan=false;controls.enableZoom=false;
  controls.enableDamping=false;controls.minPolarAngle=.42;controls.maxPolarAngle=Math.PI/2.08;
  renderer.domElement.style.touchAction='pan-y';
  let autoOrbit=false, doorTarget=0, doorProgress=0, turn=0;
  const render=()=>renderer.render(scene,camera);
  controls.addEventListener('change',render);

  // Studio reflection cards give the gold panels a metallic surface without downloads.
  const room=new THREE.Scene();room.background=new THREE.Color('#53626a');
  const card=(x,y,z,w,h,intensity,rotation=0)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity*.94,intensity*.8),side:THREE.DoubleSide}));
    mesh.position.set(x,y,z);mesh.rotation.x=rotation;room.add(mesh);
  };
  card(0,5,0,8,4,5,Math.PI/2);card(-3,2,4,2,7,4);card(3,3,-4,5,3,3);card(0,1,-5,1,7,.2);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.035);
  scene.environment=environment.texture;
  pmrem.dispose();room.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
  scene.add(new THREE.HemisphereLight(0xeaf3ff,0x776142,2.2));
  const key=new THREE.DirectionalLight(0xffedcd,2.6);key.position.set(-4,7,5);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.03;scene.add(key);
  const rim=new THREE.DirectionalLight(0xb3d9ef,3);rim.position.set(3,4,-5);scene.add(rim);
  const front=new THREE.DirectionalLight(0xfff4de,1.5);front.position.set(-6,2,-2);scene.add(front);
  const gold=new THREE.MeshPhysicalMaterial({color:0xb99359,metalness:.83,roughness:.34,clearcoat:.7,clearcoatRoughness:.2});
  const paleGold=new THREE.MeshPhysicalMaterial({color:0xdcc69d,metalness:.8,roughness:.31,clearcoat:.65});
  const black=new THREE.MeshStandardMaterial({color:0x101619,roughness:.45,metalness:.25});
  const tire=new THREE.MeshStandardMaterial({color:0x101113,roughness:.92});
  const glass=new THREE.MeshPhysicalMaterial({color:0x14232b,metalness:.48,roughness:.16,clearcoat:1,side:THREE.DoubleSide});
  const seatMat=new THREE.MeshStandardMaterial({color:0x2b3030,roughness:.75});
  const white=new THREE.MeshBasicMaterial({color:0xf6ffee});
  const red=new THREE.MeshBasicMaterial({color:0xff5534});
  const vehicle=new THREE.Group();scene.add(vehicle);
  const mesh=(geometry,material,parent=vehicle)=>{const object=new THREE.Mesh(geometry,material);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;};
  function box(x,y,z,w,h,d,material,parent=vehicle) {const object=mesh(new THREE.BoxGeometry(w,h,d),material,parent);object.position.set(x,y,z);return object;}
  function panel(points,material,parent=vehicle) {
    const geometry=new THREE.BufferGeometry(), positions=[];
    for(let i=1;i<points.length-1;i++) positions.push(...points[0],...points[i],...points[i+1]);
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
    const result=mesh(geometry,material,parent);result.material.side=THREE.DoubleSide;return result;
  }
  // ── ตัวถัง ──────────────────────────────────────────────────────────────
  // หน้าตัด superellipse: ท้องแบน หลังคามน — ของเดิมเป็นท่อสี่เหลี่ยม 4 มุมต่อวง
  // แล้ว computeVertexNormals() เกลี่ย normal ข้ามมุม 90° จนขอบละลายเป็นก้อนเบลอ
  const SEG=32;
  function section(cy,halfH,halfW,nTop,nBot) {
    const pts=[];
    for(let i=0;i<SEG;i++) {
      const t=i/SEG*Math.PI*2,c=Math.cos(t),sn=Math.sin(t),n=sn>=0?nTop:nBot;
      pts.push([halfW*Math.sign(c)*Math.abs(c)**(2/n), cy+halfH*Math.sign(sn)*Math.abs(sn)**(2/n)]);
    }
    return pts;
  }
  // ring = [x, ท้องรถ, แนวเอว, ครึ่งความกว้าง, ความมนด้านบน, ความมนด้านล่าง]
  function hull(rings,material) {
    const positions=[],indices=[];
    for(const [x,bottom,top,halfW,nTop=2.5,nBot=4] of rings)
      for(const [z,y] of section((bottom+top)/2,(top-bottom)/2,halfW,nTop,nBot)) positions.push(x,y,z);
    for(let i=0;i<rings.length-1;i++) for(let j=0;j<SEG;j++) {
      const a=i*SEG+j,b=i*SEG+(j+1)%SEG,c=b+SEG,d=a+SEG;indices.push(a,d,b,b,d,c);
    }
    const last=(rings.length-1)*SEG;   // ปิดหัว-ท้าย ไม่ให้มองทะลุเข้าในตัวถัง
    for(let j=1;j<SEG-1;j++){indices.push(0,j,j+1);indices.push(last,last+j+1,last+j);}
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();return mesh(geometry,material);
  }
  // โดมกระจก: loft ครึ่งบนจากแนวเอวขึ้นหลังคา ใช้หน้าตัดชุดเดียวกับตัวถัง
  // จึงโค้งรับกันสนิท — ของเดิมเป็นแผ่นแบน 3 แผ่นแปะทับ เลยดูเป็นเต็นท์ลอย
  function canopy(rings,material) {
    const N=24,positions=[],indices=[];
    for(const [x,belt,roof,halfW,n=2.5] of rings)
      for(let i=0;i<=N;i++) {
        const t=i/N*Math.PI,c=Math.cos(t),sn=Math.sin(t);
        positions.push(x, belt+(roof-belt)*Math.abs(sn)**(2/n), halfW*Math.sign(c)*Math.abs(c)**(2/n));
      }
    const W=N+1;
    for(let i=0;i<rings.length-1;i++) for(let j=0;j<N;j++) {
      const a=i*W+j,b=a+1,c=b+W,d=a+W;indices.push(a,b,d,b,c,d);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setIndex(indices);g.computeVertexNormals();
    const o=mesh(g,material);o.material.side=THREE.DoubleSide;return o;
  }
  // ทรงหยดน้ำ: จมูกต่ำเรียว กว้างสุดที่ซุ้มล้อ ท้ายสอบ (1 หน่วย ≈ 1 เมตร)
  const BODY=[
    [-2.30,.40,.62,.42,2.0,2.6],[-2.14,.33,.70,.62,2.1,3.0],
    [-1.80,.28,.80,.82,2.3,3.6],[-1.30,.26,.87,.93,2.4,4.0],
    [ -.60,.25,.92,.99,2.5,4.2],[  .20,.25,.94,1.00,2.5,4.2],
    [  .95,.26,.93,.99,2.5,4.2],[ 1.55,.29,.89,.94,2.4,3.8],
    [ 1.95,.35,.82,.82,2.3,3.2],[ 2.22,.44,.70,.55,2.1,2.6],
  ];hull(BODY,gold);
  // โดมกระจกแคบกว่าตัวถังเล็กน้อย (tumblehome) เริ่ม-จบที่แนวเอวพอดี
  const CANOPY=[
    [-1.34,.87,.88,.60,2.3],[ -.95,.88,1.14,.72,2.4],
    [ -.45,.90,1.34,.80,2.5],[  .15,.91,1.45,.84,2.6],
    [  .75,.91,1.44,.83,2.6],[ 1.25,.90,1.33,.78,2.5],
    [ 1.70,.87,1.10,.67,2.4],[ 1.98,.84,.85,.53,2.3],
  ];canopy(CANOPY,glass);
  box(0,.32,0,3.5,.10,1.60,black);          // พื้นห้องโดยสาร
  const beam=(a,b,r,material,parent=vehicle)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
    const o=mesh(new THREE.CylinderGeometry(r,r,direction.length(),12),material,parent);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return o;
  };
  for(const side of [-1,1]) {
    beam([-1.30,.885,side*.58],[-.40,.905,side*.79],.016,black);   // เสา A ตามโค้งโดม
    beam([1.30,.895,side*.76],[1.94,.845,side*.52],.016,black);    // เสา C
    const seat=box(.26,.60,side*.40,.52,.16,.52,seatMat);seat.rotation.z=-.07;
    const back=box(.58,.86,side*.40,.14,.52,.50,seatMat);back.rotation.z=.14;
    box(.66,1.16,side*.40,.12,.15,.27,black);
    // ล้อ: ยางเล็กลงให้ได้สัดส่วนจริง (Ø .76 ม.) ฝาครอบแอโรเสมอผิวตัวถัง
    for(const x of [-1.40,1.42]) {
      const wheel=mesh(new THREE.CylinderGeometry(.38,.38,.26,64),tire);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.38,side*.84);
      const disc=mesh(new THREE.CylinderGeometry(.315,.330,.030,64),paleGold);disc.rotation.x=Math.PI/2;disc.position.set(x,.38,side*.975);
      const hub=mesh(new THREE.CylinderGeometry(.050,.050,.035,32),gold);hub.rotation.x=Math.PI/2;hub.position.set(x,.38,side*.998);
      mesh(new THREE.TorusGeometry(.337,.011,10,64),gold).position.set(x,.38,side*.980);
    }
  }
  box(-.44,.92,0,.04,.24,.36,black).rotation.z=-.22;
  box(-.47,.93,0,.008,.20,.31,new THREE.MeshBasicMaterial({color:0x456865})).rotation.z=-.22;
  beam([-2.27,.640,-.60],[-2.27,.640,.60],.012,white);
  for(const side of [-1,1]) beam([-2.27,.640,side*.60],[-2.02,.700,side*.82],.014,white);
  box(-2.19,.44,0,.03,.10,1.20,black);
  beam([2.145,.735,-.62],[2.145,.735,.62],.013,red);

  // ── ประตูปีกผีเสื้อ ───────────────────────────────────────────────────
  // เปลือกประตูสุ่มจากผิวตัวถัง/โดมชุดเดียวกัน แล้วดันออกนอก 12 มม.
  // ของเดิมเป็นแผ่นแบน z คงที่ ทาบบนตัวถังที่โค้ง เลยโผล่เป็นแผ่นทองแปะข้าง
  const at=(rings,x)=>{                       // interpolate ring ที่ตำแหน่ง x
    let i=0;while(i<rings.length-2&&rings[i+1][0]<x)i++;
    const a=rings[i],b=rings[i+1],k=Math.min(1,Math.max(0,(x-a[0])/(b[0]-a[0])));
    return a.map((v,j)=>v+(b[j]-v)*k);
  };
  const bodyPt=(x,t)=>{const[,bo,to,hw,nT,nB]=at(BODY,x);
    const c=Math.cos(t),sn=Math.sin(t),n=sn>=0?nT:nB;
    return[x,(bo+to)/2+(to-bo)/2*Math.sign(sn)*Math.abs(sn)**(2/n),hw*Math.sign(c)*Math.abs(c)**(2/n)];};
  const canoPt=(x,t)=>{const[,be,ro,hw,n]=at(CANOPY,x);
    const c=Math.cos(t),sn=Math.sin(t);
    return[x,be+(ro-be)*Math.abs(sn)**(2/n),hw*Math.sign(c)*Math.abs(c)**(2/n)];};
  // ประตูจริงของรถ 2 ที่นั่ง: สั้นกว่าสีข้างทั้งแผง และขึ้นไปแค่ไหล่โดม ไม่กินหลังคา
  const X0=-1.05,X1=.60,NU=16,NV=9;
  function doorPatch(side,t0,t1,onCanopy,material,parent) {
    const positions=[],indices=[];
    for(let iu=0;iu<=NU;iu++) {
      const x=X0+(X1-X0)*iu/NU;
      for(let iv=0;iv<=NV;iv++) {
        const t=t0+(t1-t0)*iv/NV;
        const p=onCanopy?canoPt(x,t):bodyPt(x,t);
        positions.push(p[0],p[1],side*p[2]*1.014);
      }
    }
    const W=NV+1;
    for(let iu=0;iu<NU;iu++) for(let iv=0;iv<NV;iv++) {
      const a=iu*W+iv,b=a+1,c=b+W,d=a+W;
      if(side>0) indices.push(a,b,d,b,c,d); else indices.push(a,d,b,b,d,c);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setIndex(indices);g.computeVertexNormals();
    const o=mesh(g,material,parent);o.material.side=THREE.DoubleSide;return o;
  }
  const doors=[];
  for(const side of [-1,1]) {
    const h=canoPt(X0,.72);                       // บานพับที่มุมหน้า-บน ตามรางหลังคา
    const hinge=new THREE.Group();hinge.position.set(h[0],h[1],side*h[2]*1.014);vehicle.add(hinge);
    const shell=new THREE.Group();
    shell.position.set(-hinge.position.x,-hinge.position.y,-hinge.position.z);hinge.add(shell);
    doorPatch(side,-.60,0,false,gold.clone(),shell);   // สีข้างจากชายล่างถึงแนวเอว
    doorPatch(side,0,.72,true,glass.clone(),shell);    // กระจกข้างขึ้นไปถึงไหล่โดม
    doors.push({hinge,side});
  }
  const ground=mesh(new THREE.CircleGeometry(4.7,96),new THREE.ShadowMaterial({opacity:.35}),scene);ground.rotation.x=-Math.PI/2;ground.position.y=.018;ground.castShadow=false;
  const ring=mesh(new THREE.RingGeometry(3.35,3.36,128),new THREE.MeshBasicMaterial({color:0x827959,transparent:true,opacity:.3,side:THREE.DoubleSide}),scene);ring.rotation.x=-Math.PI/2;ring.position.y=.012;ring.castShadow=false;
  function pose() {
    // บานผีเสื้อ: ยกน้อยลง กางออกด้านข้างมากขึ้น — ของเดิมยก 62° จนบานตั้งฉากดูเป็นแผ่นแบน
    for(const {hinge,side} of doors) {hinge.rotation.z=doorProgress*.72;hinge.rotation.x=side*doorProgress*.80;}
  }
  function resize() {const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<500?44:34;camera.updateProjectionMatrix();render();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  controls.update();resize();host.classList.add('is-ready');
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.classList.remove('is-ready');document.getElementById('rx-studio-controls').hidden=true;});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{host.classList.add('is-ready');document.getElementById('rx-studio-controls').hidden=false;render();});
  return {
    update(dt) {
      if(reduced) return;
      if(Math.abs(doorProgress-doorTarget)>.001) {doorProgress+=(doorTarget-doorProgress)*Math.min(1,dt*4.5);if(Math.abs(doorProgress-doorTarget)<.003)doorProgress=doorTarget;pose();}
      if(autoOrbit) {const p=camera.position.clone().sub(controls.target);p.applyAxisAngle(new THREE.Vector3(0,1,0),dt*.22);camera.position.copy(p.add(controls.target));controls.update();}
      render();
    },
    isMoving:()=>!reduced && (autoOrbit || Math.abs(doorProgress-doorTarget)>.001),
    setDoor(open) {doorTarget=open?1:0;if(reduced){doorProgress=doorTarget;pose();render();}wake();},
    setOrbit(value) {autoOrbit=value;wake();},
    setReduced(value) {reduced=value;if(value){doorProgress=doorTarget;pose();render();}},
    nextView() {turn++;const p=initial.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),turn*Math.PI/2);camera.position.copy(p.add(controls.target));controls.update();render();},
    reset() {autoOrbit=false;turn=0;camera.position.copy(initial);controls.update();render();}
  };
}
