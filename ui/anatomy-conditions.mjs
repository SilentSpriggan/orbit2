import * as THREE from 'three';

// Original educational effects on reference geometry. No patient damage is inferred.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const centerOf=part=>new THREE.Vector3().addVectors(new THREE.Vector3(...part.bounds[0]),new THREE.Vector3(...part.bounds[1])).multiplyScalar(.5);
function geometryFromTriangles(points){
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 geometry.setIndex(Array.from({length:points.length/3},(_,i)=>i));geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
// Clip triangles without changing the cached atlas buffers. Cut faces are separately capped.
export function clipReferenceGeometry(geometry,normal,constant,positive=true){
 const position=geometry.attributes.position,index=geometry.index.array,out=[],segments=[];
 const distance=v=>(normal.dot(v)-constant)*(positive?1:-1);
 for(let i=0;i<index.length;i+=3){
  const tri=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(position,index[i+k])),poly=[],crossings=[];
  for(let k=0;k<3;k++){
   const a=tri[k],b=tri[(k+1)%3],da=distance(a),db=distance(b),inside=da>=0,next=db>=0;
   if(inside)poly.push(a);
   if(inside!==next){const p=a.clone().lerp(b,da/(da-db));poly.push(p);crossings.push(p);}
  }
  for(let k=1;k<poly.length-1;k++)for(const p of [poly[0],poly[k],poly[k+1]])out.push(p.x,p.y,p.z);
  if(crossings.length===2)segments.push(crossings);
 }
 return {geometry:geometryFromTriangles(out),segments};
}
function capGeometry(segments,normal){
 if(!segments.length)return null;
 const unique=new Map();for(const segment of segments)for(const p of segment)unique.set(p.toArray().map(v=>v.toFixed(6)).join(','),p);
 const points=[...unique.values()];if(points.length<3)return null;
 const center=points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(1/points.length);
 const x=new THREE.Vector3().crossVectors(normal,Math.abs(normal.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),y=new THREE.Vector3().crossVectors(normal,x);
 points.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(y),a.clone().sub(center).dot(x))-Math.atan2(b.clone().sub(center).dot(y),b.clone().sub(center).dot(x)));
 const triangles=[];for(let i=0;i<points.length;i++)for(const p of [center,points[i],points[(i+1)%points.length]])triangles.push(p.x,p.y,p.z);
 return geometryFromTriangles(triangles);
}
function material(color,opacity=1){return new THREE.MeshStandardMaterial({color,roughness:.76,side:THREE.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity>=1});}
function line(group,points,width,color=0xf2b67b){
 if(points.length<2)return null;
 const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(10,points.length*2),width,5,false),mesh=new THREE.Mesh(geometry,material(color));group.add(mesh);return mesh;
}
function axisFor(part,pattern){const size=new THREE.Vector3().subVectors(new THREE.Vector3(...part.bounds[1]),new THREE.Vector3(...part.bounds[0]));return pattern==='compression'?'y':['x','y','z'].sort((a,b)=>size[b]-size[a])[0];}
function fracture(group,source,concern,updates,hidden){
 const part=source.userData.part,details=concern.fracture,pattern=details.pattern,axis=axisFor(part,pattern),center=centerOf(part),min=part.bounds[0][{x:0,y:1,z:2}[axis]],max=part.bounds[1][{x:0,y:1,z:2}[axis]],span=max-min;
 const at=min+span*(details.zone==='proximal'?.72:details.zone==='distal'?.28:.5),normal=new THREE.Vector3();normal[axis]=1;
 const cross=axis==='y'?'x':'y';if(pattern==='oblique'||pattern==='comminuted')normal[cross]=.55;normal.normalize();
 const cut=center.clone();cut[axis]=at;const constant=normal.dot(cut),radius=clamp(span*.003,.0004,.0016);
 if(['stress','greenstick','spiral','avulsion'].includes(pattern)){
  const a=axis==='x'?'y':'x',b=axis==='z'?'y':'z',sizes=new THREE.Vector3().subVectors(new THREE.Vector3(...part.bounds[1]),new THREE.Vector3(...part.bounds[0])),points=[];
  source.updateWorldMatrix(true,false);const ray=new THREE.Raycaster();
  for(let i=0;i<=48;i++){
   const t=i/48,angle=pattern==='spiral'?t*Math.PI*2:Math.PI*.1+t*Math.PI*(pattern==='greenstick'?.8:1.1),p=center.clone();
   p[axis]=pattern==='spiral'?min+span*(.3+t*.4):at+Math.sin(t*18)*span*.003;
   const direction=new THREE.Vector3();direction[a]=Math.cos(angle);direction[b]=Math.sin(angle);
   const reach=Math.max(sizes[a],sizes[b])*.75+.005;ray.set(p.clone().addScaledVector(direction,reach),direction.clone().negate());
   const hit=ray.intersectObject(source,false)[0];if(hit)points.push(hit.point.clone().addScaledVector(direction,radius));
  }
  const seam=line(group,points,radius,0xe99c5c);
  if(seam)updates.push(phase=>{seam.material.color.setHex(Math.sin(phase*Math.PI*2)>0?0xf0b477:0xd78346);});
  return !!seam;
 }
 const many=['comminuted','segmental'].includes(pattern),gap=span*.065,constants=many?[constant-gap,constant+gap]:[constant],pieces=[];
 const makePiece=(low,high)=>{
  let g=source.geometry.clone(),caps=[];
  for(const [value,positive]of [[low,true],[high,false]])if(Number.isFinite(value)){
   const clipped=clipReferenceGeometry(g,normal,value,positive);g.dispose();g=clipped.geometry;const cap=capGeometry(clipped.segments,normal);if(cap)caps.push(cap);
  }
  if(!g.attributes.position.count){g.dispose();caps.forEach(c=>c.dispose());return;}
  const fragment=new THREE.Group();g.translate(-center.x,-center.y,-center.z);fragment.add(new THREE.Mesh(g,material(0xe8ddc6)));for(const c of caps){c.translate(-center.x,-center.y,-center.z);fragment.add(new THREE.Mesh(c,material(0xc98a5e)));}fragment.position.copy(center);group.add(fragment);pieces.push(fragment);
 };
 makePiece(-Infinity,constants[0]);if(many)makePiece(constants[0],constants[1]);makePiece(constants.at(-1),Infinity);
 if(pieces.length<2)return false;hidden.add(part.id);
 updates.push(phase=>{
  const amount=.65+.35*Math.sin(phase*Math.PI*2),separation=span*(details.displaced?.035:pattern==='impacted'?-.005:.018)*amount;
  pieces.forEach((piece,i)=>{const sign=i===0?-1:i===pieces.length-1?1:0;piece.position.copy(center).addScaledVector(normal,sign*separation);piece.position[cross]+=details.displaced?sign*span*.025*amount:0;piece.rotation.set(0,0,0);if(many&&i===1){piece.position[cross]+=span*.025;piece.rotation[axis]=.13*amount;}if(pattern==='compression'&&i===pieces.length-1){piece.scale[axis]=.92;piece.position[axis]+=(at-center[axis])*.08-span*.02;}});
 });
 return true;
}

