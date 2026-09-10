import * as THREE from '../vendor/three/three.module.min.js';
import {OrbitControls} from '../vendor/three/OrbitControls.js';

// Original procedural illustration based on the supplied Cybercab reference.
export function createCybercab(host, wake, reduced) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
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
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.03;scene.add(key);
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
  function hull(rings,material) {
    const positions=[],indices=[];
    for(const [x,bottom,top,width] of rings) positions.push(x,bottom,-width,x,top,-width,x,top,width,x,bottom,width);
    for(let i=0;i<rings.length-1;i++) for(let j=0;j<4;j++) {let a=i*4+j,b=i*4+(j+1)%4,c=b+4,d=a+4;indices.push(a,b,d,b,c,d);}
    indices.push(0,3,1,1,3,2);const end=(rings.length-1)*4;indices.push(end,end+1,end+3,end+1,end+2,end+3);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return mesh(geometry,material);
  }
  hull([[-2.28,.42,.66,.73],[-2.05,.39,.76,.92],[-1.5,.36,.79,.98],[-.7,.35,.8,.99],[.7,.35,.81,.99],[1.5,.38,.86,.96],[2.12,.48,.9,.83]],gold);
  // Continuous hood line and tapered tail, leaving an actual dark passenger opening.
  hull([[-2.28,.61,.68,.73],[-1.8,.72,.84,.91],[-1.05,.77,1.02,.96],[-.62,.76,1.04,.94]],gold);
  hull([[.92,.76,1.07,.95],[1.5,.78,1.03,.96],[2.12,.67,.91,.83]],gold);
  box(0,.45,0,3.6,.14,1.85,black);
  box(.12,.76,0,1.5,.08,1.68,black);
  // Windshield, glass roof and rear glass form the characteristic continuous canopy.
  panel([[-1.1,.98,-.85],[-1.1,.98,.85],[-.19,1.57,.66],[-.19,1.57,-.66]],glass);
  panel([[-.19,1.57,-.66],[-.19,1.57,.66],[.73,1.55,.65],[.73,1.55,-.65]],glass);
  panel([[.73,1.55,-.65],[.73,1.55,.65],[1.52,1.02,.86],[1.52,1.02,-.86]],glass);
  const beam=(a,b,r,material,parent=vehicle)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
    const o=mesh(new THREE.CylinderGeometry(r,r,direction.length(),8),material,parent);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return o;
  };
  for(const side of [-1,1]) {
    beam([-1.1,.99,side*.86],[-.19,1.58,side*.67],.033,black);
    beam([-.19,1.58,side*.67],[.73,1.56,side*.66],.025,black);
    beam([.73,1.56,side*.66],[1.52,1.03,side*.87],.035,gold);
    // Two sculpted seats and a center touchscreen, visible through opened doors.
    const seat=box(.3,.93,side*.42,.55,.18,.56,seatMat);seat.rotation.z=-.08;
    const back=box(.65,1.17,side*.42,.15,.55,.55,seatMat);back.rotation.z=.15;
    box(.72,1.48,side*.42,.13,.16,.29,black);
    // Wheels: thick tires, smooth gold aero covers, a shallow concentric lip and central cap.
    for(const x of [-1.43,1.43]) {
      const wheel=mesh(new THREE.CylinderGeometry(.445,.445,.23,64),tire);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.475,side*.94);
      const disc=mesh(new THREE.CylinderGeometry(.367,.388,.035,64),paleGold);disc.rotation.x=Math.PI/2;disc.position.set(x,.475,side*1.07);
      const hub=mesh(new THREE.CylinderGeometry(.063,.063,.04,32),gold);hub.rotation.x=Math.PI/2;hub.position.set(x,.475,side*1.094);
      const ring=mesh(new THREE.TorusGeometry(.393,.013,8,64),gold);ring.position.set(x,.475,side*1.074);
    }
  }
  box(-.48,1.12,0,.04,.25,.37,black).rotation.z=-.22;
  box(-.51,1.13,0,.008,.205,.32,new THREE.MeshBasicMaterial({color:0x456865})).rotation.z=-.22;
  // Thin front light bar and dark lower grille, matching the reference silhouette.
  beam([-2.29,.673,-.71],[-2.29,.673,.71],.012,white);
  for(const side of [-1,1]) beam([-2.29,.673,side*.71],[-2.04,.74,side*.91],.014,white);
  box(-2.21,.49,0,.03,.1,1.35,black);
  beam([2.125,.865,-.8],[2.125,.865,.8],.013,red);

  const doors=[];
  for(const side of [-1,1]) {
    const hinge=new THREE.Group();hinge.position.set(-.77,.93,side*.94);vehicle.add(hinge);
    panel([[0,-.35,0],[1.63,-.3,0],[1.62,.12,0],[.22,.11,0]],gold,hinge);
    panel([[-.29,.06,0],[1.62,.12,0],[1.49,.62,-side*.28],[.58,.64,-side*.28]],glass,hinge);
    beam([.22,.12,.003],[1.62,.12,.003],.012,black,hinge);
    beam([.58,.59,-side*.28],[1.39,.57,-side*.28],.018,black,hinge);
    beam([0,-.35,0],[1.63,-.3,0],.017,black,hinge);
    doors.push({hinge,side});
  }
  const ground=mesh(new THREE.CircleGeometry(4.7,96),new THREE.ShadowMaterial({opacity:.35}),scene);ground.rotation.x=-Math.PI/2;ground.position.y=.018;ground.castShadow=false;
  const ring=mesh(new THREE.RingGeometry(3.35,3.36,128),new THREE.MeshBasicMaterial({color:0x827959,transparent:true,opacity:.3,side:THREE.DoubleSide}),scene);ring.rotation.x=-Math.PI/2;ring.position.y=.012;ring.castShadow=false;
  function pose() {
    for(const {hinge,side} of doors) {hinge.rotation.z=doorProgress*1.08;hinge.rotation.x=side*doorProgress*.52;}
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
