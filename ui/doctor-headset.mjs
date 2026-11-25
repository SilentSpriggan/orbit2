import * as THREE from 'three';
import { DOCTOR_NECK_PIVOT } from './doctor-body.mjs';

// Landmarks in the baked portrait's coordinate system. The pad sits over the
// right ear, and the boom ends just outside the corner of the mouth.
export const HEADSET_FIT={ear:[-.087,.191,.010],microphone:[-.047,.132,.126],hook:[[-.084,.172,-.004],[-.092,.184,-.006],[-.095,.204,.002],[-.089,.216,.011],[-.082,.207,.022],[-.083,.195,.020]],boom:[[-.091,.188,.018],[-.092,.166,.054],[-.074,.142,.089],[-.047,.132,.126]]};
export function createDoctorHeadset(){
 const group=new THREE.Group();group.name='Ear mounted communications headset';group.position.y=DOCTOR_NECK_PIVOT-.027;
 const frame=new THREE.MeshStandardMaterial({color:0x3b4650,roughness:.32,metalness:.7}),pad=new THREE.MeshStandardMaterial({color:0x182029,roughness:.93});
 const local=point=>new THREE.Vector3(point[0],point[1]-DOCTOR_NECK_PIVOT,point[2]);
 function add(name,geometry,material,point){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;if(point)m.position.copy(local(point));group.add(m);return m;}
 const ear=add('Ear pad',new THREE.SphereGeometry(1,20,14),pad,HEADSET_FIT.ear);ear.scale.set(.0045,.010,.008);
 const casing=add('Ear speaker casing',new THREE.SphereGeometry(1,18,12),frame,[-.090,.191,.009]);casing.scale.set(.0035,.009,.007);
 for(const [name,points,radius]of [['Ear hook',HEADSET_FIT.hook,.002],['Microphone boom',HEADSET_FIT.boom,.0018]]){const curve=new THREE.CatmullRomCurve3(points.map(local));add(name,new THREE.TubeGeometry(curve,28,radius,7,false),frame);}
 add('Boom hinge',new THREE.SphereGeometry(.003,12,8),frame,HEADSET_FIT.boom[0]);
 const mic=add('Microphone',new THREE.SphereGeometry(.0042,16,10),pad,HEADSET_FIT.microphone);mic.scale.set(1.45,.8,.8);
 return group;
}
