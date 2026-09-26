import * as T from 'three';

export function createKit(renderer) {
  const materials = new Map(), shapes = new Map();
  const tones = {
    metal: {color:0x50565e,metalness:.88,roughness:.27}, edge:{color:0x9198a0,metalness:.95,roughness:.22},
    black:{color:0x101215,metalness:.24,roughness:.43}, rubber:{color:0x17191c,metalness:.05,roughness:.85},
    pcb:{color:0x16221e,metalness:.4,roughness:.45}, gold:{color:0xc8ad76,metalness:.83,roughness:.32},
    copper:{color:0xad7850,metalness:.9,roughness:.31}, paper:{color:0xe3e0d8,metalness:0,roughness:.87},
    silicon:{color:0x33445c,metalness:.76,roughness:.25}, blue:{color:0x658eaf,metalness:.56,roughness:.4},
    mint:{color:0x7ca78d,metalness:.45,roughness:.45}, violet:{color:0x8b79af,metalness:.45,roughness:.45},
  };
  function mat(style='metal') {
    if(style.isMaterial)return style;
    const config=typeof style==='string'?tones[style]:style;
    const key=JSON.stringify(config);
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial(config));
    return materials.get(key);
  }
  function group(parent,id,position=[0,0,0]) {
    const g=new T.Group();g.position.fromArray(position);g.userData.id=id;parent.add(g);return g;
  }
  function mesh(parent,geo,style,pos=[0,0,0]) {
    const m=new T.Mesh(geo,mat(style));m.position.fromArray(pos);parent.add(m);return m;
  }
  function shape(w,d,h,r=.04){
    const key=[w,d,h,r].join(',');if(shapes.has(key))return shapes.get(key);
    r=Math.min(r,w/2,d/2);
    const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
    const bevel=Math.min(.018,h/5);const geo=new T.ExtrudeGeometry(s,{depth:h-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:5,steps:1});geo.translate(0,0,-(h-2*bevel)/2);geo.rotateX(-Math.PI/2);shapes.set(key,geo);return geo;
  }
  function slab(parent,w,d,h,style,pos=[0,0,0],r=.04){return mesh(parent,shape(w,d,h,r),style,pos);}
  function cylinder(parent,r,h,style,pos=[0,0,0],segments=32){return mesh(parent,new T.CylinderGeometry(r,r,h,segments),style,pos);}
  function texture(draw,w=1024,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
  function print(parent,w,d,map,pos=[0,0,0]){const p=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.fromArray(pos);parent.add(p);return p;}
  function textMap(title,sub='',color='#c0c7c7',bg=null){return texture((ctx,w,h)=>{if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);}ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 170px Arial';ctx.fillText(title,w/2,h*(sub?.39:.5),w*.92);if(sub){ctx.font='38px monospace';ctx.fillText(sub,w/2,h*.79,w*.92);}},1024,384);}
  function label(parent,text,w,d,pos,sub='',color='#c0c7c7'){return print(parent,w,d,textMap(text,sub,color),pos);}
  function tube(parent,points,r,style){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(parent,new T.TubeGeometry(path,Math.max(12,points.length*8),r,8,false),style);}
  function instances(parent,geo,style,items){const obj=new T.InstancedMesh(geo,mat(style),items.length);const m=new T.Object3D();items.forEach((a,i)=>{m.position.fromArray(a.p);m.rotation.set(...(a.r||[0,0,0]));m.scale.set(...(a.s||[1,1,1]));m.updateMatrix();obj.setMatrixAt(i,m.matrix);});obj.instanceMatrix.needsUpdate=true;parent.add(obj);return obj;}
  function screw(parent,x,y,z,r=.047){cylinder(parent,r,.025,'edge',[x,y,z],16);for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;const line=slab(parent,r*.85,.008,.003,'black',[x+Math.sin(angle)*r*.15,y+.014,z+Math.cos(angle)*r*.15],.002);line.rotation.y=angle;}}
  function circuitMap(seed=7,w=2048,h=1024){
    let state=seed;const rand=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
    return texture((ctx,cw,ch)=>{ctx.fillStyle='#16211f';ctx.fillRect(0,0,cw,ch);for(let i=0;i<600;i++){const x=rand()*cw,y=rand()*ch,len=15+rand()*160;ctx.strokeStyle=i%7===0?'#ab966b':i%3===0?'#44634d':'#294237';ctx.lineWidth=i%7===0?2:1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len*.5,y);ctx.lineTo(x+len*.7,y+len*.2);ctx.lineTo(x+len,y+len*.2);ctx.stroke();ctx.fillStyle='#a0916b';ctx.fillRect(x-1,y-1,3,3);}ctx.fillStyle='#8a9790';ctx.font='18px monospace';for(let i=0;i<32;i++)ctx.fillText('R'+(1000+i*17),rand()*cw,rand()*ch);},w,h);
  }
  return {group,mesh,mat,shape,slab,cylinder,texture,print,textMap,label,tube,instances,screw,circuitMap};
}
