import * as THREE from 'three';

// Additive, weighted deformation of the existing bust. Head movement pivots at
// the base of the neck; breathing and shoulder motion leave the face untouched.
export const DOCTOR_NECK_PIVOT=.072;
const NECK_CHANNELS=Array.from({length:9},(_,i)=>`orbitNeck${Math.floor(i/3)}${i%3}`);
export const BODY_CHANNELS=[...NECK_CHANNELS,'orbitBreath','orbitShoulderLeft','orbitShoulderRight','orbitTorsoTurn'];
const smooth=(a,b,n)=>{const t=Math.min(1,Math.max(0,(n-a)/(b-a)));return t*t*(3-2*t);};
export function bodyVertexDelta(channel,x,y,z){
 const head=smooth(.035,.145,y),chest=1-smooth(.025,.125,y),neck=DOCTOR_NECK_PIVOT;
 // The nine basis shapes apply an exact rotation above the neck. This keeps
 // larger idle turns on the same pivot as the ear-mounted headset.
 if(NECK_CHANNELS.includes(channel)){const row=Number(channel.at(-2)),column=Number(channel.at(-1)),delta=[0,0,0];delta[row]=[x,y-neck,z][column]*head;return delta;}
 if(channel==='orbitHeadYaw'){const a=.065*head,c=Math.cos(a),s=Math.sin(a);return [x*c+z*s-x,0,-x*s+z*c-z];}
 if(channel==='orbitHeadPitch'){const a=.06*head,c=Math.cos(a),s=Math.sin(a),h=y-neck;return [0,h*c-z*s-h,h*s+z*c-z];}
 if(channel==='orbitHeadRoll'){const a=.045*head,c=Math.cos(a),s=Math.sin(a),h=y-neck;return [x*c-h*s-x,x*s+h*c-h,0];}
 if(channel==='orbitBreath'){const expansion=chest*smooth(-.27,-.10,y);return [x*.008*expansion,.0008*expansion,.0035*expansion*smooth(-.12,.06,z)];}
 if(channel==='orbitShoulderLeft'||channel==='orbitShoulderRight'){
  const side=channel==='orbitShoulderLeft'?1:-1,weight=chest*smooth(.045,.17,x*side)*smooth(-.22,-.035,y);
  // Roll around the clavicle instead of translating the shoulder upward.
  const a=-side*.035*weight,c=Math.cos(a),s=Math.sin(a),dx=x-side*.13,dy=y-.015;
  return [dx*c-dy*s-dx,dx*s+dy*c-dy,.004*weight];
 }
 if(channel==='orbitTorsoTurn'){const weight=(1-head)*smooth(-.27,-.02,y),a=.018*weight,c=Math.cos(a),s=Math.sin(a);return [x*c+z*s-x,0,-x*s+z*c-z];}
 return [0,0,0];
}
export function addDoctorBodyRig(mesh){
 const g=mesh.geometry,position=g?.attributes.position;if(!position)return;
 if(!g.morphTargetsRelative&&g.morphAttributes.position?.length)throw new Error('Avatar requires relative facial morphs.');
 const morphs=g.morphAttributes.position||=[];g.morphTargetsRelative=true;
 if(!g.userData.orbitBodyChannels){
  const channels={};
  for(const name of BODY_CHANNELS){const values=new Float32Array(position.count*3);for(let i=0;i<position.count;i++)values.set(bodyVertexDelta(name,position.getX(i),position.getY(i),position.getZ(i)),i*3);const attribute=new THREE.Float32BufferAttribute(values,3);attribute.name=name;channels[name]=morphs.length;morphs.push(attribute);}
  g.userData.orbitBodyChannels=channels;
 }
 mesh.morphTargetDictionary={...(mesh.morphTargetDictionary||{}),...g.userData.orbitBodyChannels};
 const weights=mesh.morphTargetInfluences||=[];while(weights.length<morphs.length)weights.push(0);
 return g.userData.orbitBodyChannels;
}
export function applyDoctorBodyRig(mesh,pose){
 const names=mesh.geometry.userData.orbitBodyChannels,weights=mesh.morphTargetInfluences;if(!names||!weights)return;
 const rotation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(pose.headPitch||0,pose.headYaw||0,pose.headRoll||0));
 const values={orbitBreath:pose.breath,orbitShoulderLeft:pose.shoulderLeft,orbitShoulderRight:pose.shoulderRight,orbitTorsoTurn:pose.torsoTurn/.018};
 for(let row=0;row<3;row++)for(let column=0;column<3;column++)values[`orbitNeck${row}${column}`]=rotation.elements[column*4+row]-(row===column?1:0);
 for(const [name,index]of Object.entries(names))weights[index]=THREE.MathUtils.clamp(Number.isFinite(values[name])?values[name]:0,-1,1);
}
