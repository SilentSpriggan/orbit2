import * as THREE from 'three';
const ease=n=>{const t=Math.max(0,Math.min(1,n));return t*t*t*(t*(t*6-15)+10);};
const neutral=()=>({active:false,raise:0,look:0,preview:false});

// The watch check and yawn share idle time, but never run together.
export class DoctorWatchCheck {
 constructor({seed=Math.floor(Math.random()*0xffffffff)}={}){this.seed=(seed>>>0)||1;this.enabled=false;this.reset();}
 random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/0x100000000;}
 reset(){this.active=false;this.elapsed=0;this.wait=16+this.random()*13;this.cancelled=null;this.last=neutral();this.preview=false;}
 start(preview=false){if(this.active)return false;this.active=true;this.elapsed=0;this.cancelled=null;this.preview=preview;return true;}
 sample(dt,enabled){
  const step=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
  if(!enabled&&this.enabled)this.wait=16+this.random()*13;
  this.enabled=enabled;
  if(!enabled&&this.active&&!this.cancelled)this.cancelled={...this.last,time:0};
  if(this.cancelled){
   const c=this.cancelled;c.time+=step;
   this.last={active:c.time<.85,raise:c.raise*(1-ease(c.time/.85)),look:c.look*(1-ease(c.time/.4)),preview:this.preview};
   if(!this.last.active){this.active=false;this.cancelled=null;this.wait=65+this.random()*45;this.last=neutral();}
   return this.last;
  }
  if(!this.active){if(!enabled)return this.last=neutral();this.wait-=step;if(this.wait>0)return this.last=neutral();this.start();}
  this.elapsed+=step;const t=this.elapsed;
  if(t>=4.6){this.active=false;this.wait=65+this.random()*45;return this.last=neutral();}
  return this.last={active:true,raise:ease(t/1.1)*(1-ease((t-3.1)/1.25)),look:ease((t-.55)/.65)*(1-ease((t-2.7)/.9)),preview:this.preview};
 }
}

export function createDoctorWatch(hand,date=new Date()){
 if(!hand?.userData.orbitAlong||!hand.userData.orbitAcross)throw new Error('The left wrist is missing.');
 const watch=new THREE.Group();watch.name='ORBIT_FieldWatch';
 const along=new THREE.Vector3(...hand.userData.orbitAlong).normalize(),across=new THREE.Vector3(...hand.userData.orbitAcross);
 across.addScaledVector(along,-across.dot(along)).normalize();
 const dorsal=across.clone().cross(along).normalize();
 watch.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,along,dorsal));
 watch.position.copy(along).multiplyScalar(-.026);
 const strap=new THREE.MeshStandardMaterial({color:0x182333,roughness:.85,side:THREE.DoubleSide});
 const metal=new THREE.MeshStandardMaterial({color:0xb8bec5,roughness:.24,metalness:.92});
 const face=new THREE.MeshStandardMaterial({color:0x111c27,roughness:.36});
 const ink=new THREE.MeshStandardMaterial({color:0xe6f0f7,roughness:.55});
 const blue=new THREE.MeshStandardMaterial({color:0x66bbde,roughness:.5});
 function add(geometry,material,position,name){const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=!material.transparent;mesh.receiveShadow=!material.transparent;mesh.position.set(...position);watch.add(mesh);return mesh;}
 const band=add(new THREE.CylinderGeometry(.027,.027,.018,24,1,true),strap,[0,0,0],'Watch strap');band.scale.z=.69;
 add(new THREE.BoxGeometry(.042,.045,.009),metal,[0,0,.0205],'Watch case');
 add(new THREE.BoxGeometry(.035,.038,.0015),face,[0,0,.026],'Watch dial');
 add(new THREE.BoxGeometry(.004,.008,.005),metal,[.023,0,.020],'Watch crown');
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6,mark=add(new THREE.BoxGeometry(.0014,i%3===0?.004:.0025,.0008),ink,[Math.sin(angle)*.014,Math.cos(angle)*.015,.0272],'Watch hour marker');mark.rotation.z=-angle;
 }
 const hours=watch.userData.hours=new THREE.Group(),minutes=watch.userData.minutes=new THREE.Group();watch.add(hours,minutes);
 function needle(group,length,width,material,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,length,.001),material);mesh.position.set(0,length*.35,z);group.add(mesh);}
 needle(hours,.011,.0021,ink,.028);needle(minutes,.016,.0013,blue,.029);
 add(new THREE.SphereGeometry(.0018,8,6),ink,[0,0,.030],'Watch center');
 const glass=new THREE.MeshPhysicalMaterial({color:0xdfeaf5,roughness:.07,metalness:0,clearcoat:1,clearcoatRoughness:.04,transparent:true,opacity:.12,depthWrite:false});
 add(new THREE.BoxGeometry(.035,.038,.0005),glass,[0,0,.032],'Watch crystal');
 hand.add(watch);updateDoctorWatch(watch,date);return watch;
}
export function updateDoctorWatch(watch,date=new Date()){
 const minute=date.getMinutes(),hour=date.getHours()%12,key=date.getHours()*60+minute;
 if(watch.userData.time===key)return;
 watch.userData.hours.rotation.z=-(hour+minute/60)*Math.PI/6;
 watch.userData.minutes.rotation.z=-minute*Math.PI/30;watch.userData.time=key;
}
