import * as THREE from 'three';

// CPU depth-buffered renderer for browsers without an available WebGL context.
// It projects the same atlas vertices used by the GPU viewer; no raster stand-in.
export class SoftwareAnatomyRenderer{
 constructor(){this.domElement=document.createElement('canvas');this.context=this.domElement.getContext('2d',{alpha:true});if(!this.context)throw new Error('Canvas rendering is unavailable.');this.width=1;this.height=1;this.ratio=1;this.background=0;this.buffers=new WeakMap();this.isSoftwareRenderer=true;}
 setPixelRatio(r){this.ratio=Math.min(r,1);}
 setClearColor(value,alpha=0){const r=(value>>16)&255,g=(value>>8)&255,b=value&255;this.background=((Math.round(alpha*255)<<24)|(b<<16)|(g<<8)|r)>>>0;}
 setSize(w,h){const width=Math.max(1,Math.round(w*this.ratio)),height=Math.max(1,Math.round(h*this.ratio));if(width===this.width&&height===this.height&&this.image)return;this.width=width;this.height=height;this.domElement.width=width;this.domElement.height=height;this.image=this.context.createImageData(width,height);this.pixels=new Uint32Array(this.image.data.buffer);this.depth=new Float32Array(width*height);}
 render(scene,camera){
  if(!this.image)return;const {width:w,height:h,pixels,depth}=this;pixels.fill(this.background);depth.fill(Infinity);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const projectionView=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),meshes=[];scene.traverseVisible(obj=>{if(obj.isMesh&&obj.geometry?.index&&obj.geometry.attributes.position)meshes.push(obj);});meshes.sort((a,b)=>Number(a.material.transparent)-Number(b.material.transparent));
  const cameraLight=camera.position.clone().sub(new THREE.Vector3(0,.85,0)).normalize();
  for(const mesh of meshes){
   const geometry=mesh.geometry,mat=mesh.material,positions=geometry.attributes.position.array,normals=geometry.attributes.normal?.array,indices=geometry.index.array,count=geometry.attributes.position.count;
   let cache=this.buffers.get(geometry);if(!cache){cache={projected:new Float32Array(count*4),light:new Float32Array(count),clip:new Float32Array(count)};this.buffers.set(geometry,cache);}
   const clipPlane=mat.clippingPlanes?.[0],clip=cache.clip,world=mesh.matrixWorld.elements;const projected=cache.projected,light=cache.light,m=new THREE.Matrix4().multiplyMatrices(projectionView,mesh.matrixWorld).elements,nm=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld).elements,normalScale=normals instanceof Int16Array?1/32767:1;
   for(let v=0;v<count;v++){
    const j=v*3,k=v*4,x=positions[j],y=positions[j+1],z=positions[j+2],cw=m[3]*x+m[7]*y+m[11]*z+m[15];
    if(clipPlane){const nn=clipPlane.normal;clip[v]=(nn.x*(world[0]*x+world[4]*y+world[8]*z+world[12])+nn.y*(world[1]*x+world[5]*y+world[9]*z+world[13])+nn.z*(world[2]*x+world[6]*y+world[10]*z+world[14])+clipPlane.constant)/cw;}projected[k+3]=cw;if(cw<=.01)continue;
    projected[k]=((m[0]*x+m[4]*y+m[8]*z+m[12])/cw*.5+.5)*w;
    projected[k+1]=(-(m[1]*x+m[5]*y+m[9]*z+m[13])/cw*.5+.5)*h;
    projected[k+2]=(m[2]*x+m[6]*y+m[10]*z+m[14])/cw;
    if(normals){const nx=normals[j]*normalScale,ny=normals[j+1]*normalScale,nz=normals[j+2]*normalScale,tx=nm[0]*nx+nm[3]*ny+nm[6]*nz,ty=nm[1]*nx+nm[4]*ny+nm[7]*nz,tz=nm[2]*nx+nm[5]*ny+nm[8]*nz;light[v]=Math.min(1.3,.35+.68*Math.abs(tx*cameraLight.x+ty*cameraLight.y+tz*cameraLight.z)+.22*Math.max(0,ty));}else light[v]=.9;
   }
   const color=mat.color,emissive=mat.emissive||{r:0,g:0,b:0},shades=new Uint32Array(64);
   for(let i=0;i<64;i++){const f=i/48+.05,r=Math.min(255,Math.round(Math.pow(Math.min(1,color.r*f+emissive.r*.65),1/2.2)*255)),g=Math.min(255,Math.round(Math.pow(Math.min(1,color.g*f+emissive.g*.65),1/2.2)*255)),b=Math.min(255,Math.round(Math.pow(Math.min(1,color.b*f+emissive.b*.65),1/2.2)*255));shades[i]=(0xff000000|(b<<16)|(g<<8)|r)>>>0;}
   const alpha=mat.transparent?mat.opacity:1,opaque=alpha>=.99;
   for(let i=0;i<indices.length;i+=3){
    const ia=indices[i],ib=indices[i+1],ic=indices[i+2],a=ia*4,b=ib*4,c=ic*4;if(projected[a+3]<=.01||projected[b+3]<=.01||projected[c+3]<=.01)continue;
    const ax=projected[a],ay=projected[a+1],az=projected[a+2],bx=projected[b],by=projected[b+1],bz=projected[b+2],cx=projected[c],cy=projected[c+1],cz=projected[c+2];
    const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx))),y0=Math.max(0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));if(x0>x1||y0>y1)continue;
    const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<.025)continue;
    const inv=1/den,dxA=(by-cy)*inv,dyA=(cx-bx)*inv,dxB=(cy-ay)*inv,dyB=(ax-cx)*inv;
    let rowA=((by-cy)*(x0+.5-cx)+(cx-bx)*(y0+.5-cy))*inv,rowB=((cy-ay)*(x0+.5-cx)+(ax-cx)*(y0+.5-cy))*inv;
    if(clipPlane&&clip[ia]<0&&clip[ib]<0&&clip[ic]<0)continue;
    for(let yy=y0;yy<=y1;yy++){
     let wa=rowA,wb=rowB,index=yy*w+x0;
     for(let xx=x0;xx<=x1;xx++,index++,wa+=dxA,wb+=dxB){const wc=1-wa-wb;if(wa<-.0001||wb<-.0001||wc<-.0001)continue;if(clipPlane&&wa*clip[ia]+wb*clip[ib]+wc*clip[ic]<0)continue;const z=wa*az+wb*bz+wc*cz;if(z< -1||z>1||z>=depth[index])continue;const shade=shades[Math.min(63,Math.max(0,Math.round((wa*light[ia]+wb*light[ib]+wc*light[ic])*48)))];if(opaque){pixels[index]=shade;depth[index]=z;}else{const old=pixels[index],oa=((old>>>24)&255)/255,out=alpha+oa*(1-alpha),blend=(v,o)=>Math.round((v*alpha+o*oa*(1-alpha))/out),r=blend(shade&255,old&255),g=blend((shade>>>8)&255,(old>>>8)&255),bb=blend((shade>>>16)&255,(old>>>16)&255);pixels[index]=((Math.round(out*255)<<24)|(bb<<16)|(g<<8)|r)>>>0;}
     }
     rowA+=dyA;rowB+=dyB;
    }
   }
  }
  this.context.putImageData(this.image,0,0);
 }
 dispose(){this.image=null;this.pixels=null;this.depth=null;this.buffers=new WeakMap();}
}
