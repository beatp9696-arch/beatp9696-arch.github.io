import * as T from 'three';

export function buildHardware(k) {
  const root=new T.Group();
  const parts={};
  const add=(parent,id,pos)=>{const p=k.group(parent,id,pos);parts[id]=p;return p;};
  const laptop=add(root,'laptop');
  const shell=add(laptop,'enclosure');
  k.slab(shell,8.05,5.55,.15,'metal',[0,.025,0],.24);
  // Deep machined side walls surround the components and meet the removable cover.
  for(const x of [-3.94,3.94])k.slab(shell,.14,5.16,.44,'metal',[x,-.23,0],.07);
  for(const z of [-2.64,2.64])k.slab(shell,7.66,.13,.44,'metal',[0,-.23,z],.06);
  k.slab(shell,1.08,.09,.065,'black',[0,.057,2.71],.04);
  // Port outlines, recessed openings and their internal contacts.
  const ports=add(shell,'ports');
  for(const [x,z,len] of [[-4.018,-1.91,.36],[-4.018,-1.25,.32],[-4.018,-.65,.32],[4.018,-1.76,.46],[4.018,-.97,.32],[4.018,.03,.72]]){
    k.slab(ports,.017,len+.07,.15,'edge',[x,-.20,z],.015);
    k.slab(ports,.024,len,.105,'black',[x*1.001,-.20,z],.01);
    k.slab(ports,.028,len*.64,.025,'metal',[x*1.002,-.205,z],.004);
  }
  const audio=k.cylinder(ports,.058,.025,'black',[-4.03,-.2,.0]);audio.rotation.z=Math.PI/2;
  const vents=[];for(let i=0;i<70;i++)vents.push({p:[-3.52+i*.102,-.24,-2.718]});
  k.instances(shell,new T.BoxGeometry(.052,.13,.015),'black',vents);

  const deck=add(laptop,'keyboard');
  k.slab(deck,6.56,2.69,.025,'black',[0,.117,-.79],.13);
  const keys=[];const legends=[];
  const rows=['1234567890−=','QWERTYUIOP[]','ASDFGHJKL;\'','ZXCVBNM,./'];
  for(let row=0;row<4;row++)for(let col=0;col<rows[row].length;col++){
    const x=-2.83+col*.476+(row===3?.26:0);const z=-1.64+row*.47;
    keys.push({p:[x,.157,z]});legends.push([rows[row][col],x,z]);
  }
  k.instances(deck,k.shape(.413,.407,.062,.055),'black',keys);
  for(let i=0;i<13;i++){k.slab(deck,.43,.28,.055,'black',[-2.88+i*.48,.15,-2.02],.04);legends.push([i===0?'esc':i===12?'◉':'F'+i,-2.88+i*.48,-2.02]);}
  k.slab(deck,.64,.41,.062,'black',[2.91,.157,-.70],.05);
  k.slab(deck,.9,.41,.062,'black',[2.79,.157,-.23],.05);
  for(const x of [-2.9,-2.39,-1.88,1.87,2.39,2.9])k.slab(deck,.43,.37,.055,'black',[x,.15,.26],.04);
  k.slab(deck,2.75,.37,.055,'black',[0,.15,.26],.04);
  const keymap=k.texture((ctx,w,h)=>{ctx.fillStyle='#bcc0c5';ctx.textAlign='center';ctx.textBaseline='middle';for(const [str,x,z]of legends){ctx.font=str.length>1?'14px Arial':'23px Arial';ctx.fillText(str,(x/6.56+.5)*w,((z+.79)/2.69+.5)*h);}},1536,768);
  k.print(deck,6.56,2.69,keymap,[0,.191,-.79]);
  const trackpad=add(laptop,'trackpad');k.slab(trackpad,3.47,1.63,.025,'edge',[0,.106,1.56],.12);k.slab(trackpad,3.43,1.59,.027,'metal',[0,.121,1.56],.11);
  const perforations=[];for(const x of [-3.59,3.59])for(let i=0;i<7;i++)for(let j=0;j<45;j++)perforations.push({p:[x+(i-3)*.038,.108,-2.15+j*.060]});
  k.instances(deck,new T.CylinderGeometry(.008,.008,.007,5),'black',perforations);
  const touch=k.cylinder(deck,.13,.012,'edge',[2.88,.185,-2.02]);k.cylinder(deck,.111,.014,'black',[2.88,.195,-2.02]);

  const display=add(laptop,'display',[0,.31,-2.54]);
  const hinge=k.cylinder(display,.105,7.27,'black');hinge.rotation.z=Math.PI/2;
  const lid=k.group(display,'display');
  const lidBack=k.slab(lid,8.03,5.12,.13,'metal',[0,2.49,0],.2);lidBack.rotation.x=Math.PI/2;
  const bezel=k.slab(lid,7.84,4.92,.025,'black',[0,2.49,.077],.17);bezel.rotation.x=Math.PI/2;
  const wallpaper=k.texture((ctx,w,h)=>{
    ctx.fillStyle='#08090e';ctx.fillRect(0,0,w,h);
    const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#e4d9fa');g.addColorStop(.26,'#756c98');g.addColorStop(.48,'#171623');g.addColorStop(.7,'#837c9c');g.addColorStop(1,'#e1dcfa');
    ctx.strokeStyle=g;ctx.lineCap='round';ctx.lineJoin='round';
    for(let i=0;i<12;i++){ctx.lineWidth=39-i*2.4;ctx.globalAlpha=.06+i*.016;ctx.beginPath();ctx.moveTo(-100,h*.85-i*15);ctx.bezierCurveTo(w*.14,h*.13,w*.53,h*1.03,w*.54,h*.5);ctx.bezierCurveTo(w*.53,h*.07,w*.90,h*.52,w+100,h*.12);ctx.stroke();}
    ctx.globalAlpha=1;ctx.fillStyle='#f3f0f9';ctx.font='300 65px Arial';ctx.textAlign='center';ctx.fillText('MacBook Pro',w/2,h*.46);ctx.font='18px monospace';ctx.fillStyle='#acacbc';ctx.fillText('A CLOSER LOOK AT WHAT IS INSIDE',w/2,h*.53);
  },1800,1120);
  const screen=new T.Mesh(new T.PlaneGeometry(7.64,4.64),new T.MeshBasicMaterial({map:wallpaper}));screen.position.set(0,2.52,.098);lid.add(screen);
  const notch=k.slab(lid,.81,.2,.026,'black',[0,4.78,.101],.036);notch.rotation.x=Math.PI/2;
  const lens=k.mesh(lid,new T.CircleGeometry(.024,16),{color:0x26354b,metalness:.7,roughness:.16},[0,4.78,.121]);
  // A subtle apple-shaped mark is drawn on the back, as part of the product study.
  const apple=k.texture((ctx,w,h)=>{ctx.fillStyle='#1e2228';ctx.beginPath();ctx.moveTo(w*.51,h*.30);ctx.bezierCurveTo(w*.25,h*.12,w*.15,h*.5,w*.34,h*.78);ctx.bezierCurveTo(w*.44,h*.94,w*.47,h*.75,w*.53,h*.82);ctx.bezierCurveTo(w*.67,h*.95,w*.8,h*.65,w*.79,h*.62);ctx.bezierCurveTo(w*.60,h*.56,w*.68,h*.40,w*.81,h*.35);ctx.bezierCurveTo(w*.7,h*.17,w*.6,h*.22,w*.51,h*.3);ctx.fill();ctx.beginPath();ctx.ellipse(w*.58,h*.16,w*.12,h*.06,-.7,0,Math.PI*2);ctx.fill();},256,256);
  const logo=k.print(lid,.62,.62,apple,[0,2.6,-.078]);logo.rotation.x=Math.PI;

  const internals=add(laptop,'internals');internals.rotation.z=Math.PI;
  const inner=add(internals,'innerframe');k.slab(inner,7.68,5.2,.035,'edge',[0,.102,0],.18);
  // Insulating regions remain dark, with a machined metallic perimeter.
  k.slab(inner,7.40,4.99,.028,'rubber',[0,.131,0],.13);
  const battery=add(internals,'battery');
  const cellMap=k.texture((ctx,w,h)=>{ctx.fillStyle='#222427';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#414448';ctx.lineWidth=4;ctx.strokeRect(18,18,w-36,h-36);ctx.fillStyle='#6a7074';ctx.font='34px Arial';ctx.fillText('Li-ion',42,74);ctx.font='16px monospace';ctx.fillText('RECHARGEABLE BATTERY',42,107);ctx.fillText('ILLUSTRATIVE CELL',42,132);ctx.font='14px monospace';for(let i=0;i<11;i++)ctx.fillText('— —— ——— — ———— —— ——— —',42,180+i*19);ctx.font='48px Arial';ctx.fillText('♻',w-100,h-42);},512,512);
  const cells=[[-2.82,.74,1.12,1.22],[-2.82,1.92,1.12,.96],[-1.32,1.29,1.73,2.3],[.52,1.29,1.73,2.3],[2.1,.74,1.13,1.22],[2.1,1.92,1.13,.96]];
  for(const [x,z,w,d]of cells){k.slab(battery,w,d,.24,'rubber',[x,.268,z],.095);k.print(battery,w-.08,d-.08,cellMap,[x,.392,z]);k.slab(battery,.34,.14,.03,'copper',[x,.22,z-d/2-.04],.015);}
  const speakers=add(internals,'speakers');
  for(const x of [-3.55,3.49]){k.slab(speakers,.39,2.66,.23,'black',[x,.28,1.10],.15);for(const z of [.24,1.84]){k.slab(speakers,.31,.7,.05,'rubber',[x,.409,z],.14);k.slab(speakers,.23,.54,.02,'black',[x,.441,z],.1);}}
  // Irregular board assembled from connected sections, with hundreds of components.
  const board=add(internals,'board');
  const pcbShape=new T.Shape();pcbShape.moveTo(-3.605,-1.09);pcbShape.lineTo(3.605,-1.09);pcbShape.lineTo(3.605,1.09);pcbShape.lineTo(-3.605,1.09);pcbShape.closePath();
  for(const x of [-2.53,2.53]){const hole=new T.Path();hole.absarc(x,.06,.91,0,Math.PI*2,true);pcbShape.holes.push(hole);}
  const pcbGeo=new T.ExtrudeGeometry(pcbShape,{depth:.085,bevelEnabled:false,curveSegments:32});pcbGeo.translate(0,0,-.0425);pcbGeo.rotateX(-Math.PI/2);
  const vertex=pcbGeo.attributes.position,uv=pcbGeo.attributes.uv;for(let i=0;i<vertex.count;i++)uv.setXY(i,vertex.getX(i)/7.21+.5,-vertex.getZ(i)/2.18+.5);
  k.mesh(board,pcbGeo,new T.MeshStandardMaterial({map:k.circuitMap(83),metalness:.42,roughness:.45}),[0,.203,-1.32]);
  k.slab(board,2.85,.6,.085,'pcb',[0,.203,-.02],.06);
  k.print(board,2.75,.56,k.circuitMap(29),[0,.248,-.02]);
  const passives=[],ends=[];let rnd=928;const rand=()=>{rnd=(rnd*1664525+1013904223)>>>0;return rnd/4294967296;};
  for(let i=0;i<320;i++){
    const x=(rand()-.5)*6.85,z=-2.27+rand()*1.88;
    if((Math.abs(x)<1.4&&z<-.75)||(Math.abs(x)>1.65&&Math.abs(x)<3.4&&z<-.85))continue;
    passives.push({p:[x,.286,z],s:[.035+rand()*.045,.035,.025+rand()*.025]});
    ends.push({p:[x-.032,.289,z],s:[.014,.036,.04]},{p:[x+.032,.289,z],s:[.014,.036,.04]});
  }
  k.instances(board,new T.BoxGeometry(1,1,1),'rubber',passives);k.instances(board,new T.BoxGeometry(1,1,1),'edge',ends);
  for(let i=0;i<12;i++){const x=-3.25+i*.59;k.slab(board,.29,.23,.07,'black',[x,.282,-.51],.017);k.label(board,'IC',.21,.12,[x,.321,-.51]);}
  const soc=add(board,'soc',[0,.29,-1.47]);
  k.slab(soc,1.48,1.24,.07,'gold');k.slab(soc,1.37,1.14,.075,'silicon',[0,.07,0]);k.label(soc,'M5 MAX',1.13,.68,[0,.111,0],'APPLE SILICON','#d3d4dc');
  const memory=add(board,'memory');
  for(const x of [-1.02,1.02])for(const z of [-1.83,-1.14]){k.slab(memory,.47,.55,.11,'black',[x,.32,z],.018);k.label(memory,'DRAM',.37,.25,[x,.379,z]);}
  const storage=add(board,'storage');
  for(const x of [-1.46,1.46]){k.slab(storage,.54,.51,.09,'black',[x,.306,-.43],.02);k.label(storage,'NAND',.43,.26,[x,.355,-.43]);}
  const fanRotors=[];const cooling=add(internals,'cooling');
  for(const x of [-2.53,2.53]){
    const fan=add(cooling,x<0?'fan-left':'fan-right',[x,.31,-1.38]);
    k.cylinder(fan,.88,.19,'black');k.cylinder(fan,.72,.205,'rubber');
    const rotor=k.group(fan,'cooling');fanRotors.push(rotor);
    const blades=[];for(let i=0;i<62;i++){const a=i*Math.PI*2/62;blades.push({p:[Math.cos(a)*.475,.13,Math.sin(a)*.475],r:[0,-a+.5,0]});}
    k.instances(rotor,k.shape(.36,.019,.032,.007),{color:0x3c4147,metalness:.6,roughness:.37},blades);
    k.cylinder(fan,.245,.025,'edge',[0,.134,0]);k.cylinder(fan,.20,.03,'metal',[0,.151,0]);k.label(fan,'◉',.13,.1,[0,.168,0]);
    for(const [dx,dz]of [[-.65,-.62],[.65,-.62],[0,.76]])k.screw(fan,dx,.125,dz);
    for(let j=0;j<34;j++)k.slab(fan,.036,.41,.17,'metal',[-.67+j*.04,.03,-.88],.003);
  }
  const heatsink=add(internals,'heatsink');
  k.slab(heatsink,1.71,1.4,.07,'black',[0,.466,-1.5],.12);
  for(const dz of [-.21,.10])k.tube(heatsink,[[-2.55,.44,-2.16],[ -1.56,.48,-2.17],[-.75,.49,-1.60+dz],[.75,.49,-1.60+dz],[1.56,.48,-2.17],[2.55,.44,-2.16]],.069,'black');
  for(const x of [-.7,.7])for(const z of [-2.07,-.93])k.screw(heatsink,x,.51,z,.04);
  // Flex cables, gold fingers, ZIF connectors and small connector cowlings.
  const cables=add(internals,'cables');
  for(const [x,z,w,d]of [[0,.14,.48,.66],[-3.32,-.05,.19,.51],[3.26,-.02,.19,.49],[-.7,-2.3,.38,.21],[.7,-2.3,.38,.21]]){
    k.slab(cables,w,d,.023,'copper',[x,.34,z],.008);k.slab(cables,w+.08,.12,.065,'black',[x,.31,z-d/2],.018);
    const fingers=[];for(let i=0;i<10;i++)fingers.push({p:[x-w*.43+i*w*.095,.355,z+d/2-.06]});k.instances(cables,new T.BoxGeometry(w*.04,.008,.09),'gold',fingers);
  }
  for(const x of [-3.60,3.60])for(const z of [-2.3,-.29,.16,2.29])k.screw(inner,x,.2,z);
  k.label(board,'LOGIC BOARD / M5 MAX STUDY',1.55,.10,[0,.253,-.21]);
  const cover=add(laptop,'cover',[0,-.46,0]);
  k.slab(cover,7.99,5.47,.085,'metal',[0,0,0],.24);
  for(const x of [-3.36,3.36])for(const z of [-2.16,2.16])k.cylinder(cover,.26,.038,'rubber',[x,-.066,z]);
  const bottomText=k.label(cover,'MacBook Pro',2.1,.27,[0,-.048,0],'DESIGNED IN CALIFORNIA');bottomText.rotation.x=Math.PI/2;
  const coverMaterials=[];cover.traverse(obj=>{if(obj.isMesh){obj.material=obj.material.clone();obj.material.transparent=true;coverMaterials.push(obj.material);}});
  const screws=add(laptop,'screws');
  for(const x of [-3.66,0,3.66])for(const z of [-2.36,2.36]){const sg=k.group(screws,'screws',[x,-.505,z]);sg.rotation.z=Math.PI;k.screw(sg,0,0,0,.044);k.cylinder(sg,.018,.09,'edge',[0,-.04,0],8);}

  // Retail packaging: independent lid, shaped insert, envelope, charger and cable.
  const packaging=add(root,'packaging');
  const box=add(packaging,'box',[0,-1.04,0]);
  k.slab(box,9.4,6.74,.12,'paper',[0,-.31,0],.075);
  for(const x of [-4.64,4.64])k.slab(box,.12,6.70,.82,'paper',[x,.11,0],.018);
  for(const z of [-3.31,3.31])k.slab(box,9.18,.12,.82,'paper',[0,.11,z],.018);
  k.slab(box,8.96,6.30,.16,{color:0xc5c1b7,roughness:1},[0,-.15,0],.10);
  const tray=add(packaging,'tray',[0,-.59,0]);k.slab(tray,8.96,6.29,.08,'paper');
  for(const x of [-4.35,4.35])k.slab(tray,.31,6.18,.25,'paper',[x,.12,0],.10);
  for(const z of [-2.98,2.98])k.slab(tray,8.64,.28,.25,'paper',[0,.12,z],.09);
  const tab=k.slab(tray,.57,.73,.015,{color:0xf4f2ec,roughness:.9},[0,.08,2.65],.07);
  const boxLid=add(packaging,'box-lid',[0,-.34,0]);
  k.slab(boxLid,9.48,6.82,.19,'paper',[0,.59,0],.07);
  for(const x of [-4.68,4.68])k.slab(boxLid,.10,6.77,.69,'paper',[x,.18,0],.016);
  for(const z of [-3.36,3.36])k.slab(boxLid,9.31,.10,.69,'paper',[0,.18,z],.016);
  const side=k.print(boxLid,3.1,.45,k.textMap('MacBook Pro','','#52535a'),[0,.15,3.417]);side.rotation.x=0;
  // Printed product illustration, generated from vector paths instead of remote assets.
  const boxArt=k.texture((ctx,w,h)=>{
    ctx.fillStyle='#e5e2dc';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w*.5,h*.51);ctx.rotate(-.10);
    ctx.fillStyle='#36383e';ctx.beginPath();ctx.roundRect(-w*.32,-h*.36,w*.64,h*.54,25);ctx.fill();
    ctx.fillStyle='#0d0b13';ctx.fillRect(-w*.30,-h*.34,w*.60,h*.49);
    ctx.strokeStyle='#756b84';ctx.lineWidth=28;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-w*.29,h*.06);ctx.bezierCurveTo(-w*.1,-h*.36,w*.06,h*.24,w*.1,-h*.09);ctx.bezierCurveTo(w*.12,-h*.32,w*.25,-h*.07,w*.3,-h*.29);ctx.stroke();
    ctx.fillStyle='#74767b';ctx.beginPath();ctx.moveTo(-w*.32,h*.18);ctx.lineTo(w*.32,h*.18);ctx.lineTo(w*.41,h*.35);ctx.lineTo(-w*.41,h*.35);ctx.closePath();ctx.fill();ctx.fillStyle='#303239';ctx.fillRect(-w*.28,h*.20,w*.56,h*.065);ctx.strokeStyle='#555860';ctx.lineWidth=2;ctx.strokeRect(-w*.1,h*.28,w*.20,h*.045);ctx.restore();
  },1600,1100);
  k.print(boxLid,8.87,6.19,boxArt,[0,.692,0]);
  const accessories=add(packaging,'accessories',[0,-1.1,0]);
  const charger=add(accessories,'charger',[-2.53,.12,0]);k.slab(charger,1.43,1.37,.64,{color:0xe5e5e2,roughness:.3},[0,0,0],.19);k.slab(charger,.35,.12,.10,'black',[0,.07,.70],.02);
  for(const x of [-.18,.18])k.slab(charger,.055,.28,.25,'edge',[x,.04,-.81],.006);
  const cable=add(accessories,'cable',[1.9,.04,0]);
  for(let i=0;i<5;i++){const ring=k.mesh(cable,new T.TorusGeometry(.84+i*.046,.029,7,80),{color:0xb4b6b4,roughness:.95},[0,i*.014,0]);ring.rotation.x=Math.PI/2;}
  k.slab(cable,.25,.49,.13,'paper',[.88,.10,.43],.06);k.slab(cable,.19,.14,.095,'edge',[.88,.10,.74],.025);
  const envelope=add(accessories,'envelope',[0,.10,0]);k.slab(envelope,1.66,2.1,.065,'paper');k.label(envelope,'Designed by Apple',1.36,.20,[0,.04,.2],'IN CALIFORNIA','#858585');

  function update(stage,amount,time,ease=1){
    packaging.visible=stage<2;
    boxLid.position.set(-amount*2.0,-.34+amount*3.7,-amount*2.1);
    boxLid.rotation.z=-amount*.1;
    tray.position.y=-.59+amount*.55;
    accessories.position.set(0,-1.1+amount*.7,stage===1?amount*4.5:0);
    laptop.position.y=T.MathUtils.lerp(laptop.position.y,stage===0?-.1:stage===1?-.1+amount*1.75:0,ease);
    laptop.rotation.z=T.MathUtils.lerp(laptop.rotation.z,stage>=3?Math.PI:0,ease);
    lid.rotation.x=T.MathUtils.lerp(lid.rotation.x,stage===2?Math.PI/2-amount*(Math.PI/2+.20):Math.PI/2,ease);
    laptop.visible=stage<5;
    cover.position.set(stage>=3?-amount*7.5:0,stage>=3?-.46-amount*1.9:-.46,0);
    const coverAlpha=stage>=3?1-T.MathUtils.smoothstep(amount,.55,.98):1;
    coverMaterials.forEach(m=>{m.opacity=coverAlpha;m.depthWrite=coverAlpha>.95;});
    screws.position.y=stage>=3?-amount*1.2:0;
    heatsink.position.y=stage>=4?amount*2.2:0;
    heatsink.position.x=stage>=4?-amount*3.5:0;
    if(stage===4){
      board.position.y=amount*.65;
      cooling.visible=false;battery.visible=false;speakers.visible=false;cover.visible=false;screws.visible=false;shell.visible=false;deck.visible=false;trackpad.visible=false;display.visible=false;inner.visible=false;cables.visible=false;
    }else{
      board.position.y=0;for(const p of [cooling,battery,speakers,cover,screws,shell,deck,trackpad,display,inner,cables])p.visible=true;
      if(stage===3&&amount>.98){cover.visible=false;screws.visible=false;}
    }
    for(const rotor of fanRotors)rotor.rotation.y=time*.2;
  }
  update(0,0,0);
  return {root,parts,update};
}
