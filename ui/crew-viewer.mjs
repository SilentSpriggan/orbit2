// Interactive inspection of the same fitted subject used to render the procedures.
const modelRoot=new URL('./assets/collection/model/',import.meta.url);
const sites={preparation:[0,1.38,.045,.80],ecg:[0,1.32,.05,.68],pressure:[.22,1.24,.02,.58],
  temperature:[0,1.60,.035,.37],pulmonary:[0,1.48,.04,.64],ocular:[.022,1.57,.06,.34],chemistry:[.292,.80,.018,.23]};
let assetsPromise,softwareTextures;
function assets(){
  if(!assetsPromise)assetsPromise=(async()=>{
    await import('./vitals-illustrations.js');
    const response=await fetch(new URL('crew-model.json',modelRoot));
    if(!response.ok)throw Error('The human model could not be downloaded.');
    const model=window.VitalsIllustrations.decodeSubject(await response.json());
    const images={};
    await Promise.all([...new Set(Object.values(model.materials).map(m=>m.texture).filter(Boolean))].map(async name=>{
      const image=new Image();image.src=new URL(name,modelRoot).href;await image.decode();images[name]=image;
    }));
    return {model,images};
  })().catch(err=>{assetsPromise=null;throw err;});
  return assetsPromise;
}
function makeSoftwareTextures(images){
  if(softwareTextures)return softwareTextures;
  const result={};
  for(const [name,image] of Object.entries(images)){
    const levels=[];let previous=image,w=image.width,h=image.height;
    while(true){
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(previous,0,0,w,h);
      levels.push({width:w,height:h,data:ctx.getImageData(0,0,w,h).data});
      if(w===1&&h===1)break;
      previous=c;w=Math.max(1,w>>1);h=Math.max(1,h>>1);
    }
    result[name]=levels;
  }
  return softwareTextures=result;
}
function gpuScene(THREE,canvas,context,{model,images}){
  const renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,1,.008,12);
  const textures={},materials={},geometries=[];
  for(const [name,image] of Object.entries(images)){
    const texture=new THREE.Texture(image);texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;textures[name]=texture;
  }
  for(const [id,m] of Object.entries(model.materials)){
    materials[id]=new THREE.MeshStandardMaterial({map:textures[m.texture]||null,
      color:m.texture?0xffffff:new THREE.Color(...m.color.map(v=>v/255)),roughness:.88,metalness:0,alphaTest:m.cutout||0,side:THREE.DoubleSide});
  }
  for(const id of model.groups.figure){
    const data=model.meshes[id],g=new THREE.BufferGeometry();geometries.push(g);
    g.setAttribute('position',new THREE.BufferAttribute(data.v,3));g.setAttribute('normal',new THREE.BufferAttribute(data.n,3));
    if(data.uv)g.setAttribute('uv',new THREE.BufferAttribute(data.uv,2));
    g.setIndex(new THREE.BufferAttribute(data.i,1));scene.add(new THREE.Mesh(g,materials[data.material]));
  }
  scene.add(new THREE.HemisphereLight(0xfff8ef,0x989ba6,1.6));
  const key=new THREE.DirectionalLight(0xfff0dc,1.8);key.position.set(-1.8,3.4,3.1);scene.add(key);
  const rim=new THREE.DirectionalLight(0xc2e2f0,1.25);rim.position.set(2.1,2.2,-1.6);scene.add(rim);
  return {
    paint(v,w,h){
      if(canvas.width!==w||canvas.height!==h)renderer.setSize(w,h,false);
      camera.aspect=w/h;camera.updateProjectionMatrix();
      const framing=v.height*Math.max(1,.85/camera.aspect),distance=.5*framing/Math.tan(camera.fov*Math.PI/360);
      const [x,y,z]=v.target,cp=Math.cos(v.pitch);
      camera.position.set(x+Math.sin(v.yaw)*cp*distance,y+Math.sin(v.pitch)*distance,z+Math.cos(v.yaw)*cp*distance);
      camera.lookAt(x,y,z);renderer.render(scene,camera);
    },
    dispose(){for(const g of geometries)g.dispose();for(const m of Object.values(materials))m.dispose();for(const t of Object.values(textures))t.dispose();renderer.dispose();renderer.forceContextLoss();}
  };
}
export async function openCrewViewer(host,method,signal){
  const resources=await assets();if(signal.aborted)return;
  let canvas=host.querySelector('canvas');const hint=host.querySelector('[data-model-hint]');
  const standardHint='Drag or use the arrow keys to rotate. Pinch or use + and − to zoom.';
  let engine,webgl=false;
  try{
    const THREE=await import('three');if(signal.aborted)return;
    const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});
    if(gl){engine=gpuScene(THREE,canvas,gl,resources);webgl=true;}
  }catch{/* A context-free surface below also works on devices without WebGL. */}
  if(signal.aborted){engine?.dispose();return;}
  if(!engine){
    const fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);canvas=fresh;
    window.VitalsIllustrations.setSubject(resources.model,makeSoftwareTextures(resources.images));
    engine={paint(v,w,h){if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}window.VitalsIllustrations.drawPerson(canvas,v);},dispose(){}};
  }
  const defaultView=()=>({target:[0,.865,.012],height:1.88,yaw:.18,pitch:.025});
  let view=defaultView(),frame=0;
  const pointers=new Map();let separation=0;
  function paint(){
    frame=0;if(signal.aborted||host.hidden)return;
    const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
    const scale=webgl?Math.min(devicePixelRatio||1,1.65,1100/rect.width):Math.min(1,520/rect.width,320/rect.height);
    engine.paint(view,Math.max(1,Math.round(rect.width*scale)),Math.max(1,Math.round(rect.height*scale)));
  }
  const redraw=()=>{if(!frame)frame=requestAnimationFrame(paint);};
  function zoom(factor){view.height=Math.min(2.75,Math.max(.12,view.height*factor));redraw();}
  function focus(){const [x,y,z,h]=sites[method]||sites.preparation;view={target:[x,y,z],height:h,yaw:method==='chemistry' ? .98 : .23,pitch:.03};redraw();}
  const on=(el,type,fn,extra={})=>el.addEventListener(type,fn,{...extra,signal});
  on(canvas,'pointerdown',e=>{
    if(e.button!==0)return;
    canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);
    if(pointers.size===2){const [a,b]=pointers.values();separation=Math.hypot(a[0]-b[0],a[1]-b[1]);}
  });
  on(canvas,'pointermove',e=>{
    const before=pointers.get(e.pointerId);if(!before)return;
    pointers.set(e.pointerId,[e.clientX,e.clientY]);
    if(pointers.size===1){view.yaw-=(e.clientX-before[0])*.009;view.pitch=Math.max(-1.25,Math.min(1.25,view.pitch+(e.clientY-before[1])*.007));redraw();}
    else if(pointers.size===2){const [a,b]=pointers.values(),next=Math.hypot(a[0]-b[0],a[1]-b[1]);if(next>4&&separation>4)zoom(separation/next);separation=next;}
  });
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])on(canvas,ev,e=>{pointers.delete(e.pointerId);separation=0;});
  on(canvas,'wheel',e=>{e.preventDefault();zoom(Math.exp(Math.max(-150,Math.min(150,e.deltaY))*.002));},{passive:false});
  on(canvas,'keydown',e=>{
    if(e.key==='ArrowLeft')view.yaw-=.13;else if(e.key==='ArrowRight')view.yaw+=.13;
    else if(e.key==='ArrowUp')view.pitch=Math.min(1.25,view.pitch+.09);else if(e.key==='ArrowDown')view.pitch=Math.max(-1.25,view.pitch-.09);
    else if(e.key==='+'||e.key==='=')zoom(.82);else if(e.key==='-')zoom(1.22);
    else if(e.key==='Home')view=defaultView();else return;e.preventDefault();redraw();
  });
  on(host,'click',e=>{const b=e.target.closest('[data-model-action]');if(!b)return;
    if(b.dataset.modelAction==='site')focus();else if(b.dataset.modelAction==='reset'){view=defaultView();redraw();}
    else zoom(b.dataset.modelAction==='in' ? .82 : 1.22);
  });
  const resize=new ResizeObserver(redraw);resize.observe(host);
  const dispose=()=>{cancelAnimationFrame(frame);resize.disconnect();pointers.clear();engine.dispose();};
  signal.addEventListener('abort',dispose,{once:true});hint.textContent=standardHint;
  host.querySelector('.cl-model-tools').hidden=false;paint();
}
