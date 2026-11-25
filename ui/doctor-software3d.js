import * as THREE from 'three';

// Texture-mapped, depth-buffered rendering of the same animated 3D mesh when
// WebGL is unavailable. The face is never replaced with a flat portrait.
export class DoctorSoftwareRenderer {
  constructor() {
    this.domElement=document.createElement('canvas');
    this.context=this.domElement.getContext('2d',{alpha:true});
    if(!this.context)throw new Error('Canvas rendering is unavailable.');
    this.width=0;this.height=0;this.ratio=1;this.textures=new WeakMap();this.buffers=new WeakMap();
    this.isSoftwareRenderer=true;this.setClearColor(0x14243b);
  }
  setPixelRatio(value){this.ratio=Math.min(value,1);}
  setClearColor(hex,alpha=1){this.clearAlpha=Math.round(THREE.MathUtils.clamp(alpha,0,1)*255);this.background=((this.clearAlpha<<24)|((hex&255)<<16)|(hex&0xff00)|((hex>>>16)&255))>>>0;}
  setSize(w,h){
    w=Math.max(1,Math.round(w*this.ratio));h=Math.max(1,Math.round(h*this.ratio));
    if(w===this.width&&h===this.height)return;
    this.width=w;this.height=h;this.domElement.width=w;this.domElement.height=h;
    this.image=this.context.createImageData(w,h);this.pixels=new Uint32Array(this.image.data.buffer);this.depth=new Float32Array(w*h);
    this.backdrop=new Uint32Array(w*h);
    const base=this.background,r=base&255,g=(base>>>8)&255,b=(base>>>16)&255;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const radius=Math.hypot((x/w-.49)*1.15,y/h-.37),shade=1.07-Math.min(.2,radius*.19);
      const channel=value=>Math.round(Math.min(255,value*shade));
      this.backdrop[y*w+x]=((this.clearAlpha<<24)|(channel(b)<<16)|(channel(g)<<8)|channel(r))>>>0;
    }
  }
  texture(map){
    if(!map?.image)return null;
    if(this.textures.has(map))return this.textures.get(map);
    const source=map.image,canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
    const result={data:ctx.getImageData(0,0,canvas.width,canvas.height).data,w:canvas.width,h:canvas.height};
    this.textures.set(map,result);return result;
  }
  render(scene,camera){
    if(!this.image)return;
    const {width:w,height:h,pixels,depth}=this;pixels.set(this.backdrop);depth.fill(Infinity);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    const pv=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),meshes=[];
    scene.traverseVisible(o=>{if(o.isMesh&&o.geometry.index)meshes.push(o);});
    meshes.sort((a,b)=>Number(a.material.transparent)-Number(b.material.transparent));
    const vertex=new THREE.Vector3(),skinNormal=new THREE.Vector3(),baseNormal=new THREE.Vector3(),normalPart=new THREE.Vector3(),boneMatrix=new THREE.Matrix3();
    for(const mesh of meshes){
      const g=mesh.geometry,mat=mesh.material;if(Array.isArray(mat))continue;
      const count=g.attributes.position.count,normal=g.attributes.normal,uv=g.attributes.uv,index=g.index.array;
      if(mesh.isSkinnedMesh)mesh.skeleton.update();
      const bindNormal=mesh.isSkinnedMesh?new THREE.Matrix3().setFromMatrix4(mesh.bindMatrix):null,inverseNormal=mesh.isSkinnedMesh?new THREE.Matrix3().setFromMatrix4(mesh.bindMatrixInverse):null;
      let cache=this.buffers.get(g);if(!cache){cache={screen:new Float32Array(count*4),light:new Float32Array(count)};this.buffers.set(g,cache);}
      const screen=cache.screen,light=cache.light,m=new THREE.Matrix4().multiplyMatrices(pv,mesh.matrixWorld).elements;
      const nm=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld).elements,texture=this.texture(mat.map),color=mat.color;
      for(let v=0;v<count;v++){
        mesh.getVertexPosition(v,vertex);
        const {x,y,z}=vertex,k=v*4,cw=m[3]*x+m[7]*y+m[11]*z+m[15];screen[k+3]=1/cw;
        screen[k]=((m[0]*x+m[4]*y+m[8]*z+m[12])/cw*.5+.5)*w;
        screen[k+1]=(-(m[1]*x+m[5]*y+m[9]*z+m[13])/cw*.5+.5)*h;
        screen[k+2]=(m[2]*x+m[6]*y+m[10]*z+m[14])/cw;
        let nx=normal?.getX(v)||0,ny=normal?.getY(v)||0,nz=normal?.getZ(v)||1;
        if(mesh.isSkinnedMesh){
          baseNormal.set(nx,ny,nz).applyMatrix3(bindNormal);skinNormal.set(0,0,0);
          for(let k=0;k<4;k++){const weight=g.attributes.skinWeight.getComponent(v,k);if(!weight)continue;const off=g.attributes.skinIndex.getComponent(v,k)*16,bones=mesh.skeleton.boneMatrices;boneMatrix.set(bones[off],bones[off+4],bones[off+8],bones[off+1],bones[off+5],bones[off+9],bones[off+2],bones[off+6],bones[off+10]);skinNormal.addScaledVector(normalPart.copy(baseNormal).applyMatrix3(boneMatrix),weight);}
          skinNormal.applyMatrix3(inverseNormal).normalize();nx=skinNormal.x;ny=skinNormal.y;nz=skinNormal.z;
        }
        const tx=nm[0]*nx+nm[3]*ny+nm[6]*nz,ty=nm[1]*nx+nm[4]*ny+nm[7]*nz,tz=nm[2]*nx+nm[5]*ny+nm[8]*nz;
        light[v]=Math.min(1.18,.5+.5*Math.max(0,-tx*.45+ty*.5+tz*.74)+.18*Math.max(0,tx*.6+tz*.5));
      }
      for(let t=0;t<index.length;t+=3){
        const ia=index[t],ib=index[t+1],ic=index[t+2],a=ia*4,b=ib*4,c=ic*4;
        if(screen[a+3]<=0||screen[b+3]<=0||screen[c+3]<=0)continue;
        const ax=screen[a],ay=screen[a+1],az=screen[a+2],bx=screen[b],by=screen[b+1],bz=screen[b+2],cx=screen[c],cy=screen[c+1],cz=screen[c+2];
        const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx)));
        const y0=Math.max(0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
        if(x0>x1||y0>y1)continue;
        const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<.015)continue;
        const inv=1/den,dxA=(by-cy)*inv,dyA=(cx-bx)*inv,dxB=(cy-ay)*inv,dyB=(ax-cx)*inv;
        let rowA=((by-cy)*(x0+.5-cx)+(cx-bx)*(y0+.5-cy))*inv,rowB=((cy-ay)*(x0+.5-cx)+(ax-cx)*(y0+.5-cy))*inv;
        const aw=screen[a+3],bw=screen[b+3],cw=screen[c+3];
        const au=(uv?.getX(ia)||0)*aw,av=(uv?.getY(ia)||0)*aw,bu=(uv?.getX(ib)||0)*bw,bv=(uv?.getY(ib)||0)*bw,cu=(uv?.getX(ic)||0)*cw,cv=(uv?.getY(ic)||0)*cw;
        for(let yy=y0;yy<=y1;yy++){
          let wa=rowA,wb=rowB,p=yy*w+x0;
          for(let xx=x0;xx<=x1;xx++,p++,wa+=dxA,wb+=dxB){
            const wc=1-wa-wb;if(wa<-.0001||wb<-.0001||wc<-.0001)continue;
            const z=wa*az+wb*bz+wc*cz;if(z< -1||z>1||z>=depth[p])continue;
            let r=255,gc=255,bl=255,alpha=mat.opacity;
            if(texture){
              const d=wa*aw+wb*bw+wc*cw,u=(wa*au+wb*bu+wc*cu)/d,v=(wa*av+wb*bv+wc*cv)/d;
              // Bilinear sampling keeps the source face and fabric smooth in
              // the larger portrait, even when WebGL is unavailable.
              const px=Math.max(0,Math.min(texture.w-1,u*texture.w-.5)),py=Math.max(0,Math.min(texture.h-1,v*texture.h-.5));
              const tx=Math.floor(px),ty=Math.floor(py),fx=px-tx,fy=py-ty;
              const x2=Math.min(texture.w-1,tx+1),y2=Math.min(texture.h-1,ty+1);
              const o0=(ty*texture.w+tx)*4,o1=(ty*texture.w+x2)*4,o2=(y2*texture.w+tx)*4,o3=(y2*texture.w+x2)*4;
              const w0=(1-fx)*(1-fy),w1=fx*(1-fy),w2=(1-fx)*fy,w3=fx*fy,texels=texture.data;
              r=texels[o0]*w0+texels[o1]*w1+texels[o2]*w2+texels[o3]*w3;
              gc=texels[o0+1]*w0+texels[o1+1]*w1+texels[o2+1]*w2+texels[o3+1]*w3;
              bl=texels[o0+2]*w0+texels[o1+2]*w1+texels[o2+2]*w2+texels[o3+2]*w3;
              alpha*=(texels[o0+3]*w0+texels[o1+3]*w1+texels[o2+3]*w2+texels[o3+3]*w3)/255;
            }
            if(alpha<Math.max(.01,mat.alphaTest||0))continue;
            const mask=g.attributes.orbitClothing;if(mat.userData.orbitPink&&mask){const warm=Math.min(1,Math.max(0,(r/Math.max(bl,1)-1.1)/.3)),a=(wa*mask.getX(ia)+wb*mask.getX(ib)+wc*mask.getX(ic))*(1-warm*warm*(3-2*warm)),shade=Math.min(1.0,Math.max(.65,Math.hypot(r,gc,bl)/255*2.0));r=r*(1-a)+194*shade*a;gc=gc*(1-a)+121*shade*a;bl=bl*(1-a)+145*shade*a;}
            const l=wa*light[ia]+wb*light[ib]+wc*light[ic];
            // Source maps are sRGB. Untextured uniform materials use Three's linear colors.
            r=Math.min(255,r*(texture?color.r:Math.pow(color.r,1/2.2))*l);
            gc=Math.min(255,gc*(texture?color.g:Math.pow(color.g,1/2.2))*l);
            bl=Math.min(255,bl*(texture?color.b:Math.pow(color.b,1/2.2))*l);
            let outAlpha=1;
            if(mat.transparent&&alpha<.99){const old=pixels[p],oldAlpha=(old>>>24)/255;outAlpha=alpha+oldAlpha*(1-alpha);r=(r*alpha+(old&255)*oldAlpha*(1-alpha))/outAlpha;gc=(gc*alpha+((old>>>8)&255)*oldAlpha*(1-alpha))/outAlpha;bl=(bl*alpha+((old>>>16)&255)*oldAlpha*(1-alpha))/outAlpha;}
            pixels[p]=((Math.round(outAlpha*255)<<24)|(Math.round(bl)<<16)|(Math.round(gc)<<8)|Math.round(r))>>>0;
            if(mat.depthWrite!==false)depth[p]=z;
          }
          rowA+=dyA;rowB+=dyB;
        }
      }
    }
    this.context.putImageData(this.image,0,0);
  }
  dispose(){this.image=null;this.pixels=null;this.depth=null;this.backdrop=null;this.buffers=new WeakMap();this.textures=new WeakMap();}
}
