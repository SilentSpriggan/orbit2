import * as THREE from 'three';
import { DOCTOR_NECK_PIVOT } from './doctor-body.mjs';
const ease=n=>{const t=THREE.MathUtils.clamp(n,0,1);return t*t*t*(t*(t*6-15)+10);};
const vec=a=>new THREE.Vector3(...a);
function basis(along,across){const y=along.clone().normalize(),x=across.clone().addScaledVector(y,-across.dot(y)).normalize(),z=x.clone().cross(y).normalize();return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));}
function arm(root,side,along,across){
 const upper=root.getObjectByName(side+'Arm'),lower=root.getObjectByName(side+'ForeArm'),hand=root.getObjectByName(side+'Hand');
 if(!upper||!lower||!hand||!hand.userData.orbitAlong)throw new Error('The doctor arm rig is missing.');
 root.updateWorldMatrix(true,true);
 const toModel=bone=>root.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
 const sourceBasis=basis(vec(hand.userData.orbitAlong),vec(hand.userData.orbitAcross));
 const desiredBasis=basis(vec(along),vec(across));
 const rest=new Map([upper,lower,hand].map(b=>[b,b.quaternion.clone()]));
 const sourceInverse=sourceBasis.clone().invert();
 return {root,upper,lower,hand,rest,restElbow:toModel(lower),restWrist:toModel(hand),gripOffset:vec(hand.userData.orbitGripOffset||[0,0,0]),handGoal:desiredBasis.multiply(sourceInverse.clone()),goal:(a,b)=>basis(vec(a),vec(b)).multiply(sourceInverse.clone()),lastDistance:0};
}
export function createDoctorArmRig(root){
 // Across runs from pinky to index: aiming it away exposes the pinky edge.
 const right=arm(root,'Right',[.12,.98,.10],[.25,.065,-.966]);
 right.left=arm(root,'Left',[-.96,.05,.27],[.05,.85,-.45]);
 // Explaining pose: forearm forward at lower-chest height, open hand angled palm-up and inward.
 // Gesture shapes for the right hand (x is mirrored for the left). The elbow comes forward
 // and out so the forearm and sleeve lift into view instead of a hand rising from the frame edge.
 const shapes=[
  {wrist:[-.135,-.05,.225],pole:[-.35,-.12,.17],along:[.1,.24,.965],across:[-.82,-.48,.18]},  // present: palm up, out to the side
  {wrist:[-.085,-.06,.245],pole:[-.33,-.12,.2],along:[.3,.28,.91],across:[-.6,-.66,.3]},      // explain: toward the centre, palm up and in
  {wrist:[-.11,-.08,.235],pole:[-.34,-.15,.16],along:[.18,.12,.976],across:[-.78,-.6,.12]},     // emphasise: lower, flatter hand
 ];
 const mirror=a=>[-a[0],a[1],a[2]];
 right.shapes=shapes.map(s=>({wrist:vec(s.wrist),pole:vec(s.pole),hand:right.goal(s.along,s.across)}));
 // The right hand rests half-closed (it covers yawns). While gesturing, its fingers open
 // to a mirror of the relaxed left hand.
 right.fingers=[];
 for(const f of ['Thumb','Index','Middle','Ring','Pinky'])for(let i=1;i<=3;i++){
  const r=root.getObjectByName('RightHand'+f+i),l=root.getObjectByName('LeftHand'+f+i);
  if(r&&l)right.fingers.push({bone:r,rest:r.quaternion.clone(),open:new THREE.Quaternion(l.quaternion.x,-l.quaternion.y,-l.quaternion.z,l.quaternion.w)});
 }
 right.left.shapes=shapes.map(s=>({wrist:vec(mirror(s.wrist)),pole:vec(mirror(s.pole)),hand:right.left.goal(mirror(s.along),mirror(s.across))}));
 return right;
}
function worldRotation(bone,q){bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));bone.updateMatrixWorld(true);}
function swing(bone,child,target){
 const origin=bone.getWorldPosition(new THREE.Vector3()),direction=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),wanted=target.clone().sub(origin).normalize();
 worldRotation(bone,new THREE.Quaternion().setFromUnitVectors(direction,wanted).multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
}
function reach(rig,t,wristGoal,poleGoal,handGoal){
 const {root,upper,lower,hand}=rig;
 for(const [bone,q]of rig.rest)bone.quaternion.copy(q);
 root.updateWorldMatrix(true,true);
 if(t<.00001){rig.lastDistance=0;return;}
 const wrist=rig.restWrist.clone().lerp(wristGoal,t);
 wrist.z+=Math.sin(Math.PI*t)*.12;wrist.x+=Math.sin(Math.PI*t)*Math.sign(rig.restWrist.x)*.045;
 const pole=rig.restElbow.clone().lerp(poleGoal,ease(t));
 root.localToWorld(wrist);root.localToWorld(pole);
 const shoulder=upper.getWorldPosition(new THREE.Vector3()),elbow=lower.getWorldPosition(new THREE.Vector3()),restWrist=hand.getWorldPosition(new THREE.Vector3());
 const a=shoulder.distanceTo(elbow),b=elbow.distanceTo(restWrist),axis=wrist.clone().sub(shoulder);
 const distance=THREE.MathUtils.clamp(axis.length(),Math.abs(a-b)+.001,a+b-.0001);axis.normalize();
 const foot=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-foot*foot));
 const side=pole.clone().sub(shoulder);side.addScaledVector(axis,-side.dot(axis)).normalize();
 const goalElbow=shoulder.clone().addScaledVector(axis,foot).addScaledVector(side,height);
 const goalWrist=shoulder.clone().addScaledVector(axis,distance);
 swing(upper,lower,goalElbow);swing(lower,hand,goalWrist);
 const goalWorld=root.getWorldQuaternion(new THREE.Quaternion()).multiply(handGoal);
 worldRotation(hand,hand.getWorldQuaternion(new THREE.Quaternion()).slerp(goalWorld,ease((t-.12)/.88)));
 root.updateWorldMatrix(true,true);
}
export function applyDoctorArmRig(rig,pose){
 const {root}=rig,t=THREE.MathUtils.clamp(pose.yawnCover||0,0,1);
 const head=new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.headPitch||0,pose.headYaw||0,pose.headRoll||0));
 const neck=new THREE.Vector3(0,DOCTOR_NECK_PIVOT,0);
 const center=new THREE.Vector3(0,.133,.185).sub(neck).applyQuaternion(head).add(neck);
 const handGoal=head.clone().multiply(rig.handGoal);
 const wristGoal=center.clone().sub(rig.gripOffset.clone().applyQuaternion(handGoal));
 const beat=pose.gestureBeat||0,gr=THREE.MathUtils.clamp(pose.gestureRight||0,0,1),gl=THREE.MathUtils.clamp(pose.gestureLeft||0,0,1);
 const kind=Math.min(2,Math.max(0,pose.gestureKind|0)),time=pose.gestureTime||0,firm=kind===2?1.6:1;
 // While held, the hand drifts a little and dips on stressed syllables.
 const held=(side,shape)=>shape.wrist.clone().add(new THREE.Vector3(side*.012*Math.sin(time*1.25+.4),.009*Math.sin(time*1.9)-.02*beat*firm,.008*Math.sin(time*1.05+1.1)+.012*beat));
 // A yawn cover takes the right hand; otherwise it can gesture.
 const open=t<.00001?gr:0;for(const f of rig.fingers)f.bone.quaternion.copy(f.rest).slerp(f.open,open);
 if(t<.00001&&gr>.00001){const s=rig.shapes[kind];reach(rig,gr,held(-1,s),s.pole,s.hand);}
 else reach(rig,t,wristGoal,new THREE.Vector3(-.29,-.14,.23),handGoal);
 const {hand}=rig;
 const grip=rig.gripOffset.clone().applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())).add(hand.getWorldPosition(new THREE.Vector3()));
 rig.lastDistance=t>.00001?grip.distanceTo(root.localToWorld(center)):0;
 const watch=THREE.MathUtils.clamp(pose.watchRaise||0,0,1);
 if(watch<.00001&&gl>.00001){const s=rig.left.shapes[kind];reach(rig.left,gl,held(1,s),s.pole,s.hand);}
 else reach(rig.left,watch,new THREE.Vector3(.095,.025,.235),new THREE.Vector3(.28,-.17,.13),rig.left.handGoal);
}
