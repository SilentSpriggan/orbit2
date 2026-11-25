import * as THREE from 'three';

const smooth=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const bell=(v,center,width)=>Math.exp(-(((v-center)/width)**2));

// A local, smooth edit of this fictional character. The same deformation is
// applied to the expression endpoints so blinking and speech keep their fit.
export function femininePoint(x,y,z) {
  if(y<=.09)return [x,y,z];
  const front=smooth(.015,.065,z),face=smooth(.095,.135,y)*(1-smooth(.25,.29,y));
  const jaw=bell(y,.147,.041)*front;
  const chin=bell(y,.111,.022)*front;
  const nose=bell(x,0,.016)*bell(y,.187,.026)*smooth(.095,.126,z);
  const brow=bell(y,.224,.012)*bell(x,0,.06)*front;
  const cheek=bell(Math.abs(x),.044,.023)*bell(y,.18,.026)*front;
  const lip=bell(x,0,.029)*bell(y,.14,.010)*smooth(.09,.11,z);
  return [x*(1-.095*jaw-.045*chin-.055*nose),y+.0035*chin,z-.003*brow-.003*nose+.0028*cheek+.0025*lip*face];
}

export function refineFemaleFace(root) {
  let changed=0;
  root.traverse(mesh=>{
    if(!mesh.isMesh||!/^(H_DDS_HighRes|h_[LR]_(eye|gland)|h_Teeth)/i.test(mesh.userData.partName||mesh.name))return;
    const g=mesh.geometry,p=g.attributes.position;
    if(g.userData.orbitFaceRefined)return;
    const original=p.array.slice();
    for(const morph of g.morphAttributes.position||[]){
      for(let i=0;i<p.count;i++){
        const k=i*3,x=original[k],y=original[k+1],z=original[k+2];
        const base=femininePoint(x,y,z);
        const endpoint=femininePoint(x+morph.getX(i),y+morph.getY(i),z+morph.getZ(i));
        morph.setXYZ(i,endpoint[0]-base[0],endpoint[1]-base[1],endpoint[2]-base[2]);
      }
      morph.needsUpdate=true;
    }
    for(let i=0;i<p.count;i++)p.setXYZ(i,...femininePoint(original[i*3],original[i*3+1],original[i*3+2]));
    p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
    g.userData.orbitFaceRefined=true;changed++;
  });
  return changed;
}