export function buildConditionIllustrations(mapping,meshes){
 const group=new THREE.Group();group.name='ORBIT condition teaching overlays';const hiddenIds=new Set(),updates=[],descriptions=[],groups=[];
 for(const concern of mapping.concerns){
  if(!concern.visual)continue;
  const sources=concern.partIds.map(id=>meshes.get(id)).filter(Boolean);if(!sources.length)continue;
  const entry=new THREE.Group();entry.name=concern.title;group.add(entry);groups.push({group:entry,ids:concern.partIds});let built=false,note='Conceptual display on generic reference anatomy; no patient lesion is localized.';
  if(concern.visual==='fracture'){
   // A compound inventory bone can have several mesh parts. Use its largest surface.
   const source=[...sources].sort((a,b)=>b.geometry.attributes.position.count-a.geometry.attributes.position.count)[0];
   built=fracture(entry,source,concern,updates,hiddenIds);
   note=(concern.fracture.pattern==='unspecified'?'Transverse teaching example; the reported fracture pattern is unspecified. ':'')+(concern.fracture.zone==='unspecified'?'Illustrative site; the actual fracture location was not supplied. ':'')+'Separation is exaggerated to show geometry. This is not a movement or reduction procedure.';
  }else{
   const sorted=[...sources].sort((a,b)=>b.geometry.attributes.position.count-a.geometry.attributes.position.count),chosen=sorted.slice(0,concern.visual==='bone-loss'?4:2);
   for(const source of chosen){
    const part=source.userData.part,center=centerOf(part),size=new THREE.Vector3().subVectors(new THREE.Vector3(...part.bounds[1]),new THREE.Vector3(...part.bounds[0])),extent=Math.max(size.x,size.y,size.z),kind=concern.visual;
    if(kind==='rhythm'||kind==='airway'){
     const clone=new THREE.Mesh(source.geometry.clone().translate(-center.x,-center.y,-center.z),material(kind==='airway'?0xdfa36b:0xca7182,.8));clone.position.copy(center);entry.add(clone);
     updates.push(phase=>{const cycle=kind==='rhythm'?Math.sin(phase*Math.PI*7+.55*Math.sin(phase*Math.PI*13)):Math.sin(phase*Math.PI*2);clone.scale.setScalar(1+Math.max(0,cycle)*.045);});built=true;
    }else if(kind==='stone'||kind==='clot'){
     const radius=clamp(extent*.09,.003,.012),sphere=new THREE.Mesh(new THREE.IcosahedronGeometry(radius,1),material(kind==='stone'?0xe1c277:0xaf5c63));entry.add(sphere);sphere.position.copy(center);sphere.position.z+=size.z*.52;
     updates.push(phase=>{sphere.scale.setScalar(1+.12*Math.sin(phase*Math.PI*2));});built=true;
     note='Magnified conceptual '+(kind==='stone'?'stone':'clot')+' marker. Its size and position are not imaging findings.';
    }else{
     const shell=new THREE.Mesh(new THREE.SphereGeometry(1,14,9),material(kind==='neural'?0x8ebee0:kind==='bone-loss'?0xe7c78c:0xe69d70,.12));shell.position.copy(center);const base=size.multiplyScalar(.58).addScalar(.006);shell.scale.copy(base);entry.add(shell);
     updates.push(phase=>{shell.scale.copy(base).multiplyScalar(1+.045*Math.sin(phase*Math.PI*2));shell.material.opacity=.09+.06*(.5+.5*Math.sin(phase*Math.PI*2));});built=true;
     if(kind==='bone-loss')note='Pulsing bone reference only; density and strength cannot be measured from this atlas.';
    }
   }
  }
  if(built)descriptions.push({title:concern.title,type:concern.visual,pattern:concern.fracture?.pattern||null,note});
 }
 return {group,hiddenIds,descriptions,
  update(phase){for(const update of updates)update(phase);},
  setVisible(isVisible){for(const g of groups)g.group.visible=g.ids.some(isVisible);},
  dispose(){group.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});group.removeFromParent();}
 };
}
