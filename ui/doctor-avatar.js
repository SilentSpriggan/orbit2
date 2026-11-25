import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { DoctorSoftwareRenderer } from './doctor-software3d.js';
import { DoctorMotion } from './doctor-motion.mjs';
import { addDoctorBodyRig, applyDoctorBodyRig, DOCTOR_NECK_PIVOT } from './doctor-body.mjs';
import { createDoctorArmRig, applyDoctorArmRig } from './doctor-arm.mjs';
import { createDoctorHeadset } from './doctor-headset.mjs';
import { createDoctorWatch, updateDoctorWatch } from './doctor-watch.mjs';
import { createDoctorMaterials, createDoctorStudio, AVATAR_QUALITY } from './doctor-materials.js';
import { refineFemaleFace } from './doctor-appearance.mjs';

export async function mountDoctorAvatar({host,persona='male',getVolume=()=>0,onReady=()=>{},onError=()=>{},onPreviewEnd=()=>{},onYawnStateChange=()=>{},onWatchStateChange=()=>{}}){
  persona=persona==='female'?'female':'male';host.dataset.persona=persona;host.dataset.appearance='1.19.2';delete host.dataset.hair;delete host.dataset.face;
  const motion=new DoctorMotion(),scene=new THREE.Scene(),pivot=new THREE.Group();
  scene.add(pivot);pivot.position.y=.027;const headEquipment=createDoctorHeadset();pivot.add(headEquipment);
  let alive=true,frame=null,last=0,lastDraw=0,yaw=0,pitch=0,drag=null,meshes=[],renderer,armRig,watchModel,materials;
  let quality='balanced',framing='portrait';
  const canvas=document.createElement('canvas');let context=null;
  try{context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'default'});}catch{}
  if(context){renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;}
  else renderer=new DoctorSoftwareRenderer();
  renderer.setPixelRatio(renderer.isSoftwareRenderer?.85:Math.min(window.devicePixelRatio||1,AVATAR_QUALITY[quality].pixelRatio));renderer.setClearColor(0x000000,0);
  const view=renderer.domElement;view.tabIndex=0;view.setAttribute('role','img');
  view.setAttribute('aria-label',`3D ${persona} virtual space doctor with shoulders in ${persona==='female'?'pink':'blue'} scrubs. Drag or use arrow keys to rotate. Home resets the view.`);
  host.append(view);host.dataset.renderer=renderer.isSoftwareRenderer?'software':'webgl';
  const camera=new THREE.PerspectiveCamera(28,1,.01,5);camera.position.set(0,.14,.97);camera.lookAt(0,.14,.005);
  const studio=createDoctorStudio(scene,renderer);studio.setQuality(quality);
  host.dataset.quality=quality;host.dataset.framing=framing;

  function apply(pose){
    const wasPreview=host.dataset.preview==='true',wasYawn=host.dataset.yawning==='true',wasWatch=host.dataset.watchChecking==='true';
    pivot.rotation.set(pitch+pose.pitch,yaw+pose.yaw,pose.roll);
    pivot.position.x=pose.bodyShift||0;headEquipment.rotation.set(pose.headPitch||0,pose.headYaw||0,pose.headRoll||0);host.dataset.yaw=pivot.rotation.y.toFixed(3);host.dataset.headPitch=(pose.headPitch||0).toFixed(4);host.dataset.headYaw=(pose.headYaw||0).toFixed(4);host.dataset.gazeX=(pose.gazeX||0).toFixed(4);host.dataset.gazeY=(pose.gazeY||0).toFixed(4);host.dataset.idleLooking=String(!!pose.idleLooking);host.dataset.breath=(pose.breath||0).toFixed(4);host.dataset.shoulderLeft=(pose.shoulderLeft||0).toFixed(4);host.dataset.shoulderRight=(pose.shoulderRight||0).toFixed(4);
    for(const m of meshes){
      const d=m.morphTargetDictionary,w=m.morphTargetInfluences;if(!d||!w)continue;
      w.fill(0);
      const set=(key,value)=>{if(d[key]!==undefined)w[d[key]]=value;};
      set('jawOpen',pose.jaw*.62);set('viseme_aa',pose.jaw*.10);
      set('mouthFunnel',pose.jaw*(pose.rounding||0)*.24);set('mouthPucker',pose.jaw*(pose.rounding||0)*.09);
      set('mouthStretchLeft',pose.jaw*(pose.spread||0)*.13);set('mouthStretchRight',pose.jaw*(pose.spread||0)*.12);
      set('mouthPressUpper',pose.press||0);set('mouthPressLower',(pose.press||0)*.8);set('viseme_PP',(pose.press||0)*.6);
      set('viseme_FF',pose.fricative||0);set('viseme_I',pose.tongue||0);
      set('eyeBlinkLeft',pose.blink);set('eyeBlinkRight',pose.blink);
      set('browInnerUpLeft',pose.brow*.9);set('browInnerUpRight',pose.brow);set('browOuterUpLeft',pose.brow*.4);set('browOuterUpRight',pose.brow*.5);
      set('mouthSmileLeft',pose.cheek||0);set('mouthSmileRight',(pose.cheek||0)*.8);
      set('eyeSquintLeft',pose.squint||0);set('eyeSquintRight',pose.squint||0);
      applyDoctorBodyRig(m,pose);
      if(m.userData.eyeCenter){
        // Rotate each eye about its turned socket, rather than its rest center.
        const head=headEquipment.quaternion,neck=new THREE.Vector3(0,DOCTOR_NECK_PIVOT,0);
        const center=m.userData.eyeCenter.clone().sub(neck).applyQuaternion(head).add(neck);
        const gaze=new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.gazeY||0,pose.gazeX||0,0));
        m.quaternion.copy(head).multiply(gaze).multiply(head.clone().invert());
        m.position.copy(center).sub(center.clone().applyQuaternion(m.quaternion));
      }
    }
    if(armRig)applyDoctorArmRig(armRig,pose);
    if(watchModel)updateDoctorWatch(watchModel);
    host.dataset.yawning=String(!!pose.yawning);host.dataset.yawnCover=(pose.yawnCover||0).toFixed(3);host.dataset.yawnPreview=String(!!pose.yawnPreview);host.dataset.handDistance=(armRig?.lastDistance||0).toFixed(4);
    if(wasYawn!==!!pose.yawning)onYawnStateChange();
    host.dataset.watchChecking=String(!!pose.watchChecking);host.dataset.watchRaise=(pose.watchRaise||0).toFixed(3);host.dataset.watchPreview=String(!!pose.watchPreview);
    if(wasWatch!==!!pose.watchChecking)onWatchStateChange();
    host.dataset.gestureKind=String(pose.gestureKind|0);host.dataset.gestureLeft=(pose.gestureLeft||0).toFixed(3);host.dataset.gestureRight=(pose.gestureRight||0).toFixed(3);host.dataset.following=String(!!pose.following);host.dataset.jaw=pose.jaw.toFixed(3);host.dataset.speaking=String(pose.speaking);host.dataset.preview=String(pose.preview);
    if(wasPreview&&!pose.preview)onPreviewEnd();
  }
  function draw(now=performance.now()){
    if(!alive)return;
    const seconds=now/1000,dt=last?(now-last)/1000:1/30;last=now;
    let volume=0,centroid=.5;try{const v=getVolume();if(typeof v==='number'&&Number.isFinite(v))volume=v;else if(v&&typeof v.level==='number'){volume=v.level;centroid=v.centroid??.5;}}catch{}
    apply(motion.sample(seconds,dt,volume,centroid));renderer.render(scene,camera);host.dataset.rendered='true';
  }
  function tick(now){
    frame=null;if(!alive||!motion.visible)return;
    const talking=motion.yawn.active||motion.watch.active||motion.gesture.active||motion.follow>.01||motion.mode==='speaking'||motion.amplitude>.001||now/1000<motion.previewUntil;
    const preset=AVATAR_QUALITY[quality];
    const fps=renderer.isSoftwareRenderer?(talking?24:12):(talking?preset.activeFPS:preset.idleFPS);
    if(now-lastDraw>=1000/fps){draw(now);lastDraw=now;}
    if(!motion.paused)frame=requestAnimationFrame(tick);
  }
  function schedule(){if(alive&&motion.visible&&frame===null)frame=requestAnimationFrame(tick);}
  function resize(){if(!alive||!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;const close=framing==='close',compact=host.clientWidth<160;const y=close?.215:compact?.17:.095,z=close?.67:compact?.92:1.02;camera.position.set(0,y,z);camera.lookAt(0,y,.005);camera.updateProjectionMatrix();draw();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  const pointerDown=e=>{drag={x:e.clientX,y:e.clientY,yaw,pitch};view.setPointerCapture(e.pointerId);};
  const pointerMove=e=>{if(!drag)return;yaw=THREE.MathUtils.clamp(drag.yaw+(e.clientX-drag.x)*.009,-.65,.65);pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.004,-.15,.15);draw();};
  const pointerUp=()=>{drag=null;};
  const keys=e=>{let handled=true;if(e.key==='ArrowLeft')yaw=Math.max(-.65,yaw-.08);else if(e.key==='ArrowRight')yaw=Math.min(.65,yaw+.08);else if(e.key==='ArrowUp')pitch=Math.max(-.15,pitch-.04);else if(e.key==='ArrowDown')pitch=Math.min(.15,pitch+.04);else if(e.key==='Home'){yaw=0;pitch=0;}else handled=false;if(handled){e.preventDefault();draw();}};
  /* The head turns toward the visitor's pointer anywhere on the page, then settles after a few idle seconds. */
  const still=matchMedia('(prefers-reduced-motion: reduce)');let pointerTimer=0;
  const follow=e=>{
    if(e.pointerType==='touch'||drag||still.matches||!motion.visible)return;
    const r=view.getBoundingClientRect();if(!r.width)return;
    const cx=r.left+r.width/2,cy=r.top+r.height*.3;
    const dx=(e.clientX-cx)/Math.max(320,innerWidth*.5),dy=(e.clientY-cy)/Math.max(320,innerHeight*.6);
    motion.setPointer(Math.atan(dx*1.2)*.64,Math.atan(dy*1.1)*.3,true);schedule();
    clearTimeout(pointerTimer);pointerTimer=setTimeout(()=>motion.setPointer(0,0,false),4000);
  };
  const unfollow=e=>{if(!e.relatedTarget){clearTimeout(pointerTimer);motion.setPointer(0,0,false);}};
  window.addEventListener('pointermove',follow,{passive:true});document.addEventListener('pointerout',unfollow);
  view.addEventListener('pointerdown',pointerDown);view.addEventListener('pointermove',pointerMove);view.addEventListener('pointerup',pointerUp);view.addEventListener('pointercancel',pointerUp);view.addEventListener('keydown',keys);
  const api={
    setVisible(value){motion.setVisible(value&&!document.hidden);if(!motion.visible){if(frame!==null)cancelAnimationFrame(frame);frame=null;apply({jaw:0,blink:0,yaw:0,pitch:0,roll:0,brow:0,preview:false,speaking:false});}else{last=0;resize();schedule();}},
    setMode(mode,voice=false){motion.setMode(mode,voice);host.dataset.mode=mode;if(motion.visible){draw();schedule();}},
    setPaused(value){motion.setPaused(value);host.dataset.paused=String(value);if(frame!==null)cancelAnimationFrame(frame);frame=null;if(motion.visible){draw();schedule();}},
    preview(){motion.preview(performance.now()/1000);schedule();},
    previewYawn(){const started=motion.previewYawn(performance.now()/1000);schedule();return started;},
    previewGesture(side,kind){const started=motion.previewGesture(side,kind);schedule();return started;},
    previewWatch(){const started=motion.previewWatch(performance.now()/1000);schedule();return started;},
    reset(){yaw=0;pitch=0;if(motion.visible)draw();},
    setQuality(value){quality=value==='high'?'high':'balanced';host.dataset.quality=quality;renderer.setPixelRatio(renderer.isSoftwareRenderer?(quality==='high'?1:.85):Math.min(window.devicePixelRatio||1,AVATAR_QUALITY[quality].pixelRatio));studio.setQuality(quality);resize();},
    setFraming(value){framing=value==='close'?'close':'portrait';host.dataset.framing=framing;resize();},
    destroy(){alive=false;if(frame!==null)cancelAnimationFrame(frame);observer.disconnect();clearTimeout(pointerTimer);window.removeEventListener('pointermove',follow);document.removeEventListener('pointerout',unfollow);for(const [name,fn]of [['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',pointerUp],['keydown',keys]])view.removeEventListener(name,fn);const disposed=new Set();scene.traverse(o=>{if(o.isMesh&&o.geometry){if(!disposed.has(o.geometry)){o.geometry.dispose();disposed.add(o.geometry);}for(const m of(Array.isArray(o.material)?o.material:[o.material])){if(disposed.has(m))continue;for(const value of Object.values(m))if(value?.isTexture&&!disposed.has(value)){value.dispose();disposed.add(value);}m.dispose();disposed.add(m);}}});materials?.dispose();studio.dispose();renderer.dispose();view.remove();}
  };
  try{
    const gltf=await new GLTFLoader().loadAsync(new URL(persona==='female'?'./models/doctor/space-doctor-female.glb':'./models/doctor/space-doctor.glb',import.meta.url).href);
    if(!alive){gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.map?.dispose();m.normalMap?.dispose();m.dispose();}}});return api;}
    if(persona==='female'){refineFemaleFace(gltf.scene);host.dataset.face='refined';}
    gltf.scene.position.y=-.027;pivot.add(gltf.scene);
    materials=await createDoctorMaterials(renderer);
    if(!alive){materials.dispose();return api;}
    host.dataset.detail=materials.hasDetail?'pores':'source';
    let hair=null;gltf.scene.traverse(o=>{if(o.isMesh){materials.apply(o,persona);if(persona==='female'&&o.name==='h_wig'){hair=o;return;}addDoctorBodyRig(o);meshes.push(o);o.frustumCulled=false;if(/^h_[LR]_eye$/i.test(o.userData.partName||o.name)){o.userData.eyeCenter=new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position).getCenter(new THREE.Vector3());}}});
    if(hair){headEquipment.add(hair);hair.position.y=-DOCTOR_NECK_PIVOT;host.dataset.hair='head-attached';}
    if(persona==='male')host.dataset.hair='original';
    armRig=createDoctorArmRig(gltf.scene);
    watchModel=createDoctorWatch(armRig.left.hand);host.dataset.watch='left-wrist';host.dataset.fistView='pinky-side';
    host.dataset.headsetFit='right-ear-mounted';
    host.dataset.bodyRig='neck-shoulders-breath-arm';host.dataset.loaded='true';onReady(api);resize();schedule();return api;
  }catch(error){api.destroy();onError(error);throw error;}
}
