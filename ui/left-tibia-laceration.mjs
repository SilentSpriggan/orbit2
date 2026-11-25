import * as THREE from 'three';

// Cross the bone at a fixed illustrative point along its shaft and locate its anterior ridge.
function anteriorRidge(geometry, y) {
  const pos = geometry.attributes.position;
  const indices = geometry.index.array;
  let front = null;
  for (let i = 0; i < indices.length; i += 3) {
    for (let e = 0; e < 3; e++) {
      const a = indices[i + e], b = indices[i + (e + 1) % 3];
      const ay = pos.getY(a), by = pos.getY(b);
      if ((ay > y) === (by > y)) continue;
      const t = (y - ay) / (by - ay);
      const z = THREE.MathUtils.lerp(pos.getZ(a), pos.getZ(b), t);
      if (!front || z > front.z) front = {x: THREE.MathUtils.lerp(pos.getX(a), pos.getX(b), t), z};
    }
  }
  return front;
}

// Sample only actual front skin triangles above the shin. The model's anterior direction is +Z.
function frontSkinSampler(geometry, x, y, rx, ry) {
  const pos = geometry.attributes.position, indices = geometry.index.array;
  const triangles = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    const ax = pos.getX(a), bx = pos.getX(b), cx = pos.getX(c);
    const ay = pos.getY(a), by = pos.getY(b), cy = pos.getY(c);
    if (Math.min(ax,bx,cx) > x+rx || Math.max(ax,bx,cx) < x-rx ||
        Math.min(ay,by,cy) > y+ry || Math.max(ay,by,cy) < y-ry) continue;
    const det = (by-cy)*(ax-cx) + (cx-bx)*(ay-cy);
    if (Math.abs(det) > 1e-12) triangles.push({ax,bx,cx,ay,by,cy,az:pos.getZ(a),bz:pos.getZ(b),cz:pos.getZ(c),det});
  }
  return (px,py) => {
    let z = -Infinity;
    for (const t of triangles) {
      const a = ((t.by-t.cy)*(px-t.cx)+(t.cx-t.bx)*(py-t.cy))/t.det;
      const b = ((t.cy-t.ay)*(px-t.cx)+(t.ax-t.cx)*(py-t.cy))/t.det;
      const c = 1-a-b;
      if (Math.min(a,b,c) >= -1e-6) z=Math.max(z,a*t.az+b*t.bz+c*t.cz);
    }
    if (!Number.isFinite(z)) throw new Error('The selected skin area has no reference surface.');
    return z;
  };
}

function surface(vertices, indices, color) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({color, roughness:0.9, side:THREE.DoubleSide});
  return new THREE.Mesh(geometry,mat);
}

export function createShinOverlay(bone, skin) {
  const bounds = bone.geometry.boundingBox;
  const length = bounds.max.y-bounds.min.y;
  const y = bounds.min.y+length*0.63;
  const ridge = anteriorRidge(bone.geometry,y);
  if (!ridge) throw new Error('The left tibial shaft could not be located.');
  const x = ridge.x, rx = length*0.056, ry = length*0.125;
  const height = frontSkinSampler(skin.geometry,x,y,rx,ry);
  if (height(x,y) < ridge.z-0.001) throw new Error('The anterior skin could not be located over the tibia.');
  const point = (u,v,lift) => [x+u*rx,y+v*ry,height(x+u*rx,y+v*ry)+lift];
  // Anatomical skin window, then two tapered ribbons following that same curved surface.
  const rings=6, around=44, skinVerts=[...point(0,0,0)], skinIndices=[];
  for(let j=1;j<=rings;j++) for(let i=0;i<around;i++) {
    const angle=i/around*2*Math.PI;
    skinVerts.push(...point(j/rings*Math.cos(angle),j/rings*Math.sin(angle),0));
    const first=1+(j-1)*around, a=first+i, b=first+(i+1)%around;
    if(j===1) skinIndices.push(0,a,b);
    else skinIndices.push(a-around,a,b,b,b-around,a-around);
  }
  function ribbon(width,lift) {
    const vertices=[],indices=[];
    for(let i=0;i<=32;i++) {
      const t=i/32, v=(t-.5)*1.35;
      const u=(t-.5)*.83+.042*Math.sin(4*Math.PI*t)+.018*Math.sin(9*Math.PI*t);
      const half=width*(.035+.965*Math.pow(Math.sin(Math.PI*t),.8));
      vertices.push(...point(u-half,v,lift),...point(u+half,v,lift));
      if(i) {const k=2*i;indices.push(k-2,k-1,k,k,k-1,k+1);}
    }
    return {vertices,indices};
  }
  const margin=ribbon(.155,.00065), center=ribbon(.075,.0013);
  const group=new THREE.Group();
  group.name='Left anterior shin · teaching overlay';
  group.add(surface(skinVerts,skinIndices,0xc59683),surface(margin.vertices,margin.indices,0xb76864),
            surface(center.vertices,center.indices,0x7a3646));
  return {group,dispose(){group.removeFromParent();for(const mesh of group.children){mesh.geometry.dispose();mesh.material.dispose();}}};
}
