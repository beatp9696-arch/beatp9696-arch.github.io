import * as T from 'three';

// The layout below is an explanatory block diagram, never a claimed die photograph.
export function buildSilicon(k) {
  const root=new T.Group(),parts={};
  const add=(parent,id,pos)=>{const p=k.group(parent,id,pos);parts[id]=p;return p;};
  const chip=add(root,'chip');
  const substrate=add(chip,'substrate');
  k.slab(substrate,7.6,5.5,.21,'pcb',[0,-.22,0],.09);
  k.slab(substrate,7.47,5.37,.035,'gold',[0,-.092,0],.045);
  k.slab(substrate,7.35,5.25,.035,'pcb',[0,-.067,0],.035);
  k.print(substrate,7.26,5.16,k.circuitMap(47),[0,-.047,0]);
  const balls=[];for(let x=0;x<25;x++)for(let z=0;z<18;z++)balls.push({p:[-3.46+x*.286,-.37,-2.40+z*.283]});
  k.instances(substrate,new T.SphereGeometry(.058,8,6),'gold',balls);
  const caps=[];for(let i=0;i<28;i++)for(const z of [-2.46,2.46])caps.push({p:[-3.28+i*.243,.021,z]});
  for(let i=0;i<18;i++)for(const x of [-3.47,3.47])caps.push({p:[x,.021,-2.2+i*.26],r:[0,Math.PI/2,0]});
  k.instances(substrate,k.shape(.15,.07,.06,.008),'edge',caps);
  const die=add(chip,'dies');
  for(const x of [-1.58,1.58]){k.slab(die,2.92,4.45,.07,'gold',[x,.035,0],.014);k.slab(die,2.85,4.38,.08,'silicon',[x,.096,0],.01);}
  const bridge=add(chip,'fusion');
  k.slab(bridge,.18,3.40,.036,'gold',[0,.11,0],.008);
  for(let i=0;i<70;i++)k.slab(bridge,.23,.013,.012,'edge',[0,.137,-1.60+i*.046],.002);
  const cpu=add(chip,'cpu');
  const blockTexture=k.texture((ctx,w,h)=>{
    ctx.fillStyle='#c9b57d';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#857248';ctx.lineWidth=2;
    for(let i=0;i<30;i++){ctx.beginPath();ctx.moveTo(i*w/30,0);ctx.lineTo(i*w/30,h);ctx.stroke();}
    ctx.fillStyle='#655c41';for(let y=10;y<h;y+=30)for(let x=12;x<w;x+=25)ctx.fillRect(x,y,16,16);
    ctx.fillStyle='#ebd99b';ctx.fillRect(w*.04,h*.04,w*.4,h*.37);ctx.fillRect(w*.53,h*.04,w*.42,h*.37);
  },256,256);
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){
    const x=-2.54+col*.78,z=-1.65+row*.63;k.slab(cpu,.70,.54,.105,'gold',[x,.205,z],.01);k.print(cpu,.65,.49,blockTexture,[x,.261,z]);
  }
  k.label(cpu,'6 SUPER CORES',2.45,.20,[-1.66,.154,-.50],'','#ecd9a5');
  for(let row=0;row<2;row++)for(let col=0;col<6;col++){
    const x=-2.71+col*.409,z=-.12+row*.47;k.slab(cpu,.348,.39,.08,'gold',[x,.195,z],.009);k.print(cpu,.31,.35,blockTexture,[x,.239,z]);
  }
  k.label(cpu,'12 PERFORMANCE CORES',2.47,.17,[-1.67,.155,.73],'','#ecd9a5');
  const gpu=add(chip,'gpu');
  const gpuMap=k.texture((ctx,w,h)=>{ctx.fillStyle='#5a8099';ctx.fillRect(0,0,w,h);ctx.fillStyle='#253b51';for(let x=5;x<w;x+=17)for(let y=5;y<h;y+=12)ctx.fillRect(x,y,10,7);ctx.fillStyle='#9cc4d4';ctx.fillRect(w*.09,h*.06,w*.82,h*.12);},256,256);
  for(let row=0;row<8;row++)for(let col=0;col<5;col++){
    const x=.55+col*.5,z=-1.70+row*.36;k.slab(gpu,.447,.299,.072,'blue',[x,.19,z],.009);k.print(gpu,.408,.265,gpuMap,[x,.23,z]);
  }
  k.label(gpu,'40 GPU CORES',2.57,.21,[1.57,.155,1.14],'','#a7cbdf');
  const neural=add(chip,'neural');
  for(let i=0;i<16;i++)k.slab(neural,.139,.30,.075,'violet',[-2.75+(i%8)*.29,.19,1.18+Math.floor(i/8)*.37],.008);
  k.label(neural,'NEURAL ENGINE',2.45,.18,[-1.67,.154,1.90],'','#c7b5e5');
  const media=add(chip,'media');k.slab(media,2.33,.40,.083,'mint',[1.62,.188,1.69],.025);k.label(media,'MEDIA ENGINE',2.02,.20,[1.62,.235,1.69],'','#e3f0e4');
  const dram=add(chip,'unified');
  for(const x of [-4.33,4.33])for(const z of [-1.3,1.3]){k.slab(dram,.83,1.92,.22,'black',[x,-.005,z],.035);k.label(dram,'DRAM',.67,.72,[x,.114,z],'UNIFIED MEMORY');}
  const lid=add(chip,'package-lid');k.slab(lid,6.42,4.92,.085,{color:0x4c555f,metalness:.88,roughness:.23},[0,.38,0],.08);k.label(lid,'M5 Max',3.7,1.8,[0,.427,0],'APPLE SILICON','#e2e3e4');
  k.label(substrate,'FUSION ARCHITECTURE · CONCEPTUAL LAYOUT',5.50,.15,[0,-.023,2.48],'','#a4bfb0');

  // One generic CPU core enlarged into a working, stepped instruction example.
  const core=add(root,'core');
  k.slab(core,9.2,6.25,.13,'silicon',[0,-.18,0],.08);
  k.slab(core,9.35,6.4,.035,'gold',[0,-.269,0],.05);
  k.print(core,9.04,6.09,k.circuitMap(195),[0,-.11,0]);
  const modules=[
    ['cache','INSTRUCTION CACHE',[-3.05,.06,-.05],2.0,4.70,'blue'],
    ['fetch','FETCH',[-.72,.13,-1.79],1.76,1.01,'mint'],
    ['decode','DECODE',[-.72,.13,-.37],1.76,1.01,'mint'],
    ['schedule','SCHEDULE',[-.72,.13,1.13],1.76,1.15,'violet'],
    ['alu','EXECUTE / ALU',[2.12,.13,-1.45],2.51,1.68,'gold'],
    ['registers','REGISTERS',[2.12,.13,.35],2.51,1.12,'blue'],
    ['retire','RETIRE',[2.12,.13,1.86],2.51,1.0,'mint'],
  ];
  const nodes={};
  for(const [id,title,pos,w,d,color]of modules){
    const g=add(core,id,pos);nodes[id]=new T.Vector3(pos[0],.46,pos[2]);
    k.slab(g,w,d,.14,color,[0,0,0],.035);
    const subtiles=[];for(let x=0;x<12;x++)for(let z=0;z<Math.floor(d*9);z++)subtiles.push({p:[-w*.45+x*w*.081,.095,-d*.44+z*.10]});
    k.instances(g,new T.BoxGeometry(w*.061,.04,.064),{color:color==='gold'?0x9e834c:color==='blue'?0x3b5b72:color==='violet'?0x5c497d:0x4b7460,metalness:.5,roughness:.44},subtiles);
    k.slab(g,w*.92,.36,.019,'black',[0,.145,-d*.27],.008);k.label(g,title,w*.86,.26,[0,.159,-d*.27],'','#edf0e8');
    if(id==='alu')k.label(g,'7 + 5',1.5,.48,[0,.152,.40],'','#fff0b8');
    if(id==='registers')k.label(g,'R1 = 7     R2 = 5',2.11,.22,[0,.152,.20],'','#d7e6f5');
  }
  const routes=[['cache','fetch'],['fetch','decode'],['decode','schedule'],['schedule','alu'],['alu','registers'],['registers','retire']];
  for(const [from,to]of routes){const a=nodes[from],b=nodes[to];k.tube(core,[[a.x,.015,a.z],[a.x+(b.x-a.x)*.5,.018,a.z],[b.x,.018,b.z]],.014,'gold');}
  k.label(core,'ONE CPU CORE · SIMPLIFIED INSTRUCTION PATH',7.6,.22,[0,-.087,2.91],'','#c9d7cf');
  const signal=new T.Mesh(new T.SphereGeometry(.085,16,12),new T.MeshBasicMaterial({color:0xffe29c}));core.add(signal);signal.visible=false;
  const halo=new T.Mesh(new T.RingGeometry(.13,.17,32),new T.MeshBasicMaterial({color:0xece6b0,side:T.DoubleSide}));halo.rotation.x=-Math.PI/2;core.add(halo);halo.visible=false;
  function update(stage,amount,progress){
    chip.visible=stage===5;core.visible=stage===6;
    lid.position.set(-amount*5.5,amount*2.2,-amount*1.2);lid.visible=amount<.98;
    dram.position.y=amount*.35;
    if(stage===6&&progress>=0){
      const idx=Math.min(5,Math.floor(progress));const t=progress-idx;const a=nodes[routes[idx][0]],b=nodes[routes[idx][1]];
      signal.visible=true;signal.position.lerpVectors(a,b,t);halo.visible=true;halo.position.copy(nodes[routes[idx][1]]);halo.position.y=.40;
    }else{signal.visible=false;halo.visible=false;}
  }
  update(0,0,-1);
  return {root,parts,update};
}
