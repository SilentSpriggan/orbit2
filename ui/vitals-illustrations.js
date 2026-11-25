/* ORBIT acquisition illustrations. Equipment geometry is schematic.
 * Reference anatomy adapted (cropped, decimated and quantized) from BodyParts3D,
 * © The Database Center for Life Science, CC BY 4.0. See models/ATTRIBUTION.txt.
 */
(function () {
  'use strict';
  const TAU=Math.PI*2;
  const clip=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clip(t);return t*t*(3-2*t);};
  const V=(a,b,t)=>a.map((x,i)=>mix(x,b[i],t));
  const plus=(a,b)=>a.map((x,i)=>x+b[i]);
  const times=(a,t)=>a.map(x=>x*t);
  const unit=a=>times(a,1/(Math.hypot(...a)||1));
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const mul=(a,b)=>a.map((x,i)=>x*b[i]);
  const axes=[[1,0,0],[0,1,0],[0,0,1]];
  function rotateY(angle){const c=Math.cos(angle),s=Math.sin(angle);return [[c,0,-s],[0,1,0],[s,0,c]];}
  function rotateZ(angle){const c=Math.cos(angle),s=Math.sin(angle);return [[c,s,0],[-s,c,0],[0,0,1]];}
  function basisBetween(a,b){
    const y=unit(b.map((x,i)=>x-a[i]));
    const x=unit(cross(Math.abs(y[2])>.85?[0,1,0]:[0,0,1],y));
    return [x,y,cross(x,y)];
  }
  const materials={};
  function material(name,r,g,b,{shine=1,emit=0}={}){
    const table=new Uint32Array(384);
    for(let j=0;j<table.length;j++){
      const k=j/210;
      const white=Math.pow(clip((k-.78)/.98),1.8)*72*shine;
      const channel=(v,tint)=>clip((v*(k*.86+.09))+white+tint*(1-clip(k)),0,255)|0;
      table[j]=((255<<24)|(channel(b,12)<<16)|(channel(g,7)<<8)|channel(r,1))>>>0;
    }
    materials[name]={table,shine,emit};
  }
  material('skin',132,158,169,{shine:.43});material('warm',184,137,117,{shine:.52});
  material('suit',52,83,104,{shine:.4});material('cloth',40,64,83,{shine:.4});
  material('rubber',47,62,74,{shine:.5});material('carbon',71,90,104);
  material('ceramic',204,214,211);material('steel',145,170,178,{shine:1.65});
  material('teal',43,150,164);material('cyan',85,225,228,{emit:.48});material('ice',157,245,236,{emit:.56});
  material('amber',240,165,73,{emit:.27});material('copper',166,100,61);material('pink',220,111,161,{emit:.3});
  material('blood',174,35,55,{shine:1.6});material('vein',48,122,154);material('artery',197,95,82);
  material('dark',20,39,53);material('white',224,230,224);material('silicon',73,114,129);
  function mesh(v,n,i){return {v:Float32Array.from(v),n:Float32Array.from(n),i:Uint16Array.from(i)};}
  const base={};
  function lathe(profile,segments=24){
    const v=[],n=[],idx=[];
    for(let j=0;j<profile.length;j++){
      const a=profile[j],a0=profile[Math.max(0,j-1)],a1=profile[Math.min(profile.length-1,j+1)];
      const norm=unit([a1[1]-a0[1],a0[0]-a1[0],0]);
      for(let i=0;i<segments;i++){
        const angle=i*TAU/segments,c=Math.cos(angle),s=Math.sin(angle);
        v.push(a[0]*c,a[1],a[0]*s);n.push(norm[0]*c,norm[1],norm[0]*s);
        if(j){const x=j*segments+i,y=j*segments+(i+1)%segments;idx.push(x-segments,x,y,y,y-segments,x-segments);}
      }
    }
    return mesh(v,n,idx);
  }
  base.ball=lathe(Array.from({length:17},(_,i)=>[Math.max(.0001,Math.sin(Math.PI*i/16)),-Math.cos(Math.PI*i/16)]),28);
  base.cylinder=lathe([[.001,-1],[.87,-1],[.965,-.98],[1,-.91],[1,.91],[.965,.98],[.87,1],[.001,1]],28);
  base.pipe=lathe([[.98,-1],[1,-.96],[1,.96],[.98,1]],10);
  function roundedCube(){
    const v=[],n=[],idx=[],segments=[-1,-.979,-.94,-.89,-.82,.82,.89,.94,.979,1];
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const start=v.length/3;
      for(let i=0;i<segments.length;i++)for(let j=0;j<segments.length;j++){
        const p=[0,0,0];p[axis]=sign;p[(axis+1)%3]=segments[i];p[(axis+2)%3]=segments[j];
        const cl=p.map(a=>clip(a,-.80,.80)),normal=unit(p.map((a,k)=>a-cl[k]));
        v.push(...cl.map((a,k)=>a+.2*normal[k]));n.push(...normal);
        if(i&&j){const k=start+i*segments.length+j,l=segments.length;idx.push(k-l-1,k,k-1,k-l-1,k-l,k);}
      }
    }return mesh(v,n,idx);
  }
  base.box=roundedCube();
  const shellTriangles=[];
  for(let j=0;j<base.ball.i.length;j+=3){
    const face=base.ball.i.slice(j,j+3);
    if((base.ball.v[face[0]*3]+base.ball.v[face[1]*3]+base.ball.v[face[2]*3])/3<0)shellTriangles.push(...face);
  }
  base.eyeShell={v:base.ball.v,n:base.ball.n,i:Uint16Array.from(shellTriangles)};
  const bodies={};
  let subject=null;
  function decodeSubject(description){
    const meshes={};
    for(const [key,data] of Object.entries(description.meshes)){
      meshes[key]={v:Float32Array.from(bytes(data.p,Int16Array),x=>x/16000),
        n:Float32Array.from(bytes(data.n,Int8Array),x=>x/126),i:bytes(data.i,Uint16Array),
        uv:data.uv?Float32Array.from(bytes(data.uv,Uint16Array),x=>x/65535):null,material:data.material};
      if(data.blink)meshes[key].blink=Float32Array.from(bytes(data.blink,Int16Array),x=>x/1000000);
    }
    return {meshes,groups:description.groups,materials:description.materials};
  }
  function setSubject(model,textures){
    subject=model;
    for(const [id,traits] of Object.entries(model.materials)){
      const key='person/'+id, rgb=traits.color||[211,163,137];
      material(key,...rgb,{shine:.18});
      materials[key].texture=textures[traits.texture];
      materials[key].cutoff=Math.round(255*(traits.cutout||0));
    }
  }

  function bytes(s,type){const raw=atob(s),b=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);return new type(b.buffer);}
  function anatomy(key){
    if(bodies[key])return bodies[key];
    const encoded=packed[key];if(!encoded)return null;
    const [v,n,i]=encoded;
    const m={v:Float32Array.from(bytes(v,Int16Array),v=>v/16000),n:Float32Array.from(bytes(n,Int8Array),v=>v/126),i:bytes(i,Uint16Array)};
    bodies[key]=m;return m;
  }
  const views=new WeakMap();
  const color32=(r,g,b)=>((255<<24)|(b<<16)|(g<<8)|r)>>>0;
  function buffer(canvas){
    const w=canvas.width,h=canvas.height;
    let s=views.get(canvas);
    if(s&&s.w===w&&s.h===h)return s;
    const ctx=canvas.getContext('2d',{alpha:false});
    const image=ctx.createImageData(w,h),pixels=new Uint32Array(image.data.buffer);
    const bg=new Uint32Array(w*h),depth=new Float32Array(w*h);
    const top=[11,26,39],mid=[26,51,65],floor=[12,30,42];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const u=(x-w*.46)/w,v=(y-h*.44)/h;
      const halo=Math.exp(-u*u*6-v*v*3)*.83,low=clip(y/h-.42);
      const grain=((x*17+y*177+((x^y)*13))%17)/17*.9;
      const grid=(x%Math.max(12,Math.round(h*.095))===0||y%Math.max(12,Math.round(h*.095))===0)?2:0;
      const rgb=[0,1,2].map(i=>Math.round(mix(mix(top[i],mid[i],halo),floor[i],low)+grain+grid));
      bg[y*w+x]=color32(...rgb);
    }
    s={canvas,w,h,ctx,image,pixels,depth,bg,scratch:new Float32Array(20000*7),over:[]};
    views.set(canvas,s);return s;
  }
  class Frame{
    constructor(s,t){
      this.surface=s;Object.assign(this,s);this.t=t;this.over=[];this.pixels.set(this.bg);this.depth.fill(-1e6);
    }
    camera(center,height,yaw=.14,pitch=.08,centerX=.5,centerY=.52){
      this.target=center;this.dist=height*3.9;
      this.scale=Math.min(this.h,this.w/1.59)/height;
      this.cx=this.w*centerX;this.cy=this.h*centerY;
      const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
      this.basis=[[cy,0,-sy],[-sy*sp,cp,-cy*sp],[sy*cp,sp,cy*cp]];
    }
    project(p){
      const [x,y,z]=p.map((q,i)=>q-this.target[i]),[r,u,d]=this.basis;
      const dep=x*d[0]+y*d[1]+z*d[2],k=this.scale*this.dist/Math.max(this.dist*.14,this.dist-dep);
      return [this.cx+k*(x*r[0]+y*r[1]+z*r[2]),this.cy-k*(x*u[0]+y*u[1]+z*u[2]),dep,k];
    }
    object(m,p,sz,mat,axesLocal=axes){
      if(!m)return;
      const {v,n,i,uv}=m,[a,b,c]=axesLocal;
      const count=v.length/3*7;
      if(count>this.scratch.length)this.scratch=this.surface.scratch=new Float32Array(count);
      const data=this.scratch;
      const [R,U,D]=this.basis,scale=this.scale,dist=this.dist,cx=this.cx,cy=this.cy;
      const dx=p[0]-this.target[0],dy=p[1]-this.target[1],dz=p[2]-this.target[2];
      const [sx,sy,szv]=sz;
      const MM=materials[mat]||materials.steel;
      const {table,shine,emit,texture,cutoff}=MM;
      const mapped=!!(texture&&uv);
      for(let j=0,k=0,vertex=0;j<v.length;j+=3,k+=7,vertex++){
        const qx=v[j]*sx,qy=v[j+1]*sy,qz=v[j+2]*szv;
        const x=dx+a[0]*qx+b[0]*qy+c[0]*qz,y=dy+a[1]*qx+b[1]*qy+c[1]*qz,z=dz+a[2]*qx+b[2]*qy+c[2]*qz;
        const dep=D[0]*x+D[1]*y+D[2]*z,fac=scale*dist/Math.max(dist*.1,dist-dep);
        data[k]=cx+(x*R[0]+y*R[1]+z*R[2])*fac;
        data[k+1]=cy-(x*U[0]+y*U[1]+z*U[2])*fac;
        data[k+2]=dep;
        let nx=n[j]/sx,ny=n[j+1]/sy,nz=n[j+2]/szv;
        const inv=1/(Math.sqrt(nx*nx+ny*ny+nz*nz)||1);
        let ex=(a[0]*nx+b[0]*ny+c[0]*nz)*inv,ey=(a[1]*nx+b[1]*ny+c[1]*nz)*inv,ez=(a[2]*nx+b[2]*ny+c[2]*nz)*inv;
        let nv=ex*D[0]+ey*D[1]+ez*D[2];
        if(nv<0){ex=-ex;ey=-ey;ez=-ez;nv=-nv;}
        const facing=clip(nv);
        const key=clip(-ex*.47+ey*.73+ez*.50),rim=1-facing;
        const spec=Math.pow(clip(-ex*.26+ey*.40+ez*.875),20)*.55*shine;
        data[k+3]=mapped ? .66+key*.36+.08*(ey*.5+.5)+rim*rim*.09+spec*.14 : clip(Math.round((.28+key*.75+.14*(ey*.5+.5)+rim*rim*.3+spec+emit)*210),0,383);
        if(mapped){const q=fac/scale;data[k+4]=uv[vertex*2]*q;data[k+5]=uv[vertex*2+1]*q;data[k+6]=q;}
      }
      const w=this.w,h=this.h,zbuf=this.depth,color=this.pixels;
      for(let m0=0;m0<i.length;m0+=3){
        const ia=i[m0]*7,ib=i[m0+1]*7,ic=i[m0+2]*7;
        let x0=data[ia],y0=data[ia+1],x1=data[ib],y1=data[ib+1],x2=data[ic],y2=data[ic+1];
        const minX=Math.max(0,Math.ceil(Math.min(x0,x1,x2))),maxX=Math.min(w-1,Math.floor(Math.max(x0,x1,x2)));
        const minY=Math.max(0,Math.ceil(Math.min(y0,y1,y2))),maxY=Math.min(h-1,Math.floor(Math.max(y0,y1,y2)));
        if(minX>maxX||minY>maxY)continue;
        const invA=1/((y1-y2)*(x0-x2)+(x2-x1)*(y0-y2));
        if(!Number.isFinite(invA))continue;
        const ax=(y1-y2)*invA,ay=(x2-x1)*invA,bx=(y2-y0)*invA,by=(x0-x2)*invA;
        const zC=data[ic+2],zA=data[ia+2]-zC,zB=data[ib+2]-zC,sC=data[ic+3],sA=data[ia+3]-sC,sB=data[ib+3]-sC;
        let aStart=(minX-x2)*ax+(minY-y2)*ay,bStart=(minX-x2)*bx+(minY-y2)*by;
        if(mapped){
          const uC=data[ic+4],uA=data[ia+4]-uC,uB=data[ib+4]-uC;
          const vC=data[ic+5],vA=data[ia+5]-vC,vB=data[ib+5]-vC;
          const qC=data[ic+6],qA=data[ia+6]-qC,qB=data[ib+6]-qC;
          // Select a filtered mip level from the triangle footprint to keep hair and fabric stable in motion.
          const ix=(Math.abs(uA*ax+uB*bx)+Math.abs(uA*ay+uB*by))*texture[0].width;
          const iy=(Math.abs(vA*ax+vB*bx)+Math.abs(vA*ay+vB*by))*texture[0].height;
          const lod=Math.min(texture.length-1,Math.max(0,Math.floor(Math.log2(Math.max(ix,iy)/Math.max(.1,qC))-.33)));
          const {width:tw,height:th,data:tex}=texture[lod];
          for(let y=minY;y<=maxY;y++,aStart+=ay,bStart+=by){
            let aa=aStart,bb=bStart,at=y*w+minX;
            for(let x=minX;x<=maxX;x++,at++,aa+=ax,bb+=bx){
              if(aa<-.0003||bb<-.0003||aa+bb>1.0003)continue;
              const zz=zC+aa*zA+bb*zB;if(zz<=zbuf[at])continue;
              const q=1/(qC+aa*qA+bb*qB);
              const tx=Math.min(tw-1,Math.max(0,(uC+aa*uA+bb*uB)*q*(tw-1))),ty=Math.min(th-1,Math.max(0,(vC+aa*vA+bb*vB)*q*(th-1)));
              const row=ty|0,col0=tx|0,fx=tx-col0,fy=ty-row;
              const p0=(row*tw+col0)*4,p1=p0+(col0+1<tw?4:0),p2=p0+(row+1<th?tw*4:0),p3=p2+p1-p0;
              const wa=(1-fx)*(1-fy),wb=fx*(1-fy),wc=(1-fx)*fy,wd=fx*fy;
              if(cutoff&&tex[p0+3]*wa+tex[p1+3]*wb+tex[p2+3]*wc+tex[p3+3]*wd<cutoff)continue;
              const light=sC+aa*sA+bb*sB;
              const red=Math.min(255,(tex[p0]*wa+tex[p1]*wb+tex[p2]*wc+tex[p3]*wd)*light)|0;
              const green=Math.min(255,(tex[p0+1]*wa+tex[p1+1]*wb+tex[p2+1]*wc+tex[p3+1]*wd)*light)|0;
              const blue=Math.min(255,(tex[p0+2]*wa+tex[p1+2]*wb+tex[p2+2]*wc+tex[p3+2]*wd)*light)|0;
              color[at]=color32(red,green,blue);zbuf[at]=zz;
            }
          }
          continue;
        }
        for(let y=minY;y<=maxY;y++,aStart+=ay,bStart+=by){
          let aa=aStart,bb=bStart,at=y*w+minX;
          for(let x=minX;x<=maxX;x++,at++,aa+=ax,bb+=bx){
            if(aa<-.0003||bb<-.0003||aa+bb>1.0003)continue;
            const zz=zC+aa*zA+bb*zB;
            if(zz<=zbuf[at])continue;
            zbuf[at]=zz;color[at]=table[(sC+aa*sA+bb*sB)|0];
          }
        }
      }
    }
    body(name,mat='skin',p=[0,0,0],sz=[1,1,1],a=axes){
      const pieces=subject?.groups[name];
      if(!pieces){this.object(anatomy(name),p,sz,mat,a);return;}
      for(const id of pieces){
        const m=subject.meshes[id];
        if(m.blink){
          const amount=this.blink||0;
          if(amount!==m.blinkState){
            if(!m.rest)m.rest=m.v.slice();
            for(let k=0;k<m.v.length;k++)m.v[k]=m.rest[k]+m.blink[k]*amount;
            m.blinkState=amount;
          }
        }
        const breathe=(id==='torso'||id==='leftSleeve'||id==='leftSleeveRaised')&&this.breath;
        this.object(m,breathe?[p[0],p[1]+this.breath*.25,p[2]+this.breath]:p,sz,'person/'+m.material,a);
      }
    }
    ball(p,sz,mat){this.object(base.ball,p,sz,mat);}
    box(p,sz,mat,a=axes){this.object(base.box,p,sz,mat,a);}
    rod(a,b,r,mat,m=base.cylinder){
      const v=b.map((q,i)=>q-a[i]),half=Math.hypot(...v)/2;
      if(half<.00001)return;
      this.object(m,V(a,b,.5),[r,half,r],mat,basisBetween(a,b));
    }
    cable(points,r,mat){for(let i=1;i<points.length;i++)this.rod(points[i-1],points[i],r,mat,base.pipe);}
    glow(p,size,col,alpha=.42){
      const [x,y,dep,k]=this.project(p),r=Math.max(2,k*size);
      this.over.push(ctx=>{
        const at=Math.round(y)*this.w+Math.round(x);if(this.depth[at]>dep+size*.5)return;
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,`rgba(${col},${alpha})`);g.addColorStop(.31,`rgba(${col},${alpha*.48})`);g.addColorStop(1,`rgba(${col},0)`);
        ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
      });
    }
    bead(p,r,mat='cyan'){this.ball(p,[r,r,r],mat);}
    wire(points,material,r=.0015){this.cable(points,r,material);}
    finish(){
      this.ctx.putImageData(this.image,0,0);for(const draw of this.over)draw(this.ctx);
    }
  }
  function circle(cx,cy,cz,rx,rz,n=36){return Array.from({length:n+1},(_,i)=>[cx+Math.sin(i*TAU/n)*rx,cy,cz+Math.cos(i*TAU/n)*rz]);}
  function arcXY(c,rx,ry,n=32,start=0,end=TAU){
    return Array.from({length:n+1},(_,i)=>[c[0]+rx*Math.cos(mix(start,end,i/n)),c[1]+ry*Math.sin(mix(start,end,i/n)),c[2]]);
  }
  function pad(f,pos,r,col='ice'){
    const [x,y,z]=pos;f.ball(pos,[r,r,.25*r],'ceramic');f.ball([x,y,z+.24*r],[r*.55,r*.55,r*.16],col);
  }
  function path(a,b,c,d,t){
    const s=1-t;return a.map((x,i)=>s*s*s*x+3*s*s*t*b[i]+3*s*t*t*c[i]+t*t*t*d[i]);
  }
  function curve(a,b,c,d,n=16){return Array.from({length:n+1},(_,i)=>path(a,b,c,d,i/n));}
  function beacon(f,p,r,col='cyan'){
    f.bead(p,r,col);f.glow(p,r*3.5,col==='amber'?'255,171,65':'54,235,228',.45);
  }
  function display(f,p,size){
    f.box(p,size,'ceramic');const [x,y,z]=p,[w,h,d]=size;
    f.box([x,y+h*.04,z+d],[w*.86,h*.78,d*.13],'dark');
    for(let j=0;j<3;j++)f.box([x+w*(-.63+j*.22),y-h*.84,z+d],[w*.07,h*.024,d*.08],j===0?'amber':'carbon');
  }
  function wave(type,t){
    const x=(t%1+1)%1,gauss=(c,w)=>Math.exp(-((x-c)**2)/(w*w));
    if(type==='ecg')return .17*gauss(.21,.045)-.17*gauss(.39,.022)+gauss(.425,.021)-.34*gauss(.46,.025)+.25*gauss(.69,.073);
    if(type==='pressure')return 1.1*gauss(.26,.16)+.47*gauss(.5,.13)+.21*gauss(.72,.14);
    if(type==='co2')return ease((x-.12)/.15)*(1-ease((x-.69)/.06))*(.79+.20*x);
    return Math.sin(x*TAU)*(.66+.33*Math.sin(x*Math.PI));
  }
  function graph(f,title,traces,t,{x=.65,y=.27,w=.31,h=.46}={}){
    f.over.push(ctx=>{
      const W=f.w,H=f.h,l=x*W,top=y*H,ww=w*W,hh=h*H;
      ctx.save();ctx.fillStyle='rgba(5,19,30,.90)';ctx.beginPath();ctx.roundRect(l,top,ww,hh,Math.max(3,H*.014));ctx.fill();
      ctx.strokeStyle='rgba(105,155,166,.5)';ctx.lineWidth=.7;ctx.stroke();
      ctx.fillStyle='#cee0df';ctx.font='500 '+Math.max(8,Math.round(Math.min(W/58,H/32)))+'px monospace';ctx.fillText(title,l+ww*.07,top+hh*.16);
      const y0=top+hh*.25;
      ctx.strokeStyle='rgba(107,166,175,.15)';ctx.beginPath();
      for(let j=1;j<9;j++){const xx=l+ww*(.05+.90*j/9);ctx.moveTo(xx,y0);ctx.lineTo(xx,top+.92*hh);}
      for(let j=0;j<5;j++){const yy=y0+hh*.16*j;ctx.moveTo(l+.05*ww,yy);ctx.lineTo(l+.95*ww,yy);}ctx.stroke();
      traces.forEach(trace=>{
        const [type,color,cycle,amplitude,baseline,phase=0,lead]=trace;
        const start=lead?lead.x:.05,span=lead?.span??.90;
        if(lead){ctx.fillStyle='#c7dce3';ctx.font='500 '+Math.max(6,Math.round(H*.021))+'px monospace';ctx.fillText(lead.label,l+ww*(start-.065),top+hh*baseline);}
        ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=Math.max(.8,Math.min(2,H*(lead ? .004 : .006)));
        for(let j=0;j<=100;j++){
          const u=j/100,xx=l+ww*(start+span*u),yy=top+hh*baseline-wave(type,u*cycle-t*.7+phase)*hh*amplitude;
          if(!j)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
        }ctx.stroke();
      });ctx.restore();
    });
  }
  function cabinet(f){
    f.box([.43,1.11,-.25],[.16,.66,.05],'carbon');
    for(let j=0;j<5;j++){
      const y=.69+j*.22;f.box([.43,y,-.19],[.135,.09,.013],'suit');
      f.box([.42,y+.045,-.174],[.086,.013,.003],'steel');
      for(let i=0;i<3;i++)f.box([.35+i*.026,y-.035,-.173],[.008,.008,.003],i===0?'amber':'cyan');
    }
    f.rod([-.50,.1,-.19],[-.50,1.85,-.19],.022,'steel');f.rod([.65,.1,-.19],[.65,1.85,-.19],.022,'steel');
  }
  function belt(f){
    const p=circle(0,.998,.018,.169,.133);
    f.wire(p,'cloth',.012);f.box([0,.998,.150],[.030,.017,.008],'steel');
    f.box([0,.998,.159],[.015,.009,.003],'carbon');
    f.box([-.008,.998,.163],[.003,.005,.001],'amber');
  }
  function collar(f){
    const p=[-.083,1.395,.066];
    f.box(p,[.027,.036,.014],'ceramic',rotateZ(-.16));
    f.box([p[0],p[1]+.011,p[2]+.016],[.017,.011,.004],'dark');
    for(let j=0;j<3;j++)f.box([p[0]-.010+j*.009,p[1]+.012,p[2]+.020],[.002,.004,.0008],'teal');
    beacon(f,[p[0]-.008,p[1]-.014,p[2]+.018],.003);
    return p;
  }
  function airflow(f,t){
    for(let i=0;i<18;i++){
      const seed=(i*.6180339)%1,j=(t*.6+seed)%1;
      const p=[.012+j*.27,1.55+.045*Math.sin(i*2+j*5)+j*.057,.1+j*.13];
      const r=.0035+.003*(1-j);f.bead(p,r,i%3===0?'amber':'cyan');
      if(i%4===0)f.glow(p,r*3,'81,214,211',.35);
    }
  }
  function prep(f,stage,t){
    if(stage===0){
      const push=ease(t);
      f.camera(V([.025,1.31,.015],[.025,1.45,.035],push),mix(.97,.66,push),.30-.14*push,.045,.44,.50);
      cabinet(f);f.body('figure');collar(f);airflow(f,t);
      f.wire(curve([-.078,1.367,.067],[-.08,1.30,.14],[-.06,1.21,.13],[-.03,1.17,.128]),'rubber',.0024);
    }else if(stage===1){
      const focus=ease((t-.22)/.70);
      f.camera([0,mix(.42,.918,focus),.03],mix(.99,.71,focus),.33-.2*t,.19,.49,.50);cabinet(f);f.body('figure');belt(f);
      f.object(base.cylinder,[.262,.882,.024],[.042,.012,.042],'teal');
      const plug=[.337+.034*(1-ease(t*2)),.918,-.134];
      f.wire(curve([.291,.882,.047],[.328,.793,.08],[.381,.829,-.09],plug),'rubber',.004);
      f.rod(plug,plus(plug,[.026,0,0]),.009,'steel');
      f.box([0,.003,.012],[.34,.018,.21],'carbon');
      for(const x of [-.092,.092]){
        f.box([x,.036,.075],[.059,.031,.092],'rubber');
        f.wire(curve([x-.061,.022,.07],[x-.06,.142,.073],[x+.06,.142,.073],[x+.061,.022,.07]),'steel',.0085);
      }
      for(const side of [-1,1])f.wire(curve([side*.12,1,.118],[side*.25,.98,.11],[side*.28,.86,-.06],[side*.29,.84,-.12]),'amber',.007);
    }else{
      f.camera([0,.90,.02],1.94,.16+.16*t,.035,.48,.50);cabinet(f);f.body('figure');collar(f);belt(f);
      for(const side of [-1,1]){
        const p=curve([side*.092,.12,.095],[side*.10,.64,.105],[side*.03,.91,.15],[.005,1.34,.118],30);
        f.wire(p,'vein',.009);for(let j=0;j<4;j++)beacon(f,p[Math.floor(((t*1.23+j/4)%1)*29)],.011);
        f.wire(curve([0,1.33,.118],[side*.021,1.40,.073],[side*.034,1.43,.050],[side*.036,1.48,.04]),'cyan',.006);
      }
    }
  }
  function tracks(f,y,rx,rz,mat,w=.003){
    for(const dy of [-.003,.003])f.wire(circle(0,y+dy,-.005,rx,rz),mat,w);
  }
  const textile=[[-.072,1.382,.0750],[.072,1.382,.0750],[-.108,1.22,.1022],[.108,1.22,.1022]];
  const leads=[[-.118,1.395,.051],[.118,1.395,.051],[-.10,1.07,.090],[.10,1.07,.090],[-.018,1.328,.1104],[.018,1.328,.1101],[.048,1.302,.1180],[.079,1.278,.1211],[.124,1.278,.079],[.132,1.278,.036]];
  function electro(f,stage,t){
    const close=stage===0?ease((t-.25)/.65):0;
    if(stage===0) f.camera(V([0,1.340,.015],[0,1.29,.035],close),mix(.91,.54,close),.10+.24*t,.03,.48,.50);
    if(stage===1) f.camera([0,1.324,.029],.59,.22+.11*t,.04,.50,.51);
    if(stage===2) f.camera([0,1.348,.025],.91,.16+.12*t,.035,.32,.50);
    f.body('figure');
    tracks(f,1.245,.174,.147,'copper',.0034);tracks(f,1.118,.160,.142,'copper',.0034);
    f.wire(curve([0,1.44,.036],[0,1.36,.105],[0,1.30,.126],[0,1.04,.127]),'carbon',.002);
    if(stage===0){
      for(let side of [-1,1]){
        f.wire(curve([side*.12,1.409,.062],[side*.102,1.36,.097],[side*.139,1.28,.104],[side*.135,1.13,.093]),'carbon',.0022);
      }
      for(let i=0;i<4;i++){
        const p=textile[i];pad(f,p,.013,i%2===0||t>.4?'ice':'amber');f.glow(p,.021,'79,221,221',.4);
      }
      f.box([.128,1.177,.111],[.023,.032,.009],'ceramic',rotateZ(-.18));
      f.box([.128,1.183,.121],[.017,.012,.003],'dark');
    }else{
      for(let i=0;i<10;i++){
        const p=leads[i],col=i<4?'amber':'ice';pad(f,p,.0088,col);
        const dest=[.178+(i%3)*.004,1.112+(i%4)*.002,.105];
        const pathPts=curve(plus(p,[0,-.003,.005]),[p[0]-.023,p[1]-.045,p[2]+.024],[p[0]+.07,1.114,.17],dest);
        f.wire(pathPts,i%3===0?'copper':'steel',.00125);
      }
      if(stage===1){
        const p=leads[4+Math.min(5,Math.floor(t*6))];
        f.wire(arcXY(plus(p,[0,0,.004]),.014,.014,24),'amber',.0013);
        const q=f.project(p);
        f.over.push(ctx=>{
          const x=q[0],y=q[1],w=f.w,h=f.h;
          ctx.save();ctx.beginPath();ctx.moveTo(x+4,y-3);ctx.lineTo(x+w*.07,y-h*.095);ctx.lineTo(x+w*.14,y-h*.095);
          ctx.strokeStyle='#e7bb83';ctx.lineWidth=Math.max(1,h*.0025);ctx.stroke();
          ctx.fillStyle='#f6d6ac';ctx.font=Math.max(9,Math.round(h*.032))+'px monospace';
          ctx.fillText('V'+(1+Math.min(5,Math.floor(t*6))),x+w*.071,y-h*.103);ctx.restore();
        });
      }else{
        const leads=['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];
        const gains=[.8,1,.6,-.85,.4,.73,-.43,.32,.7,.98,.89,.7];
        const traces=leads.map((label,i)=>{
          const column=Math.floor(i/6);
          return ['ecg',column?'#7bd2d3':'#e6ad70',1.45,.069*gains[i],.315+(i%6)*.12,0,{label,x:.12+column*.47,span:.32}];
        });
        graph(f,'12-LEAD ECG',traces,t,{x:.57,y:.16,w:.415,h:.66});
      }
    }
  }
  function armCuff(f){
    const c=[.192,1.272,-.038];f.object(base.cylinder,c,[.055,.047,.068],'teal',rotateZ(.11));
    for(const dy of [-.037,.037])f.wire(circle(c[0]-dy*.10,c[1]+dy,c[2],.055,.068),'steel',.0018);
    f.box(plus(c,[.014,0,.066]),[.032,.04,.006],'cloth',rotateZ(.11));
    f.box(plus(c,[.009,.025,.073]),[.014,.003,.0015],'ice');
    const tap=plus(c,[.019,-.030,.061]);
    f.rod(tap,plus(tap,[.015,-.021,0]),.0045,'rubber');
    f.wire(curve(plus(tap,[.015,-.021,0]),[.245,1.145,.042],[.339,1.116,.039],[.354,1.213,.031]),'rubber',.0035);
  }
  const fingerPads=[[.2955,.801,.039],[.2932,.791,.015]];
  const neutralWrist=[.2572,.9198,-.0144];
  function fingerCuffs(f,transform=p=>p,turn=0){
    for(const q0 of fingerPads){
      const q=transform(q0);
      f.object(base.cylinder,q,[.012,.009,.016],'rubber',rotateZ(-.14+turn));
      f.box(plus(q,[0,0,.015]),[.011,.008,.003],'steel',rotateZ(turn));beacon(f,plus(q,[0,0,.019]),.0035);
    }
    const a=transform(fingerPads[0]),b=transform(fingerPads[1]),join=transform(plus(fingerPads[0],[.031,.046,.020]));
    for(const v of [a,b])f.wire(curve(plus(v,[0,0,.018]),plus(v,[0,.013,.022]),plus(join,[0,-.008,.004]),join),'carbon',.0017);
  }
  function pressure(f,stage,t){
    if(stage===0){
      const upper=ease((t-.20)/.40),fingers=ease((t-.62)/.38);
      const target=V(V([.08,1.29,.002],[.222,1.265,-.016],upper),[.291,.807,.015],fingers);
      const height=mix(mix(1.02,.34,upper),.185,fingers);
      f.camera(target,height,.70+.27*upper+.14*fingers,.055,.47,.50);
      f.body('figure');armCuff(f);fingerCuffs(f);
      const origin=[.367,1.255,.031];display(f,origin,[.042,.053,.014]);
      const line=[];for(let j=0;j<34;j++){const k=j/33;line.push([origin[0]-.032+.063*k,origin[1]+wave('pressure',k*1.65-t)*.016,origin[2]+.017]);}
      f.wire(line,'cyan',.0009);
    }else if(stage===1){
      const close=ease((t-.18)/.68);
      f.camera(V([.05,1.326,.049],[.075,1.292,.088],close),mix(.88,.50,close),.66-.24*t,.022,.45,.51);
      f.body('chestPose');
      const pads=chestPads;
      posedFingerCuffs(f,pads);
      const heartRef=[.091,1.355,.142];
      pad(f,heartRef,.013,'pink');
      const start=plus(pads[0],[0,0,.014]);
      const pathPts=curve(start,plus(start,[.01,-.039,.039]),plus(heartRef,[.031,-.037,.032]),heartRef,22);
      f.wire(pathPts,'pink',.0019);beacon(f,pathPts[Math.floor(t*21)],.0038,'ice');
    }else{
      f.camera([.290,.801,.019],.188,.98+.19*t,.10,.34,.51);
      f.body('hand');fingerCuffs(f);
      graph(f,'ARTERIAL PRESSURE',[
        ['pressure','#7de0dc',2.5,.15,.53,0],['pressure','#edae6c',2.5,.123,.78,-.06]
      ],t,{x:.58,y:.24,w:.37,h:.48});
    }
  }
  // Contact positions land on the fitted raised hand, in the same coordinate system as the subject.
  const chestPads=[[.0121,1.3324,.1726],[-.0037,1.3127,.1698]];
  function posedFingerCuffs(f,pads){
    for(const p of pads){
      f.object(base.cylinder,p,[.011,.008,.014],'rubber',rotateZ(1.19));
      const port=plus(p,[0,0,.014]);
      f.box(port,[.009,.006,.0025],'steel',rotateZ(1.19));beacon(f,plus(port,[0,0,.0035]),.0025);
    }
  }
  function foreheadPatch(f){
    const p=[.014,1.641,.105],a=rotateZ(-.11);
    f.box(p,[.032,.022,.004],'white',a);f.box(plus(p,[.002,0,.006]),[.022,.016,.004],'steel',a);
    f.box(plus(p,[.004,0,.010]),[.013,.009,.002],'teal',a);
    f.wire(curve([-.015,1.646,.108],[-.052,1.668,.107],[-.086,1.642,.037],[-.080,1.595,.006]),'rubber',.0022);
    beacon(f,plus(p,[.012,.003,.013]),.0024,'amber');
  }
  function thermal(f,stage,t){
    if(stage===0){
      const close=ease((t-.10)/.84);
      f.camera(V([0,1.493,.016],[0,1.608,.044],close),mix(.59,.303,close),.40+.20*Math.sin(t*Math.PI),.035,.46,.50);
      f.body('bust');foreheadPatch(f);
      const halos=[[-.01,1.666,.042],[.056,1.635,.057],[-.054,1.617,.047]];
      for(let i=0;i<halos.length;i++){
        const p=plus(halos[i],[0,0,.023]);f.glow(p,.045+.012*Math.sin(TAU*t+i),'249,142,62',.39);
      }
      for(let i=0;i<5;i++){
        const p=curve([.071+i*.003,1.549,.002],[.101+i*.003,1.574,.019],[.107+i*.003,1.648,.015],[.049+i*.003,1.702,.012],19);
        f.wire(p,'copper',.00075);f.bead(p[Math.floor((t*.76+.16*i)%1*18)],.0015,'amber');
      }
    }else if(stage===1){
      f.camera([0,.018,0],.21,.58+.12*t,.30,.50,.52);
      const gap=.012*ease(t*2);
      f.box([0,-.056,0],[.102,.017,.064],'warm');f.box([0,-.037,0],[.102,.004,.064],'copper');
      f.box([0,-.024,0],[.09,.010,.056],'rubber');
      f.box([0,-.005+gap,0],[.078,.006,.044],'white');
      f.box([0,.021+gap,0],[.064,.005,.038],'silicon');
      for(let i=0;i<6;i++){
        const x=-.05+i*.019;
        f.wire([[x,.03+gap,-.028],[x,.03+gap,.023],[x+.009,.03+gap,.026],[x+.009,.03+gap,-.024]],'copper',.0016);
      }
      f.box([0,.048+gap,0],[.069,.008,.044],'ceramic');
      for(let i=-1;i<=1;i++){
        const yy=-.066+.030*((t*1.6+.24*i+1)%1),x=i*.032,z=.069;
        f.wire([[x,yy,z],[x,yy+.014,z]],'amber',.0015);
        f.wire([[x-.003,yy+.010,z],[x,yy+.014,z],[x+.003,yy+.010,z]],'amber',.0015);
      }
    }else{
      f.camera([0,1.102,.10],.442,.26+.12*t,.035,.40,.50);
      f.body('figure');belt(f);
      const loops=[];
      for(let i=0;i<65;i++){const u=i/64;loops.push([.072*Math.sin(u*TAU*2.53),1.157-u*.15,.141+.007*Math.cos(u*TAU*2.53)]);}
      f.wire(loops,'silicon',.011);
      const at=loops[Math.floor((.18+.32*t)*64)];f.rod(plus(at,[-.007,0,.014]),plus(at,[.007,0,.014]),.005,'white');f.rod(plus(at,[-.008,0,.014]),plus(at,[0,0,.014]),.0052,'amber');
      const receiver=[.153,1.07,.121];f.box(receiver,[.034,.047,.011],'ceramic',rotateZ(-.14));f.box(plus(receiver,[0,.008,.012]),[.025,.025,.003],'dark');beacon(f,plus(receiver,[.015,-.027,.016]),.0035);
      for(let j=0;j<3;j++){const r=.012+.047*((t+j/3)%1);f.wire(arcXY(plus(at,[0,0,.019]),r,r*.8,18,-.81,.81),'teal',.0013);}
    }
  }
  function oximeter(f){
    const c=[0,1.64,-.008];f.wire(circle(...c,.087,.107),'teal',.005);
    f.box([-.025,1.638,.103],[.020,.013,.005],'ceramic');beacon(f,[-.022,1.638,.109],.003,'amber');
  }
  function pneumotach(f,t){
    const lip=[0,1.537,.1129],point=(x,y,z)=>plus(lip,[x,y,z]);
    const sections=[
      [0,.029,.010,'rubber'],[.029,.049,.016,'ceramic'],[.049,.088,.025,'steel'],
      [.088,.144,.015,'ceramic'],[.144,.148,.010,'dark']
    ];
    for(const [a,b,r,mat] of sections)f.rod(point(0,0,a),point(0,0,b),r,mat);
    for(let j=0;j<5;j++){
      const z=.053+j*.0075;f.rod(point(0,0,z),point(0,0,z+.002),.0258,'rubber');
    }
    const p=curve(point(.020,0,.075),point(.071,-.006,.077),point(.081,-.093,.105),point(.151,-.116,.10));
    f.wire(p,'teal',.0029);beacon(f,p[Math.floor(t*(p.length-1))],.0032);
  }
  function lung(f,side,t){
    const p=[side*.089,1.299,-.019],inflate=1+.065*Math.sin(t*TAU*1.1);
    f.object(base.ball,p,[.068*inflate,.119,.055*inflate],'vein',rotateZ(-side*.21));
    const z=.042;
    const main=curve([0,1.389,z],[side*.025,1.375,z],[side*.064,1.313,z],[side*.09,1.252,z],14);
    f.wire(main,'ice',.004);
    for(let j=0;j<7;j++){
      const a=main[4+j],l=.042+j*.002,baseY=a[1];
      const branch=curve(a,[a[0]+side*l*.4,baseY-.002,z],[a[0]+side*l*.7,baseY+.012-j*.007,z],[a[0]+side*l,baseY+.019-j*.008,z-.008],9);
      f.wire(branch,'cyan',.0027);
      for(let n=0;n<3;n++){
        const q=branch[4+n];f.wire([q,plus(q,[side*(.009+.002*n),.010-.006*n,.001]),plus(q,[side*(.013+.002*n),.016-.012*n,-.001])],'teal',.0015);
      }
    }
  }
  function pulmonary(f,stage,t){
    if(stage===0){
      const close=ease((t-.20)/.72);
      f.camera(V([0,1.465,.065],[0,1.586,.079],close),mix(.72,.34,close),-.54-.29*t,.043,.47,.50);
      f.body('bust');oximeter(f);pneumotach(f,t);
    }else if(stage===1){
      f.camera([0,1.322,.008],.378,.19+.11*t,.05,.35,.50);
      lung(f,-1,t);lung(f,1,t);f.body('airway','ceramic',[0,0,.053]);f.rod([0,1.38,.047],[0,1.467,.048],.010,'silicon');
      for(let j=0;j<9;j++)f.wire(circle(0,1.385+j*.009,.046,.0102,.0095,12),'ice',.0009);
      graph(f,'EXPIRED CO₂',[['co2','#76dedc',2.6,.46,.82]],t,{x:.61,y:.17,w:.34,h:.31});
      f.over.push(ctx=>{
        const W=f.w,H=f.h,l=W*.61,top=H*.52,w=W*.34,h=H*.295;ctx.fillStyle='rgba(5,19,30,.91)';ctx.beginPath();ctx.roundRect(l,top,w,h,4);ctx.fill();ctx.strokeStyle='rgba(105,155,166,.55)';ctx.stroke();
        ctx.fillStyle='#c9dedf';ctx.font=Math.max(8,Math.round(H/32))+'px monospace';ctx.fillText('FLOW / VOLUME',l+.07*w,top+.21*h);
        ctx.strokeStyle='#678391';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(l+w*.09,top+h*.64);ctx.lineTo(l+w*.92,top+h*.64);ctx.stroke();
        ctx.strokeStyle='#e7a868';ctx.lineWidth=1.4;ctx.beginPath();for(let i=0;i<70;i++){const k=i/69,x=1-Math.cos(k*TAU),y=Math.sin(k*TAU)*(.9+.55*Math.cos(k*TAU));const xx=l+w*(.11+.38*x),yy=top+h*(.64-y*.21);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();
      });
    }else{
      const close=ease((t-.22)/.70);
      f.camera(V([.025,1.456,.036],[.065,1.333,.068],close),mix(.65,.335,close),.28-.14*t,.052,.33,.50);f.body('bust');
      const c=[.076,1.324,.124];f.rod(c,plus(c,[0,0,.014]),.026,'steel');f.rod(plus(c,[0,0,.013]),plus(c,[0,0,.021]),.021,'rubber');f.rod(plus(c,[0,0,.020]),plus(c,[0,0,.025]),.012,'ceramic');
      f.wire(curve(plus(c,[.017,0,.011]),[.156,1.323,.17],[.117,1.20,.18],[.194,1.201,.22]),'teal',.006);
      soundPlot(f,t);
    }
  }
  function soundPlot(f,t){
    f.over.push(ctx=>{
      const W=f.w,H=f.h,l=W*.597,top=H*.23,w=W*.36,h=H*.55;
      ctx.save();ctx.fillStyle='rgba(4,17,28,.94)';ctx.beginPath();ctx.roundRect(l,top,w,h,5);ctx.fill();
      ctx.strokeStyle='rgba(105,155,166,.55)';ctx.lineWidth=.8;ctx.stroke();
      ctx.font=Math.max(8,Math.round(H/32))+'px monospace';
      for(let row=0;row<2;row++){
        const y0=top+h*(.21+.45*row);ctx.fillStyle='#d0e5e4';
        ctx.fillText(row?'FILTERED':'RAW AUDIO',l+w*.07,y0-h*.04);
        for(let i=0;i<48;i++)for(let j=0;j<12;j++){
          const k=(i/48+t*.25)%1,fr=j/11;
          const rand=(Math.sin((i+1)*12.17+(j+2)*7.67)*83017)%1;
          const breath=Math.pow(.5+.5*Math.cos(TAU*(k*2.1+.07)),2)*Math.exp(-Math.pow((fr-.61-.14*Math.sin(k*TAU))/.33,2));
          const fan=(j===8||j===9?.55:0)+.20*Math.abs(rand);
          const level=clip(.03+breath*(.48+.45*Math.abs(rand))+(row?0:fan));
          const R=Math.round(9+level*(row?89:197)),G=Math.round(29+level*(row?175:131)),B=Math.round(44+level*(row?150:63));
          ctx.fillStyle='rgb('+R+','+G+','+B+')';ctx.fillRect(l+w*(.07+.86*i/48),y0+h*.23*j/12,Math.ceil(w*.86/48),Math.ceil(h*.23/12));
        }
      }ctx.restore();
    });
  }
  function doppler(f,t){
    f.over.push(ctx=>{
      const W=f.w,H=f.h,l=W*.61,top=H*.21,w=W*.345,h=H*.55;
      ctx.save();ctx.fillStyle='rgba(4,17,28,.94)';ctx.beginPath();ctx.roundRect(l,top,w,h,4);ctx.fill();
      ctx.strokeStyle='rgba(105,155,166,.55)';ctx.lineWidth=.8;ctx.stroke();
      ctx.font=Math.max(8,Math.round(H/32))+'px monospace';ctx.fillStyle='#c9dedf';ctx.fillText('DOPPLER',l+w*.07,top+h*.16);
      ctx.translate(l+w*.50,top+h*.24);ctx.scale(w*.89,h*.70);
      ctx.beginPath();ctx.moveTo(-.16,0);ctx.lineTo(.16,0);ctx.lineTo(.51,.94);ctx.bezierCurveTo(.23,1.07,-.23,1.07,-.51,.94);ctx.closePath();ctx.clip();
      ctx.fillStyle='#203441';ctx.fillRect(-.6,0,1.2,1.1);
      for(let y=0;y<45;y++)for(let x=0;x<53;x++){
        const xx=(x/52-.5),yy=y/44;
        const hash=((x*3023+y*771+x*y*63)%79)/79,band=.5+.5*Math.cos((yy+.08*Math.sin(xx*9))*58);
        const intensity=Math.floor(26+hash*68+band*44);
        ctx.fillStyle='rgb('+intensity+','+(intensity+10)+','+(intensity+13)+')';ctx.fillRect(xx,yy,.015,.016);
      }
      for(const [cx,cy,rx,ry] of [[-.15,.55,.085,.09],[.115,.65,.146,.137]]){
        ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,-.12,0,TAU);ctx.fillStyle='#061923';ctx.fill();ctx.strokeStyle='#8ca1a8';ctx.lineWidth=.010;ctx.stroke();
      }
      for(let i=0;i<10;i++){
        const a=(i*.84+t*4)%TAU,r=i/11,xx=.115+.087*r*Math.cos(a),yy=.65+.081*r*Math.sin(a);
        ctx.beginPath();ctx.ellipse(xx,yy,.023,.009,a,0,TAU);ctx.fillStyle=i<6?'#4faad1':'#cc806a';ctx.fill();
      }ctx.restore();
    });
  }
  function ocular(f,stage,t){
    if(stage===0){
      const close=ease((t-.22)/.70);
      f.camera(V([.015,1.470,.018],[.045,1.491,.038],close),mix(.67,.282,close),.65+.12*t,.03,.36,.51);
      f.body('bust');
      const skin=[.0362,1.47,.024],out=unit([.74,.15,.66]);
      const contact=plus(skin,[0,.003*Math.sin(t*TAU),0]);
      const probeAxis=unit([.80,-.36,.48]),at=d=>plus(contact,times(probeAxis,d));
      const a=basisBetween(at(0),at(.104));
      f.box(plus(contact,times(out,.006)),[.019,.006,.011],'rubber',a);
      f.box(at(.032),[.015,.028,.013],'white',a);
      f.rod(at(.048),at(.104),.011,'ceramic');
      f.wire(curve(at(.104),plus(at(.122),[0,-.009,0]),plus(at(.145),[0,-.045,.006]),plus(at(.175),[0,-.039,.003])),'rubber',.003);
      doppler(f,t);
    }else if(stage===1){
      f.camera([.003,.008,-.006],.072,.95+.20*t,.18,.48,.52);
      const ball=[0,0,.002],nerve=curve([.001,0,-.018],[.003,-.002,-.027],[.009,-.005,-.035],[.013,-.006,-.048],26);
      f.cable(nerve,.0054,'amber');f.cable(nerve.slice(14),.0031,'white');
      f.object(base.eyeShell,ball,[.024,.023,.023],'ceramic');
      f.rod([-.001,0,.002],[.001,0,.002],.0224,'copper');f.rod([.0011,0,.002],[.0018,0,.002],.0208,'rubber');
      f.rod([.0019,0,.002],[.0021,0,.002],.0196,'silicon');
      f.ball([.0028,0,.0202],[.0029,.008,.0045],'ice');
      f.wire([[.0029,-.014,.018],[.0029,-.008,.021]],'teal',.0012);f.wire([[.0029,.014,.018],[.0029,.008,.021]],'teal',.0012);
      for(let j=0;j<7;j++){
        const theta=j*TAU/7,yy=Math.sin(theta),xx=Math.cos(theta),ps=[];
        for(let k=0;k<=10;k++){
          const phi=.71+k*.115,tt=theta+.08*Math.sin(k*.75+j);ps.push([.0243*Math.sin(phi)*Math.cos(tt),.0232*Math.sin(phi)*Math.sin(tt),.002+.02325*Math.cos(phi)]);
        }
        if(Math.cos(theta)<-.1)f.wire(ps,'copper',.00033);
      }
      const z=-.025-t*.001;
      for(const y of [-.006,.005]){
        f.wire([[.005,y,z],[.012,y,z],[.016,y,z]],'cyan',.00048);
        f.wire([[.012,y-.0016,z],[.012,y+.0016,z]],'cyan',.00045);
      }
      f.wire([[.014,-.006,z],[.014,.005,z]],'teal',.00038);
    }else{
      f.camera([.044,1.602,.117],.224,1.02+.09*Math.sin(t*Math.PI),.10,.50,.50);
      f.body('bust');
      const eye=[.0293,1.598,.0888];
      const approach=.006*(1-ease(t*1.7))+.002*Math.pow(Math.cos(t*TAU*1.5),2);
      const tip=plus(eye,[0,0,.001+approach]);
      f.rod(tip,plus(tip,[0,0,.019]),.0016,'steel');f.bead(tip,.0018,'white');
      f.rod(plus(tip,[0,0,.019]),plus(tip,[0,0,.042]),.006,'rubber');
      f.rod(plus(tip,[0,0,.040]),plus(tip,[0,0,.091]),.016,'ceramic');
      f.rod(plus(tip,[0,0,.058]),plus(tip,[0,0,.064]),.0165,'teal');
      f.box(plus(tip,[0,-.019,.096]),[.019,.034,.025],'ceramic',rotateZ(-.07));
      f.box(plus(tip,[.018,-.010,.098]),[.003,.011,.014],'dark',rotateZ(-.07));
      beacon(f,plus(tip,[.020,-.004,.101]),.0024);
    }
  }
  // Anatomical left ring fingertip in the subject's relaxed, registered pose.
  const needleSite=[.290,.767,-.0045];
  const needleAxis=unit([.83,-.12,-.55]);
  function frostedTube(f,tip,axis,length,fill){
    const point=d=>plus(tip,times(axis,d));
    for(const v of [[0,.0017,0],[0,-.0017,0]]){
      f.rod(plus(tip,v),plus(point(length),v),.00043,'steel');
    }
    f.rod(tip,point(Math.max(.00015,length*.85*fill)),.0014,'blood');
    for(let i=0;i<4;i++){
      const p=point(length*(.45+.12*i));
      f.rod(plus(p,[0,-.0021,0]),plus(p,[0,-.00075,0]),.00038,i===3?'amber':'steel');
    }
  }
  function samplingStation(f){
    // The tabletop and analyzer establish where the close-up takes place.
    f.box([.52,.715,-.104],[.199,.013,.110],'steel');
    f.box([.52,.732,-.104],[.179,.004,.091],'carbon');
    for(const x of [.392,.654])f.rod([x,.42,-.116],[x,.71,-.116],.011,'steel');
    const c=[.514,.753,-.08],a=rotateZ(-.055);
    f.box(c,[.044,.015,.075],'ceramic',a);
    f.box(plus(c,[.002,.016,.018]),[.035,.002,.028],'dark');
    for(let i=0;i<4;i++) f.box(plus(c,[-.014+i*.009,.018,.010]),[.002,.001,.009],'teal');
  }
  function reagent(f,stage,t){
    if(stage===0){
      const close=ease((t-.24)/.60);
      f.camera(V([.122,1.217,-.010],plus(needleSite,[.010,.012,.002]),close),mix(1.18,.103,close),mix(.54,1.29,close),mix(.055,-.045,close),mix(.43,.46,close),.51);
      f.body('figure');samplingStation(f);
    }else{
      f.camera(plus(needleSite,[.016,.009,-.002]),.115,1.28+.09*t,-.045,.43,.52);
      f.body('hand');
    }
    const withdrawal=stage===0?ease((t-.62)/.31):1;
    const fill=stage===0?0:ease((t-.15)/.67);
    const radius=stage===0?.001+.0031*withdrawal:.0041-.0015*fill;
    const center=plus(needleSite,times(needleAxis,radius*.59));
    f.ball(center,[radius*.96,radius,radius],'blood');
    f.bead(plus(center,[radius*.45,radius*.40,radius*.63]),radius*.095,'white');
    if(stage===0){
      const distance=.002+.008*(1-ease(t*1.95))+.015*withdrawal;
      const p=d=>plus(needleSite,times(needleAxis,distance+d));
      f.rod(p(0),p(.010),.00067,'steel');
      f.rod(p(.010),p(.016),.0037,'rubber');f.rod(p(.015),p(.048),.0064,'ceramic');
      f.rod(p(.047),p(.065),.007,'teal');f.rod(p(.055),p(.057),.0075,'white');
      return;
    }
    const tip=plus(center,times(needleAxis,radius+.012*(1-ease(t*4))));
    frostedTube(f,tip,needleAxis,.069,fill);
  }
  function chemistry(f,stage,t){
    if(stage<2){reagent(f,stage,t);return;}
    f.camera([0,.015,.008],.263,.48+.17*t,.37,.50,.52);
    const slide=ease(t*2.7),baseY=-.010,carY=.129-.035*slide;
    f.box([0,baseY,0],[.047,.081,.018],'ceramic');
    f.box([0,baseY-.047,.020],[.043,.028,.003],'teal');
    f.box([0,baseY+.029,.019],[.036,.026,.0028],'rubber');
    f.box([0,baseY+.029,.022],[.031,.021,.0016],'dark');
    for(let i=0;i<4;i++)for(let j=0;j<3;j++)f.box([-.025+j*.024,baseY-.029-i*.010,.024],[.007,.0035,.0018],i===3&&j===2?'amber':'white');
    f.box([0,.070,0],[.026,.005,.009],'dark');
    f.box([0,carY,.002],[.023,.032,.005],'silicon');
    f.box([-.004,carY+.008,.008],[.015,.015,.0018],'ceramic');
    f.box([.007,carY+.012,.011],[.004,.004,.001],'blood');
    if(t>.22){
      f.over.push(ctx=>{
        const W=f.w,H=f.h,left=W*.68,top=H*.35,w=W*.22,h=H*.28;
        ctx.fillStyle='rgba(4,17,28,.94)';ctx.beginPath();ctx.roundRect(left,top,w,h,5);ctx.fill();ctx.strokeStyle='rgba(105,155,166,.55)';ctx.lineWidth=.8;ctx.stroke();
        ctx.fillStyle='#d0e5e4';ctx.font=Math.max(8,Math.round(H/32))+'px monospace';ctx.fillText('CG4+',left+w*.10,top+h*.25);
        for(const [i,title] of ['pH','PCO₂'].entries()){
          ctx.fillStyle='#8adcd8';ctx.fillText(title,left+w*.10,top+h*(.52+i*.28));
          ctx.fillStyle='#416270';ctx.fillRect(left+w*.48,top+h*(.45+i*.28),w*.35,Math.max(1,h*.032));
          ctx.fillStyle='#8adcd8';ctx.fillRect(left+w*.48,top+h*(.45+i*.28),w*.35*ease(t*1.5-i*.22),Math.max(1,h*.032));
        }
      });
    }
    for(let i=0;i<4;i++){
      f.box([-.010+i*.0055,carY-.012,.009],[.0015,.006,.0009],'amber');
      const y=baseY+.041-i*.007;
      f.box([-.016,y,.024],[.010,.0008,.0005],'steel');
      f.box([.014,y,.024],[.005,.0008,.0005],i/4<t?'cyan':'carbon');
    }
  }

  const packed={"heart":["jP4dUJ8Cn/60UJcCqf45UAwC5v5BUToD4v7sUKMC4v7sT6MBAv+2UKgDKf/UUZ0C7P5NUEoC2v6nT5ECI/9vT/MBJ//2T3YDCP8WUBwD//7RT6QCDP+qUFIDLf8DUK0Bhf8pUDoBcf9qUfADWP9XUJ0DQP9LUW4DUP+2UbYCN/+eTzcCaP+fT0YBgP82UccDoP87Un4Dsv9YUOMA6f9+UsMDwv8GUlUCbgBeUIIEz/8+T/UCw/9tUskCm/8yUuMBu/+dT3AB+v9ZUqYDRwAbT0ICBgCbUVAElABVT6kD+f9eUhkDMQA5T+UClwAFT7IB6v+QUAwEggBQUlUEJQC8Us0BSQCATz0B8/+bUPUA9f98UJMAWABGUUwENwD5UQ4EjgB3TxYEFgAdU+UCbgDVTvIB/P/wUYQB5P9EUnYB+v9uUf4AtgDEThYDRgB9UZkANgDWT84AUgBNU2ADsADoTm4DagAFUzECwAD1TlcBMgDEUgwB4AD6ULoEigAEUDIEpAATUy0DUgAdUuQBWwB/UWUBTgB8UH0AngAAU88CnwADVKACpQBoUk8CwQB1UF8B0AAbUWsAxADTUHwEnQC8UtQDDgGUTkoCugD6U1wCzgAdUqsB1gB2UvIBlgD8Tz0BgAAgUiwBlwDbUnIAywC4T93/CwEHUqUEAwFIU+gDEQHGTmMCbQBkT7MAygD3UxkDiQBuU6MCywB2U2ED2ADRUnECvQBMUzMC6wC8UfUBvwBkUmoA/gAFUmkEfgFAUyYE8QAZU4IDHwEBT3gDvQB2U0cC4QAEUccBIQETT7oB4gDDUeoA2ABWUkwAvQCAUD8A/gAeUJ7/ZwFVUIQEZQGkTykEUwHaU6MDPQEHU/wB8ACoUSoB5QABT4kA/QAqUND/SgE/UKsEgQGnUZUEewGGT1MEXAHOU3kDUwFTUiQCWwFgUwECTAF0U9EBEwGxUDIB6wA0UZYAHAHvUZEAJAHgT1UASAGaUjoEbQHEUhQCWQF0UgACbQEUUsoBWgGqTrQBNgG2UZYBHgEgU1YAVgFYT6z/sAHITj0DUAHAUwkCnAG9U7YBBwL+TjYChgGnUF8CmwG2TwACrAGZTuQASgGvT/EAjwEFUkYAdAFCUl8AqQEbUgAAoAHEUj0AmwHETzv/ZwJyTkgDtQEFU7YDjQHHUV0CdwHXT/r/zQF0UckEwQHGU6sDKgKfTokCpwFhUd8BuwE/UHsBjwHrTi4A0gFCT50A2AGyUAn/AQIOUZEECgLgUrMD9AFxUkAEewGKU2gBgQF7U9MA6QEPU9cA6AFHUI7/9AGOULQEuAFYUaIC/AGBUOQCYwJvToQC5AHQUpIBsAE5U6wBxwHmUr8B+QEyU8UAxgF3UoYEjALTTp0D3gFsUjoC+QHIUBECEwKHUo0B/QFLT04B6gFvUnUAmQJHT/4DiwK7TsUDCwKyU9YDVwL+URICXgJmTsQBEwIlUhYAJgL7TwL/9QIzTyIEVAIIUxgEMAN5TrcCJQKuUv0ATQLdUWX/JQI4T4T/VwIJUIv/UgIDUawETwKpU4oDdQISUWQDTgKZURsDVgIFU9wBEwKZU8IBXgKJT/3/SQLOUIH/cAKZUkUEjwIKUEYERwLGUWUEdgJJUFkDTAJfT7oCegKJUqkCTAIHUWQChgJwT94BogI5U4YBqwJHUPD+iwK4UXsElAKuUMcCpQLgT4IC3wJhUmsAhgJ/TqwAPwJpUR7/pAIyUgcEmgKWUzoDOgOoTgcDmQKOUXQCsAKVUq8B3gL0Tv4AfgLdUhAAsAJPUof/hwIQUhUAhgLnUiEDjQKaTgwDiQIPUzQChQKDU18CrgJtUxUC1QLoToUB7wJQT2EA3gJlUJv/swKnUdP/2QJtT2L/GAM6UBsEsgKLT18DlALOUskCFQMKU6YA+gLuTvD/5gJcUSj/ygKzUjYD8ALBUmIDFAP4T+sDDgP5UYQDBAMdUk0C1AKTUvIAcANBToIBLgOxTxcAXQOwUBQE4wItUhoDUgNKTj8CJANoTtYAJAP4UXP/aAObTyEEXwNjUCQEQAPEUdYDEgNXUeMDIwPKUE8DFwPsUjoCTQMcT3oCWwPZTl4DJAMxUEkDQwNZUS8DagOLUv3/PQMZUOr/OgNWT+ADrQOaTm4DXAPdTt4BWwNvUlMBHwM7UeD/WgM7UD3/tAOVT5gDcAMVUoIAQgPwUXwDtQNwURADaAMcUmMCqwPoUlQBhwNOUg4DxgOvUpkAdgOaTpoAsgMrTxwA1wOvUdb/pgPwTlgBwgN5Ty8E2gOFUbcDqQNpUJ4D0QPPUbwA/wOCTx0B5APvT6wA2gO5UHUA8APYUBYECwRtTvAC6QMVTwQDywOeUisCzQP4TqgBDwStTxkA3wNlUKj/3wO8UIcD2ANyT5sD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2f7aULMDSP/KUeQD7P7tUVQD5/5WUSwDIf/3UYoCyf6yTwQCv/7tT+EB9f5MVPwBN//CVCQA8f6FUvD/T//XUz4ACP/wUKADKf8xUwMDE/+7UaICZP/gUkADOf9BT7gBcv8mUAsBw//WTwkAVf8cUr0Dd/9BUjoDD/8tVOMBTv+wT0wBef/OVJoBy/9wUAkA8v+1UhwAbP/IUNb/ZP/VU28CV/+1U2cCTf/aTqABxf8sTzABR//aTyIBjf/eUdIDqv8uT7gBZf/QTkUAm/9VUusDlf+1UzIAuf/AUlEDzP93UsYCpf/xU7MCrf9EUpMBgv8sUhkCqf+7U9kBxP+VUw0Crf/FU5YBov8TVL4Bjv/YVGwBmP8XT2YArP/QVHIArv9TUn8D1//eUsoD6P+iUoUB3/+mUwUCBAC7Uk0Ao/8hUvz/7P+IUPH/CADZUi8Cyv/cTgAB6P+jU50Axf9dUQAADgBdTxcBwf/NVAQBz/+aUNsAJQBgUIQArv/ZVJ0ADACpUwoD+f93UncB6/8jU4kB/P/OURkB3//DVBgBMAAAUGkARwBfUJgA6v+cUfUAKwAgUYgA4f9dUUEAVQBAU3UDEgBNU8ADNgCsU7YCDACaU6EASQD0U4UDQgD6U9MCXQDwT2cAYwBnUZwAHAA2U/4CRADkUkYCaQCiU4kCFAC9UncBWQClUsEAOACkUqcASQDKUnYArgDyU5wCHAFHVc8B8QBfVOsBJwHUUyUC5QDlUxwDEwGKVNoC9ABfVQoBHgFtVBwBeQE2VH0DZAHGVQoBnAEJVH8B5QGZU7oDhQFPVTkC0AGdU7IB/gE6VB0BHAKoVQ0BCAIOVJMDIAJAVWkCbAJyU1UDeQJFVGYBjgJLVRIBgAJtU1UCagLOVIkCrALNVBIBbgExUswAqwHuUq8AzwGWUngBzAH7UkoBHQHJUwsCVAFnUoUAXgEOUmUBZgGCUtwBRwEIVJUBFwHPUmIAKgEuVDcB8gBPUtABhADsU1IC5gAOVNoA1wD/UR4B1QD/VAoBEwHzVKoBeABWUpEB1gD+VCkCDgD9VFACswCGUoMARwBPVM8AQACEUyoC7P+9Uw0BawBUUuwAVAD/VM0Azv//VAUB0/+HU1oBvv/nU9MBi/8AVZMB2/9KVCEC","h98OlSzNyli5ki0qXweukPbIoPlSrhKiY0XbraUatZ7ms71KYTXEaUPxcv7KWk0qDmVKrh5bTiaka9POVK/RTGIYu8OqUu2imUYWkTjtrD9FEoTyzeFvw5gkn1DzjQHMQFJHWbfNNXL6xRJuNFq4UKIZNW/kIG8xPhCUxzZj5HTYDy11zyBwvf2WOPOQP9Wc16tTkzvs0Yzwr6QcixbWifYn040XrQ+jr8mxqks21Jk51Eahw5jd+37/6P18KzSWacXcAJtMtctWuw6YceszEnniNK5QveVnJeaKJQeIN7Gv5oX6EHzuN06uBTCM1v13ZE0H1SOPpdiy5iJ3yUZZHXsEm7zf6nkdff8OVOCoTPdk0xGMwedqQS1iJ9yO8UBsMrilIWzHVxNZq+la4U9eciwg1gmKVEzI3WvIBSGHEUuc8XA40PaMZz3Zv5/RVF4C+Np4AOuE8b1qQD2m+PB9SwZlqQOlaxLBeOATSRBmVlkWBbOcOSNr2xaKChSE54btTCej3fV5za2wF3jgUCJbGXsOtwlnoe1RpuRU3IrpXkXRSLJED/999K+h6z2UzNaV9YgmD9OLtRZjLGJBEg98FlWm9nYsSwybUCen4ZXGL3Ahpzi65AOFzsib4L+ZhvPkyl/Cnrkl8klmD+x7pAlVoutRAITtpNe1IhB4DkFrGW/LES50/Wa24ERlYBuz76mmRFzL6Lhk9T6T+6JULlpML8iZ54UIBpA59NSKEsZuQztZ+IMQyJAMkcrn9KWq9jRyMAR002bGqw1ctS1atB9f+WlGAl9TwRhrOSlo4x2J0eWOpvBXqctKoyxIUeqiUz+5MXDjEveEPhhrXP6qXDS84pxG8orWuDmqtcSuWVMhtlkxStKlAo3MDHsaA2a3+kmZ16RMmcbVBHzoiQ8nkToPRWfpMHDg7mdGy/9yutVgH7ubo/irptJLhe8TInTcFJ21KxuMkcULbDMnmvFJhwYkJ66o4ocSDYTvxkhWPR1qnRRL9IUXC43PKTKUFN94Dwx9Zyk9gvwHS+ydTl8bQF3JhPQUUxOjIL2aOVGyuCJhlBnEBJlJA371u5cIueNkROuYSTiqubdKQElQwbC205rFP20FJWFHT1vcLpvEQLmuVB6mzmovAdV2KkxbHvOGmsw0nj0znyNJnv1PHStzJosc5XTXRmIltWQNWtexWfqnx9eX0iGQk8D9SZznLgR1KKpTTlM1l8HjV7jIlNLRa0ICiOofZDnMVdtWUDpOjPvPjyXXjDADiBEiZw5Hhej5chzRaf+7WrYwbjAogwr4YK4Ia8Dwb9zRePzbd90XeSELfQz3ewkYeuXzi9ECiPIlyDhi+JHFpB9RiAQonBW2i+8slz7fkjYgwGLSnrABnrQa2Hf/jzXvsNum/EJr/7BirN9Yv9ubJNBvwy2bBpq2+wKC1fp2x3AKYCO3YgxOrqcieAHbU79FLfmKOduWPqY/UUO7wymavx9nymfP25TLJ3IkQdtlJfR4pq4j8ryX2wuIw/hu0Ph0sfFhNgyPRJnlSTepKnbvFFNd3D2YKNuOKpEp4We+7LSeBDB0zP9z8AZ9/QF+7VtVKvOKJ43e2Y3e4qWuIcFo+96HC9B07KtbNUem8XfZAbaaffL2OZgrWCVSCvh9Ras/+IIEBGlGL/515PyFeiAGI3n7Bn4BAe59+RCD0y5sAgGCAZdF2eCNGIflH4fy/lekAiaIsdxbGcRs93QwGil061hY59FyumgLZgW23DSTmRhEGnnoHmjAuFU7HzeTyKZEw2kk7pM9lz/gxNpoMhKOTri8FIonZLofInnyu5jvpfOq4pQ5TKMmCsCUme9GSUKx9Hjb3pU58K1dZ0cT4ux5PL+msGECDcJtFSKIsaQhC+mFRVO/cywZggQEmMHfjQ0y2jRsZh+8U7+7K2K+u2kLaQO7jhvSayHFFiB414sWwla85ojioMg7iBvkV6/WQGrnpexV4V1POD5eO28FC4P5agZEeufvcMcNfgYAZ8jStp3lmsnPXROtcS/jz69TLS5sTlYxyY8MffYQWVDXRUq2Rv1pRviYOZAIakAYFIracBsyXqz2ZkPibiTPmPu5gv8IhRXyhOr/hhIYg/cNi9UVid0WehbpdRkmff8Qe+7tcuYwpB2viOYakfQ6hwUjhRYQliDDXAdWld/H1uWMlgtDr680kCAvVkC+eAHapcVATkW5bRXFkiUyjjT5zR6R3RCIcuLSa9jLkRs1kM0ceOQZYBVPKxd0IPR53/mHYACv5d2KeCX9r0w764Xseg/jvtOf1HPoWOZW2uiKrNNTqy5RXNW1vj9XFojgT9GqQgCV6lKjZhO4cDsBPLesFkqd4nAySQqaAv1+BRSE5QF7FwWEqgRcWLEsfggC6ctw/dF189+HEhCECMJt5RV5GwaFb87fnELaSfNmbRU8CkplAS+L7O972e12bMAMvUFUW6/hLMiY6PiExF3DFuSHyihqoUjW3LudPzxbMGowzQpzPhGUBPCD8HA3+Y7LvJfxlfO/ueuaW9BJS/NlH6up2BJ2PhSUwBGVYbAHxmwfj9/UTZ0Ptp/gnrIQkdLbYDBCuVjIqBhXMmQ7Z73kCxh7hg3lT13fsvFiJwqJPP+RiScPHYohiOYbQQqVawRCmEXvHQd6p/yntGQL8a+gbMUdeCUIMstnZEkYhxoWUwhfggP2ggQCs/pjcc8aABt7iNoAcyLaT1A5M27fc9vdfvz+bL8FfO3yewbjfgEJeQcjg/f4bxbJitT8m0Yej9jZxZben/lQrEY+ix/czMGg2kJk4mzG2aG45KpY2WVA756yCsyOKlevODZjKGc9ZMs3LqqwXj7JMZLcbC8ucOfNS6fPZQy2dt8deCUMXxFSHb6ZMpMnN9RpdyYTEgyEbC7T8q9gDvF8NyuX5IfqLWnLcTYJqrIwO05Q2DpozdGX7AuEx9hpnvCyn7vWAjuRvkWtidnxktoxiSoEpfFV","AAABAAIAAwABAAAAAQAEAAIAAAACAAUABgADAAAAAwAHAAEAAgAEAAgACQAAAAoABQAKAAAAAAALAAYACQALAAAADAANAA4ADgANAAQAAQAHAAQADQAIAAQADwACAAgAEAAFAAIABgARAAMADgASAAwADgAEABMABAAHABQADwAIAA0ADwAQAAIAEwAEABQADQAVAA8ABQAWAAoADgATABcABwADABgABQAQABkAFwASAA4AEQAaAAMAGAADABoAFAAHABsAGQAWAAUABgAcABEACQAdAAsAHgAHABgACQAKAB0AHgAfAAcAEAAPACAACwAcAAYAEwAUACEADQAiABUAHwAbAAcADwAVACAAIwARABwAJAAMABIAFAAlACEAJAANAAwAIgANACYAJwAgABUAEgAXACgAEQApABoAFwATACEAJgANACQAGwAlABQAKgAfAB4AIgAnABUAKwAQACAAEAAsABkALQAWABkALgAoABcALwAXACEAMAALAB0AGAAxAB4ACgAyAB0AGwAfADMANAAfACoALAAQACsALAA1ABkAEQAjACkANgAdADIAHwA0ADMANAA1ADMANwA1ADQAFgAtADgANQAtABkAHAALADAALwAuABcAMQAYADkAOgAdADYAHgA7ACoACgAWADwAIAAnACsAKgA9ADQANQA3AC0APgAjABwAKAA/ABIAMAAdADoAJQBAACEAMQA7AB4AQQAlABsAGwAzAEEAQQAzAEIAMwA1AEIAPAAWADgALQBDADgAPwAkABIAOQAYABoAJQBEAEAAMQA5AEUAJQBBAEYAMgAKADwARwAsACsANwA0AD0ASABDAC0ASAAtADcAKABJAD8AIQBAAEoANgAyAEsARgBEACUAMQBMADsARQBMADEAOwBNACoAOwBOAE0AKwBPAEcAKgBQAD0AUQA3AD0AOABDAFIAUwApACMASQAoAC4AKQBUABoAJgBVACIATQBQACoANQAsAEcARwBCADUAPAA4AFYASgAvACEAGgBUADkAOQBXAEUAQABEAFgAWQBAAFgAWQBYAEUAWgBEAEYARQBYAEwATABbADsAQgBcAEEAXQA9AFAAPQBdAFEAOABSAFYAUwAjAD4ASQAuAF4ALwBeAC4ASgBeAC8AXwBUACkASgBAAGAAJgAkAGEAWQBgAEAAYQBVACYAYgBYAEQAWABiAEwAXABCAGMAZAArACcAUABlAF0ANwBmAEgAZgA3AFEAQwBIAGcAQwBoAFIASQBpAD8AagA/AGkAVABrADkAVwA5AGsAYgBEAFoATgBbAGwAOwBbAE4ARwBjAEIAbQBQAE0AbQBlAFAAUgBuAFYAaABnAG8AaABDAGcAHABwAD4AcQBJAF4AHAAwAHIAJAA/AGoAcwBZAEUAVQAnACIARgB0AFoAYgB1AEwAdABGAEEAdgBsAFsATAB2AFsATwArAGQAVgBuADwAdwBIAHgAZQB5AF0ASAB3AGcAbwBnAHoAKQBTAF8AXgBKAHsAawBzAFcAcwBFAFcAfABiAFoATgBsAH0AfgBNAE4AMgA8AH8ATQCAAG0AdwB4AGUAeAB5AGUAXQCBAFEAbgBSAIIAewBKAGAAgwBVAGEAdAB8AFoAdQCEAEwAhACFAEwAdABBAFwATACFAHYAhgBPAGQAYwBHAIcATwCIAEcAdwBlAG0APABuAIkAdwCKAGcAigB6AGcAeQB4AIsAjABdAHkAjQBIAGYAjACBAF0AZgBRAI4AaACPAFIAaQBJAHEAagBhACQAZAAnAFUAfgBOAH0AhgCIAE8AgABNAH4AbQCAAHcAiwB4AEgAjQCLAEgAUQCBAI4AjQBmAI4AHAByAHAAkAAwADoAkQBZAHMAkAA6ADYAkgB0AFwAkgBjAIcAYwCSAFwAfAB1AGIASwAyAH8AhwBHAIgAfwA8AIkAiwCMAHkAkwBvAHoAbwCTAGgAggBSAI8AlABTAD4AkQB7AGAAYABZAJEAlQBzAGsAVQCWAGQAgAB+AJcAgACXAHcAmACKAHcAbgCZAIkAggCZAG4AegCaAJMAjwBoAJsAaQBxAJwAewBxAF4AewCdAJ4AVABfAGsAnQB7AJEAhQCEAHUAhQCfAHYAlwCYAHcAegCKAJoAoACBAKEAoACOAIEAogBoAJMAcACjAD4AkQBzAJUAlgBVAIMAkgCHAKQAiAClAIcApgBLAH8AfgB9AKcAfQBsAKcAdQCoAIUAdgCnAGwAqQCoAHwAdQB8AKgAhQCgAJ8AqgCOAKAAogCbAGgAPgCjAJQAlACrAFMAUwCrAF8AagCsAGEArQB8AHQArQCpAHwArgCYAJcAfgCnAK8AdgCfAKcAsACaAIoAgQCxAKEAiwCxAIwAjACxAIEAngBxAHsAaQCyAGoAswByADAAXwC0AGsAlQCdAJEAtACVAGsAYQCsAIMANgBLAJAApACHAKUArQB0AJIAhgBkAJYAlwB+ALUAtgB/AIkAnwCgAKEAoACFAKoAiwCNALcAuACPAJsAcAC5AKMAcgC5AHAAugC0AF8AtgC7AH8AmACwAIoAnwChAKcAsQC8AKEAjgC9AI0AvgCZAIIAvwCiAJMAowDAAJQAqwC6AF8AagCyAKwAtADBAJUAwgCkAKUAwwCSAKQAuwCmAH8AxACoAKkAxADFAKgAqADFAIUApwChALwAmgDGAJMAkwDGAL8AvgCCAI8AmwCiAMcAqwCUAMgAaQCcAMkAnABxAMoAygBxAJ4AyAC6AKsAswAwAJAAnQCVAMEAwgClAMsAwgDDAKQAzAClAIgAzQCtAJIAzgCuAJcArQDEAKkAmACuAM8AfgCvALUA0ACFAMUArwCnALwA0ACqAIUAsQCLALcAtwCNAL0A0QC4AJsAwADSAJQAkgDDAM0AzACIAIYAzgCXALUArgDTANQArgDUAM8AsACYAM8A1QC8ALEAmQC+ANYAvwDHAKIA1wCbAMcA0gDIAJQAaQDJALIA2ADKAJ4A2ACeAJ0AugDZALQA2gCGAJYAzgDTAK4AtQDbAM4A3ACvALwA3QCaALAA1QCxALcAqgDeAI4AmQDWAIkAvQCOAN8A4AC3AL0AjwC4AL4AmwDXANEAuQByALMAtADZAMEAnQDBAOEArADiAIMAlgCDAOIAkABLAKYAzgDbANMA4wDEAM0AzQDEAK0AxADkAMUA5ADlAMUA5gDdALAA1gC2AIkAxgCaAOcAvwDoAMcA6QDXAMcA1wC9AN8AuADqAL4A6wDJAJwA2ACdAOEA7ADLAKUAzADsAKUA5ADhAMEA2gCWAOIA4wDNAO0AxADjAOQA3AC1AK8AxQDlANAA7gCqANAA3QDnAJoA7wDWAL4AjgDeAN8A7wC+AOoAvQDXAOkA4AC9AOkA8ADRANcA6wCcAMoA4QDxANgA8gDZALoA8wDCAMsAwgD0AMMA5ADtAOEA2QDkAMEA2gDMAIYA5QDkANkA7QDkAOMA2wC1APUAtQDcAPUA5gCwAM8A3AC8APYAtgDWAPcA9gC8ANUA7gDeAKoA1QC3AOAAxgDnAPgA+AC/AMYA0QDqALgA+QDSAMAAzQDDAPoA7QDxAOEA8QDNAPoA8QDtAM0A+wC7ALYA/AD3ANYA/QDXAN8AowD+AMAA/wD5AMAAAAG6AMgAAQH0AMIAAgHTANsA2QADAeUA5gDPAAQB+wC2APcA6ADpAMcA/QDwANcA/gCjALkAAAHIANIA6wDKANgAAQHYAPQA8wDLAOwA8gC6AAAB+gDDAPQA9ADxAPoABQHsAMwA0wAGAdQAzADaAAUB2wAHAQIB1AAEAc8AAwHQAOUA4ADpANUA3gAIAd8A+AAJAb8ACQHoAL8A6wAKAckACgGyAMkA6wDYAAEBCgGsALIAwgDzAAEB8QD0ANgAswCQAAsB4gCsANoA3QDmAAwBDQHcAPYA1gDvAPwA6AAOAekA0QDwAA8BAAHSAPkA8wDrAAEBswALAbkA7AAKAfMACgHsAAUBBQHaAKwA0wACAQYBEAHUAAYBkACmALsA1AAQAQQBBwHbAPUAAwHZAPIA7gAIAd4A6QARAdUACAH9AN8A0QAPAeoA/wDAAP4ABQGsAAoBCgHrAPMAAAESAfIA8gASAQMBEwEHARQB9QAUAQcB3AAUAfUADQEUAdwAFQHQAAMBDQH2ANUADgERAekAEgEAAfkAEgEWAQMBFQEXAe4AEQENAdUAGAH8AO8AFwEIAe4A6gAZAe8AGQHqAA8BGgEPAfAA8AD9ABoBDAHmAAQBFQHuANAA3QAbAecAGwH4AOcA7wAZARgB/gAcAf8AuQALAf4AFgESAR0BAgEeAQYBuwALAZAA3QAMARsB9wD8ABgBEQEfAQ0BIAH4ABsBDgEfAREBCQEhASIB6AAJASIBDgHoACIBIwH5AP8AHAH+AAsBIwESAfkAHgECAQcBuwD7ACQBEAElAQQBJQEMAQQBAwEmARUBJwEbAQwBIQEJAfgAGQEPASgBDwEaASkBHQESASMBEAEGAR4BBwEqAR4BKwElARABCwG7ACQBJQEnAQwBJgEDARYBFAENASwBLQH3ABgBDgEiAR8BHAEuAf8ALwEcAQsBEAEeASsBMAEWAR0BEwEqAQcBFgEwASYB9wAkAfsAJwEgARsBHwEsAQ0BIAEhAfgA/QAIARoBDwEpASgBHgEqASsBLwELASQBEwEUATEBLAExARQBMgEtARgBLgEjAf8AEwEzASoBJAH3AC0BFQEmATQBLAEfATUBGAEZATIBCAEXATYBLgEcATcBHAEvATcBHQEjATgBKgE5ASsBOQE6ASsBMAEdATgBKwE6ASUBEwExATMBJQE7AScBJwE7ASABIQE8ASIBHwEiATUBMgEZASgBNgEaAQgBPQEjAS4BKgEzATkBOQEzAT4BOgE7ASUBJgEwATQBPAEhASABNQEiATwBNAEXARUBNAE2ARcBPwEaATYBKQFAASgBNwE9AS4BLwFBATcBJAFBAS8BQgEwATgBQwE5AT4BMwExAT4BJAEtAUQBNQE+ASwBMQEsAT4BOwE8ASABRQEtATIBQAEpARoBJAFEAUEBOgE5ATsBOwE5AUMBMAFCATQBRAEtAUUBOwFDATwBPgE8AUMBNQE8AT4BRgEoAUABGgE/AUABOAEjAT0BPQFCATgBRgEyASgBRQEyAUYBNgE0AT8BRgFAAUcBPQE3AUgBSAE3AUEBRAFIAUEBSAFEAUUBSQE0AUIBPwE0AUoBPQFIAUsBQgE9AUsBSAFFAUwBSQFKATQBRQFGAUwBRwE/AUoBPwFHAUABSwFJAUIBRgFHAUwBSAFKAUsBSAFMAUoBSQFLAUoBTAFHAUoBTQFOAU8BTwFOAVABUQFSAVABTwFTAU0BVAFVAVYBTwFSAVMBUgFXAVMBVAFYAVkBVAFWAVgBWQFYAVoBWAFWAVsBXAFZAVoBWgFbAVwBWgFdAVsBXgFbAV0BUAFOAVEBXwFOAVQBVwFSAVEBVAFOAVUBTgFNAWABTwFhAVIBUgFhAVABUwFXAWIBTQFTAWABXAFjAVkBWAFbAV4BWwFWAVUBZAFjAVwBWwFkAVwBTgFfAWUBVwFRAWYBUAFnAU8BTgFgAVUBZwFoAU8BaQFUAVkBWgFYAWoBWAFrAWoBbAFQAW0BVAFpAV8BZwFqAWgBYQFuAVABbwFaAWoBaAFqAWsBaAFhAU8BWAFeAWsBWwFVAXABYAFTAWIBcAFkAVsBUQFOAWUBUQFxAWYBbAFnAVABbwFqAWcBZgFyAVcBcwFpAVkBdAFaAW8BcwFZAWMBYQFoAXUBdAFdAVoBcAFVAWABdgFeAV0BaQF3AV8BcAFgAWIBeAFjAWQBcAF5AWQBXwF6AWUBewFRAWUBdwF8AV8BbAF9AWcBfQFsAW0BUAF+AW0BfwGAAW8BbgF+AVABVwFyAWIBdAGBAV0BdQFoAWsBeAFzAWMBawFeAXYBeAFkAXkBUQF7AXEBegF7AWUBXwF8AXoBdwFpAXMBgAF0AW8BggFiAXIBYQF1AW4BdQFrAXYBeQFwAWIBfQFvAWcBgwFtAX4BhAF+AW4BggFyAYUBeAGGAXMBhwFdAYEBhwF2AV0BcQF7AYgBfQF/AW8BeQFiAYIBcQGIAYkBigF6AXwBiAF7AXoBcQGJAYsBfQGMAX8BfgGNAYMBdwFzAY4BcwGPAY4BjwFzAYYBdQGQAW4BeAGRAYYBfAGSAYoBigGIAXoBkgF8AZMBiwFmAXEBjgGTAXcBfAF3AZMBjAF9AYMBjAGUAX8BbQGDAX0BjQF+AYQBhQFyAZUBbgGQAYQBlgGPAYYBdgGQAXUBkgGXAYoBlwGYAYoBkgGTAZkBiQGIAZoBjgGbAZMBlAGAAX8BnAGNAYQBnQF0AYABigGYAZ4BngGaAYoBigGaAYgBnwGMAYMBoAGhAZQBlAGhAYABZgGVAXIBogGVAWYBnQGBAXQBowGQAXYBeQGCAaQBkgGgAZcBoAGUAZcBjAGXAZQBmgGlAYkBpQGLAYkBnwGDAaYBmQGTAZsBkgGZAaABogFmAYsBpwGEAZABkQF4AXkBmAGXAYwBnwGoAYwBpgGDAakBoAGZAaEBjwGqAY4BggGFAasBhwGjAXYBpAGCAawBeQGkAZEBpQGaAa0BngGuAZoBpQGvAYsBqQGDAY0BmwGwAZkBnQGAAaEBjwGWAaoBgQGdAbEBpwGQAbIBowGyAZABswGlAa0BrwGlAbMBrgGtAZoBjAGoAZgBqAGfAaYBogGLAa8BqgGwAZsBmwGOAaoBmQGdAaEBpwGcAYQBgQGxAYcBrAGCAasBqQG0AaYBngGYAa4BtQGoAaYBnAGpAY0BmQGwAZ0BlQGrAYUBrQG2AbMBtwGvAbMBlQGiAbgBuQGxAZ0BlQG4AasBugGsAasBuwG2Aa0BtgG8AbMBvQGtAa4BtAG1AaYBtQG0Ab4BuAG6AasBlgGGAZEBsgGjAb8BpAGsAcABwQG0AcIBuwGtAb0BqQHCAbQBrgHDAb0BvgG0AcQBxQGpAZwBogGvAbcBqAG1AcYBxwGcAacBlgHIAaoBsAGqAcgBsAG5AZ0ByQGWAZEBwAGsAboBygG2AbsBygG8AbYBywG0AcEBzAGzAbwBywHEAbQBtwGzAcwBzQGpAcUBmAHOAa4BqAHGAZgBxgHOAZgBtwHPAaIBsAHQAbkBpwGyAccByQHRAZYBhwGxAdIBhwHTAaMBowHTAb8B1AGkAcAB1QHKAbsB1gHLAcEBwgGpAc0BxgG1Ab4BvgHNAcUBtwHXAdgBzgHGAdkBuQHQAdkBsAHIAdAByAGWAdEBvwHaAdsB2wHcAb8B0gGxAbkBsgG/AdwB3QHeAcABwAG6Ad0BkQGkAdQBkQHUAckB3wG3AcwBxAHgAb4BtwHYAc8BwwGuAc4B4QHFAccBxgHiAdkBxwHFAZwB0AHOAdkBuQHZAdIB2gG/AdMB4wHAAd4B5AGHAdIB5QHVAbsB5gHLAdYBwgHnAcEBywHmAcQB6AHCAc0B6AHNAb4B6QG+AcUB4gHGAb4B4gG+AekB6QHbAeIBuAGiAc8B2gHiAdsB0gHZAeIB3AHHAbIB0QHJAeoB1AHAAeMB6wHUAeMB7AHtAcoB7gHtAewBygHVAewB7QG8AcoB5wHWAcEB5QG7Ab0B7wHfAcwB5gHgAcQBvgHgAegB8AG9AcMBxQHhAekBwwHxAeMB4wHeAfIB6QHcAdsB8wHQAcgB8wHIAdEB2gHSAeIBuAHdAboB2gHTAfQB6gHJAfUB7QHvAbwB1QH2AewB9wHWAecB7wHMAbwB8AHlAb0B3wHXAbcB+AHyAdcB8gHYAdcB4QHcAekBzgHQAfEB0AHzAfEBzgHxAcMBwwHjAfIB0QHqAfMB6gH0AfMB6wHjAfEB3QG4Ac8B9QH0AeoB6wHxAfQB2gH1AdIB9AH1AdoB5AHSAfUB+QHUAesB5AHTAYcB9QHUAfkB+gHsAfYB+gH7AewB7AH7Ae4B7QH8Ae8B1QHlAfYB5gHWAfcB/QHlAfABwgHoAecB8gH4AcMB+AHwAcMB2AH+AeEB2AHhAc8B8gH+AdgBzwHhAccB/gHcAeEB9AHxAfMB/gHyAd4B3AH+Ad0BxwHcAc8B/gHeAd0B3QHPAdwB9AH5AesB0wH5AfQB9QHTAeQB9QH5AdMByQHUAfUB7QHuAfwB7wH/Ad8B5gHoAeAB6AHmAfcB9wHnAegBAALXAd8BAALfAf8BAQL7AfoBAAL4AdcBAgLwAfgBAAICAvgBAwIBAvoB+gH2AQMC5QH9AfYB7wH8AQQC8AECAgUCAQIGAvsBBgIEAvsB7gH7AQQC7gEEAvwB/QEHAvYB/wHvAQQCAAL/AQgC/QHwAQUCBgIBAgMCBwIDAvYBBAIIAv8BCQIAAggCCQICAgACBwIGAgMCBAIHAggCBQIHAv0BBQICAgkCBgIHAgQCCAIHAgkCBwIFAgkCCgILAgwCDQILAgoCDAILAg4CDwIOAgsCEAINAhECDwINAhACDQIPAgsCEgITAhQCFQIUAhYCCgIMAhcCGAIZAhoCGgIOAg8CGgIPAhgCDwIQAhgCDAIOAhsCFQISAhQCDAIbAhwCHQIUAhMCHgINAgoCCgIfAh4CGQIgAhoCIQIZAhgCGgIiAg4CIwISAiQCJAISAhUCJQIQAhECJgInAhICDgIoAhsCEwISAicCHgIRAg0CGwIpAhwCDAIcAhcCFwIcAioCFAIdAhYCFwIrAgoCGgIgAiICGAIQAiECLAIkAhUCLAIVAi0CIgIoAg4CKAIuAhsCJQIRAi8CLgIpAhsCEQIeAi8CFQIWAjACMQIyAhMCHQITAjICHQIyAjMCHwIKAjQCCgIrAjQCLAI1AiQCEAIlAiECEgIjAiYCJwImAjYCLQIVAjcCOAIpAi4CFQIwAjcCHgI5Ai8CJwI6AhMCOQIeAjsCEwI6AjECHAIpAjwCFgI9AjACHgIfAj4CHQIzAhYCPwIgAhkCIgIgAkACIwIkAjUCQAIoAiICQQIsAi0CQgIuAigCLgJCAjgCJQIvAkMCLQI3AkQCRQI6AicCOAI3AikCLwI5AkMCOQI6AkMCOgI5AjECNwIwAj0CKgIcAjwCHgI+AjsCFgIzAj0CFwIqAisCPwIZAiECNQJGAiMCQQI1AiwCRwIjAkYCSAIjAkcCSQItAkQCSgI4AksCRQJMAjoCRAI3AkoCNwI4AkoCOgJMAkMCNwI9AjwCKQI3AjwCPQIzAk0CKwIqAk4CMgJPAjMCNAIrAlACIAI/AlECIAJRAkACIQJSAj8CRwJTAkgCQAJCAigCSQJBAi0CSAImAiMCQwJUAiUCNgJFAicCVQI5AjsCVQIxAjkCVgI7Aj4CVwIrAk4CPwJYAlECQAJRAlkCNQJaAkYCWgI1AkECUwJbAlICRwJbAlMCRgJcAkcCUwJSAl0CXQIhAiUCUwJeAkgCSwI4Al8CMgIxAlUCUAIrAlcCIQJdAlICXgJTAl0COAJCAl8CPAI9Ak0CVQI7AlYCKgI8AmACMwJhAmICYgJNAjMCUgJYAj8CYwJYAlICYwJSAlsCQAJkAkICRwJlAlsCZgJBAkkCZwJMAkUCNgImAmgCaQJWAj4CYAJOAioCTwJhAjMCWQJqAkACQQJmAloCZAJAAmoCXAJGAmsCXAJlAkcCbAJJAkQCVAJdAiUCXQJtAl4CNgJnAkUCSAJeAmgCbAJEAkoCSAJoAiYCSgJLAm4CbwIyAlUCYAI8Ak0CVwJOAnACcQIfAjQCcQI0AlACRgJaAmsCXwJCAnICbAJzAkkCdAJUAkMCdAJDAmcCQwJMAmcCZwI2AnUCdgI2AmgCWAJjAncCWQJRAlgCdwJjAlsCSQJzAmYCQgJkAnICVAJ4Al0CbgJLAl8CbgJsAkoCbQJoAl4CdgJ1AjYCVgJ5AlUCaQI+Ah8CWAJ3AlkCZAJqAnoCeAJUAnQCeAJtAl0CewJOAmACbwJPAjICdwJqAlkCawJaAnwCWgJmAnwCfQJbAmUCZAJ+AnICXAJ/AmUCfwKAAmUCgQKCAnMCbAKBAnMCgwKBAmwCbgJfAoQCbAJuAoUCeQKGAlUCTQJiAocChwJgAk0CTgJ7AnACaQIfAnECdwJbAogCiQJkAnoCXAKKAn8CcgKLAl8CgwJsAoUCdQJ0AmcCeQJWAmkCYgJhAowCVwKNAlACUAKOAnECegJqAncCfQKIAlsCfQJlAoACigJcAo8CXwKLAoQCdQKQAnQCYgKRAocCewJgAocCjQKSAlACZAKJAn4CjwJcAmsCdAKQAngCkwJtAngCgwKFApQCbQKVAmgCaAKWAnYCkAKGAnkCkQKXAocCjQJXAnACUAKSAo4CegJ3AokCZgJzApgCmQJ9AoAChAKLApoCmQKAApsCgAJ/ApsCnAJuAoQCnAKFAm4ChgJ1Ap0CnAKUAoUClgJ1AnYCbQKeApUClQKfAmgCdQKGApACnwKgAmgChgJvAlUCjAJhAk8CoQJPAm8CjgJpAnECiQJ3AqICfgKJAqMCZgKYAnwCpAKYAnMCiwJyAn4CpAJzAoICggKDAooCggKBAoMCmgKcAoQCfwKfApsClAKRAoMCnAKXApQCaAKgApYClAKXApECnAKlAocChwKXApwCkQJiAowCpQJ7AocCjAJPAqECogJ3AogCpgJ+AqMCfAKkAmsCpwKLAn4CigKPAoICkAKTAngCkQKKAoMCnAKaAqUClQKbAp8CqAJ5AmkCnQJvAoYCbwKgAqECjgKSAqkCkgKNAnACiAKqAqICiAJ9AqoCfAKYAqQCawKkAo8CmQKrAn0CpAKCAo8CrAKrAosCqwKaAosCqwKtApoCmQKtAqsCigKfAn8CmgKuAqUCkwKeAm0CkAKoApMCnQJ1ApYCkAJ5AqgCjAKvApECbwKdAqACaQKOAqgCowKJAqICfgKmAqcCqgJ9AqsCpwKsAosCrgKaAq0CrQKZAq4CmwKuApkCigKvAp8CigKRAq8CnwKvAqAClgKgAp0CoQKgAowCcAKpApICcAJ7AqUCcAKlArACqQKoAo4CpgKjAqICqgKrAqwCmwKpAq4CkwKoAp4CmwKVAqkCpQKuArACngKpApUCrwKMAqACcAKwAqkCrAKiAqoCsAKuAqkCqQKeAqgCogKsAqYCpwKmAqwCsQKyArMCsQKzArQCtQK2ArECtgKyArECswK3ArgCswKyArcCtQK5ArYCugK3ArICswK7ArQCsQK8ArUCuAK7ArMCsgK2Ar0CuAK3AroCuwK+ArQCuQK1ArwCsgK9AroCuQK9ArYCvwK4AroCvwK6AsACtAK8ArECwQK5ArwCvwK7ArgCwgK9ArkCwgK6Ar0CugLCAsACtALDArwCuwLEAr4CuwK/AsQCuQLBAsICxQK/AsACvgLGArQCvgLEAsYCvALDAsECwQLHAsICwwK0AsYCwQLDAscCyALEAr8CwALCAsUCxgLIAsMCyALHAsMCxQLCAscCxgLEAsgCxwLIAsUCxQLIAr8CyQLKAssCygLMAssCzALNAssCzgLKAskCzwLJAssCywLQAs8C0ALLAs0CzQLMAtECzgLSAsoC0wLMAsoC0wLRAswC1ALPAtAC0ALNAtUCygLSAtYCyQLPAtcC1wLOAskC1gLTAsoC0wLWAtgC0wLZAtEC2QLTAtgCzwLUAtcC1wLUAtoC0QLZAs0C2QLbAs0C2ALbAtkC3ALbAtgC3QLOAtcCzgLdAtIC1gLSAt4C2ALWAt4C1ALfAtoC1QLUAtAC1ALVAt8C1QLNAtsC4ALeAt0C3QLXAuEC3QLhAuAC3gLiAtgC1wLaAuEC2wLcAtUC3gLSAt0C3gLjAuIC5ALhAtoC3wLlAtoC5gLcAtgC5wLfAtwC1QLcAt8C4wLeAuAC2ALiAuMC4QLkAuAC2gLlAuQC3wLnAuUC4ALmAuMC5gLkAuUC5gLgAuQC5gLYAuMC5gLnAtwC5QLnAuYC"],"airway":["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VP/0Vaf+Mf/1VQ7/Yf9sVKD+T/9dVO/+Xf+SVA3/YP86VWf/Xf+3VWT/zf+AVZr+Yv/aVWv/Y/+RVIv+jf//VDb/k/9tVWr/hP+2VfD+gP+iVK/+6v9WVZ7+ov/aVM7+xf9+VXj/pP/9VJT+vf/9VOf+0v8wVcD+0P9BVTX/9f85VdT+8v9GVSH/if+9VcL+df/DVSv/M//3VSP/Q/8EVqb+PP8oVtn+av9fVr7+Qv8YViD/V/9lVk3/Sf//Vgb/Rf/zVj7/Wv8WV3X/U/8qVx3/Rf9HV1r/TP9aVxX/bf/WVXX/V/8vVmD/jv8GVnr/U/91Vuv+QP+cVg//ZP+CVn7/Vv/BVlf/UP/QVhL/a//DVtf+aP/dVpX/dP9nV/r+Yv89V57/Wv9vV3z/UP+AVzX/Vv+UV5f/Tf/KV1f/V/+yVxn/cv/HV77/Sf/xV3P/Tv/9Vz3/X/8YWKz/Wf8nWFP/R/9QWGD/cv9kWNP/Vv95WHH/S/+dWJn/Wf+pWEz/Zv+9WND/fP+1WDX/Wv/PWHT/TP/3WHT/ZP/4WOX/kv/UWBIAVf8iWaf/Yf8vWWv/WP93Wbj/YP82Wez/XP96WX//fP9zWVX/b/9tWfr/Wf+4WXn/TP+iWb7/cf++WQsAVv/YWaj/e//nWWf/ZP/gWQoAWv8YWov/Vf8wWsL/Zf8dWgkAUv9OWgAAS/9uWrj/ef9UWnb/V/+PWvf/b/+CWioAf/+fWoP/Xf+WWrb/Sf/QWsf/X/+tWi4AYv/nWh8AWP/1WtT/Sv8iWwoAUP8nW8b/cv8MW1YAWv9GWxkAT/9iW/L/Vf90WzkAT/+MW9r/Vf+1W/v/e/+HW6L/cP/dW7v/g//BW6j/UP/UW/3/YP8JXPT/ov/FVaf+lf9VVpH/n/+IVrD/r/+oVrP/tP8EV8T/oP9fV8n/qP8zV9f/fP+MV8f/ev8JWBP/e/8OWND/j/+QWTAAgv8qWjQAnf94WlMAev8DW5L/n//ZWmYAlv89W2UAhP+jW2oAq//NW5wAjP8VXLn/uf8ZXMb/AQAyVdD+x/99VXP/vf8lVqX/pP8iV/T+xf/TVtD/tv+BV+j/pP+wV9v/p//hV/P/sf8FWPH/pv9WWPr/m/+tWAUA1f9aWA0A2v+TWXH/1v8AWSgAjf80WR4Azf9YWTQAmP/sWUQAwv8SWk8Aov+hWmgAi/9mW3YA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50No9/B9+Nt4Cep8++995OR44+J37fd86ex67gF9C3A46diL++59AhuFCex8GOF4G+56Aup8/uh8/uJ66Pt86ut6BOF6JOx3D+58JOh2Ae59C+58MOlyGfd7/EmZPOxtG+R4K9ZvK+h0K/N28BWFIOJ2G+96NfJxKu11JPl4VaMHUKPkIY0nIOWJK7RbSuxkG+V4BRiEM+VwLedzQPFsM+1yJ+536BKGOflwWuJTR9dfKel1TPVkMvRzUPFgQu1qG1iqUP1iTjFWT/diTN9fRPZpR/BnafVFY/BMV+9ZWfJZXfdUTu1hY/JNYPVRX/BRRBKXYA6vVfJcKBiLZ/hIZ/tIGBSGVBCkaOpEZQZLZPRMXPBVTxKgXVMPRtueMCiTWCWuc/EyX/JSbP9Ae/8cdwArcvc1SgqbUxSkdAIySBCadfsvcQ/Kfv0Kev0gNQ+PbQzCZhC3e/oabPQ/cQY3aw2/NhKQYyO6cBk0c//OcxwrfA8TdAXQefYhfQsGegLjbwzFdw7aevsgdxDZfATofQjzfQrzfgUBfgUGfQT0d/codwPYfAQYewLkfgP5fP7rfvoBfQrxfQYMdAXPff0Nd/fYe/Ubexr6eeIRcyvkcx3Wff30","AAABAAIAAgADAAQABQAGAAIAAgABAAUABwABAAAAAwACAAYACAAJAAQAAgAEAAkAAgAJAAAACgAHAAAACwABAAcACAAMAAkADQAIAAQACAANAA4ADwAAAAkADQAEAAMAEAAKAA8AAAAPAAoABQABAAsAEQAMAA4ADAAIAA4ABgANAAMAEAAPAAkACQASABAACwAHABMABgAFABQABQALABQAEwAHAAoAFQATAAoAEQAOABYAFgAXABEAEQAYAAwADgANABYAEgAJAAwAFgAZABcAGAARABcADQAGABYADAAYABoAEgAMABoAEgAaABsAGwAQABIAGwAcABAAHAAKABAAHAAVAAoAHQAUAAsAHQALABMABgAUAB4AHwAZACAAHwAhABkAGQAhABcAIgAhACMAIgAXACEAJAAWAAYAGAAXACIAJQAYACIAGAAlABoAFQAcACYAEwAVACYAFAAnAB4AEwAmAB0AKAApAB8AHwAgACgAKQAjAB8AIQAfACMAFgAgABkAJAAgABYAGgAqABsAKgArABsALAAeACcAKwAcABsAHAArACYAJwAmACwAFAAdACYAJgAnABQALQAoACAAKAAtACkAIwAlACIAJQAuABoALgAvABoAKgAaAC8ALAAwAB4ALAAxADAALAAmACsALQAyACkAMwApADIAIwApADMAIwAzADQAIwA0ACUANQAuACUALwAuADUAMAAkAAYAMAAGAB4ALwAxACoAKwAxACwAMQArACoANgAtADcANgAyAC0ANwAtACAAJQA0ADUAJAAwADgAOAAwADkALwA1ADoAMAAxADoAOgAxAC8AOwA8AD0APAA2AD0ANgA3AD0APgAyADYANwAgACQAMgA+ADMAPgA/ADMAPwA0ADMAQAA1ADQAOQAwADoAQQA5ADoAQQA6ADUAOwA9AEIAQgA9ADcANgA8AD4APgBDAD8ARAA0AD8ARABAADQARQA4ADkARQA5AEEARQBBAEAANQBAAEEAOwBCAEYARgBHADsAOwBHADwANwAkAEIAPwBIAEQASQBIAD8ARQBAAEQARQAkADgASgBHAEYARwBLADwAPgA8AEsAQwBJAD8ATABEAEgATQAkAEUATABNAEUATABFAEQARgBOAEoATgBGAEIASgBLAEcASwBPAD4ATwBDAD4AQwBQAEkASABJAFAATgBRAEoAUgBRAE4AUwBRAFIAUQBUAEoAVQBLAEoAJABOAEIAVQBPAEsAVgBDAE8AQwBWAFAAVwBYACQAJABNAFcATABQAE0AUABMAEgAWQBSAE4AVQBKAFQAWgBPAFUAWwBWAE8AUABcAE0AVgBcAFAAUQBTAF0AWQBTAFIAXQBUAFEAVQBUAF4AWABOACQAWwBcAFYAVwBNAFwAUwBfAGAAYABhAF0AUwBZAF8AYgBfAFkAUwBgAF0AXgBUAF0AXgBaAFUAYwBaAF4AWQBOAFgAZABbAGUAXABbAGQAZABYAFcAVwBcAGQAXwBmAGAAYQBgAGYAYgBmAF8AYQBeAF0ATwBaAFsAWgBlAFsAZwBoAGIAaQBiAGgAYgBpAGYAZgBpAGEAYQBqAF4AawBiAFkAZwBiAGsAYwBeAGoAWgBjAGUAZQBYAGQAWABlAGwAYQBtAG4AbgBqAGEAawBZAFgAYwBsAGUAbwBwAFgAbwBYAGwAaABtAGkAbQBhAGkAYwBqAHEAYwBxAHIAcgBzAG8AYwByAGwAbAByAG8AaAB0AG0AaAB1AHQAaABnAHUAcQBzAHIAcABvAHYAdABuAG0AZwBrAHcAagBuAHgAeQBqAHoAawBYAHAAeQBxAGoAewB8AHAAdgB7AHAAdgBvAHMAdQB9AH4AbgB0AH8AcQB5AIAAdgBzAIAAgABzAHEAfgB0AHUAfwB0AH4AfQB1AGcAfQBnAHcAeAB6AGoAfQCBAH4AggBuAH8AgwBrAHAAegCEAHkAdgCAAHsAfgCFAH8AhQCCAH8AeABuAIIAfACDAHAAgQCGAH4AhgCFAH4AgQB9AHcAhwCIAIIAhAB6AHgAewCAAIkAgACKAIkAiwCMAIUAdwCGAIEAdwCNAIYAjQCFAIYAggCFAIcAeACCAI4AhAB4AI8AeACOAI8AkAB8AHsAgAB5AIoAkQCJAIoAiwCNAJIAjQB3AJIAjQCLAIUAkwCIAIcAlABrAIMAggCIAI4AgwB8AJAAeQCEAJUAigB5AJUAewCJAJEAlgCRAIoAlwCSAHcAhQCMAJgAmACHAIUAhwCYAJMAmQB7AJEAmgCKAJUAmgCWAIoAmwCcAJcAlwB3AJ0AmwCXAJ0AlwCLAJIAlwCeAIsAngCfAIsAjACLAJ8AnwCYAIwAlACDAKAAjgCIAKEAgwCiAKAAowCiAIMAjgCiAKMAgwCkAKMAowClAI4AhACPAJUAmQCQAHsApgCnAJEApgCRAJYAmwCoAJwAlwCcAJ4AqQB3AGsAqQBrAJQAqgCgAKEAoQCIAJMAoQCTAKoAoQCgAKIAjgChAKIApQCjAKQApQCPAI4AgwCQAKQAqwCQAJkAmQCRAKcAlgCsAKYArQCsAJYArQCuAKwArwCoAJsAsACoAK8AqQCvAJ0ArwCbAJ0AnACxAJ4AngCyAJ8AsgCzAJ8AnwCzALQAmAC0AKoAtACYAJ8AmACqAJMAtQCPAKUApAC1AKUAtgCPALcAuACkAJAAuACQAKsAjwC2AJUAlgCaALkAuQCtAJYApgC6AKcArAC6AKYArAC7ALoArgC7AKwAsACvALwAvQCoALAArwCpALwAnACoALEAnQB3AKkAsgCeALEAvgC0ALMAvwCUAKAAvwCgAKoAvgC/AKoAqgC0AL4AtQCkALgAtQDAALcAjwC1ALcAwQCrAJkAmgCVALYApwDBAJkAtgC5AJoArgCtAMIAwgCtALkArgDDAMQArgDFALsAuwDGALoAxQDHALsAxQDEAMcAyAC7AMcAyQCwALwAyQC9ALAAygCoAL0AsgCxAMsAywDMALIAsgC+ALMAsgDMAL4AtQC4AMAApwC6AMYAxADFAK4AuwDIAMYAzQDIAM4AyQDPANAA0QDPALwAvADPAMkAvACpANEAvQDJANIA0gDKAL0AygDTAKgA0wDUAKgAqADUALEA1ADLALEA1QCUAL8A1QC/AMwAzAC/AL4AuACrAMAAwACrANYA1wC3AMAAuQC2ANcAtgC3ANcA1wDYALkArgDCAMMAxgDBAKcAxgDIAM0AzgDIAMcA0QDZAM8A0ADSAMkA2QCpAJQAlADaANkA0wDbANQAlADVANwAzADUANsA1ADMAMsAzADbANUAuQDYAMIA3QDCANgA3QDeAMIAxADDAN8AwwDCAN8AzQDBAMYAxwDEAOAA2QDQAM8A2QDRAKkA0gDhANMA0wDKANIA3ADbANMAlADcAOIA3ADVANsA1gDXAMAA2ADXANYA2ADWAN0A1gCrAMEA1gDjAN0A4wDeAN0AwgDeAN8A1gDBAM4AzQDOAMEAzgDHAOAA4ADEAN8A2QDkANAA0gDQAOEA2gDiAOUA4gDhAOUA2gCUAOIA4QDcANMA1gDOAOMA3gDjAOAA3gDgAN8A4ADjAM4A0ADkAOEA2gDlANkA5QDhAOQA3ADhAOIA2QDlAOQA5gDnAOgA6QDnAOoA6wDoAOcA6QDsAOcA5gDoAO0A5wDmAOoA5gDuAOoA7ADrAOcA7ADpAO8A8ADmAO0A7gDxAOoA5gDwAO4A8QDuAPIA7QDoAOsA7wDpAPMA8AD0AO4A6gDxAOkA7gD1APIA7gD2APUA7gD0APYA7AD3AOsA6wD4AO0A7QD5APAA7wDzAPoA6QD7APMA8QD7AOkA+wDxAPIA9QD8APIA9QD2APwA+wDyAP0A8gD8AP0A/gD/AAABAQECAf4AAwEEAQUBBQEEAQYBBgEHAQUBBQEHAQMB6wD3APgACAH4APcA7AAJAfcA7AAKAQkB+QDtAPgACwHwAPkA9ADwAAsB9AAMAfYA9gANAfwA/QD8AA0B/QAOAfsADgH9AA8BDQEQAf0A/wD+AAIBEQEAAf8A/gAAAQEBEgEBAQABEwEUARUBAwEWARcBBwEYAQMBGQEWAQMBGAEZAQMBFAEaARsBCgHsAO8A+AAIAfkA+QAcAQsB7wD6AAoBCwEMAfQAHQEKAfoAHgERAf8AHwEAAREB/wACASABIAECASEBIgEOAQ8BDwH9ACMBHwESAQABAgEBASQBFQEUASUBGwElARQBEwEVASYBJwEXARYBKAEWARkBFAETASkBFAEpARoBBgEqAQcBGgEpASsB9wAJAQgBCAEJAQoBHAH5AAgBCgEsAQgBCgEtASwBCgEdAS0BLgH2AAwBLgENAfYALwH6APMAEAEwASMBDgEiAfsA+wAiAfMAIwH9ABABMQEiAQ8BMgEBARIBDwEjATEBIwEgATEBMgEzASQBMQEgASEBAgE0ASEBNQE0AQIBAgEkATUBMQEhATYBNwEmARUBAwEXAQQBGwEEARcBBAEbAQYBLAEcAQgBLAEtARwBHAEtATgBHAE4AQsBOQE4AS0BLQEdATkBOgEMAQsBOgELATgBDAE6AS4BLwE7AfoAHQH6ADsBPAENAS4BPAEQAQ0B/wA9AR4BHgE9AT4B/wAgAT8BPQH/AD8BIgFAAfMAAQEyASQBHwEyARIBNQEkATMBMQE2AUEBIQE0ATYBQgExAUEBJQE3ARUBFgEoAScBEwEmAUMBGwEaAQYBGgEqAQYBGAEHAUQBBwEqAUQBRQFGAUcBOQEdAToBOAE5AToBEAE8AUgBPwFJAT0BSQFKAT0BSgE+AT0BEQFLAR8BLwHzAEwBMAE/ASABMAEgASMBSwEyAR8BNAE1ATYBMQFCASIBTQFBATYBGwEXASUBJwElARcBNwFOASYBTwEoARkBGgErASoBKQETAVABUAETAUMBGQEYAU8BKgErAVEBKwEpAVABRAFSARgBUQFEASoBUwFUAUcBUwFHAUYBRQFHAVUBHQE7AToBOgE7AVYBLgE6AVcBVwE8AS4BOwEvAVYBWAFWAS8BVwFWATwBPAFWAUgBWQFaAS8BMAEQAUgBHgE+AVsBEQEeAVsBPgFKAVsBEQFbAUsBXAFdATIBXgE1ATMBXwHzAEABQgFAASIBNgFgAU0BNgE1AWABXwFAAUIBYQFCAUEBJwFiASUBTgFDASYBTwEYAVIBUgFEAWMBUwFjAUQBUQFTAUQBUQFUAVMBRgFjAVMBYwFGAUUBZAFVAUcBZAFHAVQBVwE6AVYBWgFYAS8BZQFIAVYBZgFIAWUBZgEwAUgBWwFKAVwBZwFJAT8BSwFcATIBWwFcAUsBPwEwAWgBaAFnAT8BXQFpATIBaQEzATIB8wBfAUwBYAE1AV4BTQFgAWoBYQFfAUIBQQFNAWEBTQFrAWEBYgEnASgBYgE3ASUBTgE3AWwBTwFSAW0BbgErAUMBKwFQAUMBUQErAW4BbQFSAWMBbQFjAUUBbwFtAUUBVgFYAVoBZwFKAUkBXQFcAUoBMAFwAWgBZwFdAUoBcAEwAWYBZwFpAV0BagFgAV4BawFNAWoBXwFhAXEBYQFyAXEBYQFrAXIBcQFyAXMBcwFyAXQBbAE3AWIBdQFiASgBbAF2AU4BTgF2AUMBdgF3AUMBbgFDAXcBbgFUAVEBZAFUAW4BRQFVAXgBWgFZAXkBaAF6AWcBewF6AWgBaQFnAXoBfAEzAWkBXgEzAXwBTAFfAXMBagFyAWsBagF9AXIBXwFxAXMBcgF9AXQBcwF0AX4BfgF0AX8BfwGAAX4BgAF1AYEBgAFiAXUBdQEoAYIBbgGDAWQBbwGEAW0BZAGDAVUBgwF4AVUBbwFFAXgBWgFlAVYBWgGFAWUBWgF5AYUBZQGFAWYBeQGGAYUBhgFmAYUBewFmAYYBaAFwAXsBWQGHAXkBZgF7AXABewGIAXoBfAFpAXoBWQEvAUwBiQFeAXwBagFeAYkBagGKAX0BfwF0AYsBjAFzAX4BgAGMAX4BjAGAAYEBfwGNAYABjQFiAYABjQFsAWIBgQF1AYIBjQGOAWwBjgGPAWwBKAFPAYIBggFPAZABdwGRAW4BkQGDAW4BkgGDAZEBbwGSAYQBbwF4AZIBgwGSAXgBegGIAXwBWQFMAZMBigFqAYkBlAGKAYkBfQGKAZUBcwGMAUwBfQGVAXQBlQGLAXQBiwGVAZYBgQGQAYwBggGQAYEBbAGXAXYBjwGXAWwBTwFtAZgBTwGYAZABbQGEAZkBmQGEAZEBdwGXAZEBkgGRAYQBhgGaAXsBhgF5AYcBhgGHAZoBWQGTAYcBhwGTAZsBmwGaAYcBiAF7AZoBlAF8AYgBfAGUAYkBigGcAZUBfwGOAY0BbQGZAZgBlwF3AXYBmAGZAZ0BnQGZAZ4BmQGRAZcBmgGbAZ8BmgGfAYgBiAGfAZQBmwGTAaABlAGhAYoBjgGLAZYBfwGLAY4BogGXAY8BlwGeAZkBngGXAaIBkwGjAaABkwFMAaMBlgGVAZwBTAGMAZABnQGeAaQBngGiAaUBnwGbAaYBmwGgAaYBlAGfAaYBlAGmAaEBpwGhAaYBpwGcAaEBowGoAaABoQGcAYoBlgGpAY4BnQGqAZgBpQGiAasBnQGkAaoBpAGeAaUBqAGnAaABoAGnAaYBqAGsAacBqAGjAUwBqAFMAa0BnAGuAakBqQGWAZwBrwGOAakBjgGvAbABTAGQAZgBqwGiAY8BpQGrAbEBsgGzAaUBpQGzAaQBrgGnAawBpwGuAZwBsAGPAY4BjwGwAasBqgFMAZgBsAGxAasBpAG0AaoBsgGlAbEBrAGoAa4BqAG1Aa4BtQGoAa0BrgG2AakBtgGvAakBtwGtAUwBqgG4AUwBsQG5AbIBugG5AbEBpAGzAbQBsgG5AbsBvAG7AbkBuwG9AbMBuwGzAbIBvAG+AbsBrgG1AbYBtgG1Ab8BvwG1Aa0BtgHAAa8BtwFMAbgBsAHAAcEBrwHAAbABsAHBAboBsAG6AbEBswG9AbQBtAG9AcIBuwG+Ab0BvgG8AcMBxAG/Aa0BvwHEAbYBtgHEAcUBtgHFAcABxgHBAcABuQHHAcgByQG4AaoBtAHJAaoBuQHIAbwByQG0AcIBwgG9Ab4BvAHIAcMBwwHIAcoBvgHDAcIBrQHLAcQBywGtAbcBxgHFAcQBwAHFAcYBwQHGAcwBugHHAbkBxwHNAcgBzgHCAcMBzwHGAcsBywHGAcQBtwHPAcsBzAG6AcEB0AG4AckBygHOAcMBwgHOAckB0QHGAc8BxwG6AcwByAHSAcoBzwG3AbgBzwG4AdEB0QHMAcYBuAHTAdEBzAHRAdMBzAHTAdQB0wG4AdABzAHNAccB0gHIAc0B1AHTAdUB1AHWAcwB1QHTAdAB1gHNAcwB1gHSAc0B0AHJAc4B1QHWAdQB0AHXAdUB1QHXAdYB2AHWAdcB2AHSAdYBzgHYAdcBzgHXAdABygHYAc4BygHSAdgB2QHaAdsB2wHcAdkB3AHbAd0B3gHcAd0B2wHfAd0B3QHfAeAB4QHiAeMB5AHlAeYB5wHfAdsB6AHfAekB4AHqAd0B4AHfAegB3QHqAd4B6wHqAeAB4AHsAesB7AHtAesB6wHtAe4B7wHrAe4B7QHwAeIB4QHuAeIB7QHiAe4B4QHvAe4B4gHwAeMB8QHhAeQB4QHjAeQB8gHlAeMB4wHlAeQB5QHyAfMB8wH0AeUB5QH0AeYB9AHzAfUB9gH3AfQB9QH2AfQB9QH4AfYB+QH6AfYB9gH4AfkB+QH4AfsB+gH5AfwB/AH5AfsB+wH9AfwB/QH7Af4B/wEAAgECAAL+AQICAwL/AQECAAIEAgECAQIEAgMCBAIAAgICAgIFAgQCAgIGAgUCBwIGAgICCAIJAgUCBgIIAgUCCgIIAgsCCQIMAg0CCQIIAgwCCgIMAggCDgIKAgsCDwIMAhACCgIQAgwCEAIKAg4CEAIOAhECEAISAg8CDwISAhMCEAIRAhICEQIUAhICFQISAhYCFwIWAhQCFAIWAhICGAIWAhcCGQIaAhYCGAIZAhYCGQIYAhsCGAIcAhsCGQIdAhoCHQIZAh4CGQIbAh4CGwIfAh4CGwIgAh8CHwIgAiECHwIhAiICIwIkAiICIgIhAiMCIQIlAiMCJgIkAiMCJgInAiQCJgIoAicCJwIoAikCKgIrAikCKQIoAioCLAItAioCKgIuAiwCLAIuAi8C3wHnAekB3gEwAtwB6AExAuAB4AExAuwB6wHeAeoB6wHvAd4B7QHsATIC7QEyAjMC7QEzAvAB8QHvAeEBNALjAfAB5AHmAfEB8gE1AvMB8gE2AjUCNwL1AfMB8wE1AjcC9AH3AfEB8QHmAfQB9wE4AvEB9wH2ATgC+gE4AvYB/AE4AvoB/AH9ATgCOQL+AfsB/QH+Af8B/wH+AQACOAL9AQMC/wEDAv0BBQINAgMCAwIEAgUCBQIJAg0CBgILAggCDwITAg0CDwINAgwCOgIRAg4CEwISAhUCGgIVAhYCEwIVAhoCOwIYAhcCHAIYAjsCHAI8AiACHwIdAh4CIAIbAhwCHQIfAj0CIAI+AiECIgI9Ah8CIgIkAj0CPQIkAisCJgIjAj8CPwIjAiUCJwIrAiQCPwIoAiYCKwInAikCKgIoAkACKwIqAi0CLgIqAkACLgJBAi8CQgIsAi8CQwJCAi8CRALaAdkB2gHnAdsB2gFFAucBMQLoAUYC6AHpAUYCMALeAUcC3gHvAUcC8AEzAkgCRwLvAfEBSAI0AvAB4wE0AvIBNQJJAjcC8QE4AkcC9QE3AkoC+AH1AUoC+wH4AUsCTAL7AUsCOQL7AUwCOQJNAv4B/gFOAgICTwJOAv4BOAIDAkcCTgIHAgICAwINAlACCwIGAlECUgILAlECDgILAlICUgJTAg4CUAINAhMCEQJUAhQCFAJUAhcCFwJUAjsCVAJVAjsCOwI8AhwCPAJWAiACIAJWAj4CIQI+AiUCKwIdAj0CKAI/AlcCHQIrAi0CQwIdAi0CVwJAAigCLAJCAi0CLwJBAlgC2QHcATAC5wFFAlkCMQIyAuwBWgIyAjEC8gE0AjYCSQJKAjcCSgJLAvgBWwJLAkoCTAJNAjkCTwL+AU0CUAJHAgMCUQIGAgcCXAJTAlICDgJTAjoCEwIaAlACEQJdAlQCOwJVAl4COwJeAjwCGgIdAkMCPgJfAiUCGgJDAlACPwIlAmACQAJXAmECQAJBAi4CQwItAkICYgJDAi8CRAJFAtoBMAJjAtkBYwJEAtkBWQLpAecBZAIyAloCMwIyAmQCZQIwAkcCRwJQAmUCZgI1AjYCZwJoAksCaAJMAksCTAJpAk0CTgJPAmoCawJOAmoCBwJOAmsCUQJcAlICUwJsAjoCbAIRAjoCVQJUAl0CYAIlAl8CYAJXAj8CYAJhAlcCQAJhAm0CQAJtAkECLwJYAmICZQJjAjACbgLpAVkCRgLpAW4CMQJGAloCZgJJAjUCWwJnAksCaQJPAk0CXQIRAmwCbwJdAmwCVQJdAnACcQJVAnACXgJVAnECVgI8AnICcwJWAnICcwI+AlYCdAJgAl8CdQJBAm0CYgJYAnUCQwJiAnYCdwJuAlkCeAJaAkYCZAJaAnkCegIzAmQCMwJ6AkgCSAJ7AjQCWwJKAkkCTAJoAmkCawJRAgcCfAJlAlACbAJ9Am8CbwJwAl0CcgI8Al4CfgJyAl4CcwJfAj4CcwJ/Al8CgAJhAmACgQJtAmECdQJYAkECdgJQAkMCggJEAoMCRAKCAoQChAJFAkQCRAJjAoUChAKGAkUChQJjAmUChgJZAkUCRgJuAngChwJaAngCNAJ7AogCNAKIAjYCiAJmAjYCSQJmAlsCiQJlAnwCigJqAk8CagKKAosCiwJrAmoCUQKMAo0CXAJRAo0CjgJTAlwCUwJ9AmwCfAJQAnYCfgJeAnECdgKPAnwCcgJ+ApACXwJ/AnQCdAKAAmACbQKBAnUCRAKFAoMCdwJZAoYCkQJ3AoYCkgJ4Am4ChwJ5AloCeQJ6AmQCkwJIAnoCSAKTAnsCWwJmApQClQJPAmkClQKKAk8CjAJrAosCUQJrAowCjgJcAo0CjgJ9AlMClgKQAn4CkAKXAnIClwJzAnICgAKBAmECmAKPAnYCdQKBApkCmgJiAnUChgKEAoICdwKSAm4CmwJmAogCZgKbApQClAKcAlsCnAKdAmcCZwJbApwCnQJoAmcCaQJoAp4CnwKeAmgCaQKeApUCigKgAosCjgKhAn0CfQKhAqICogJvAn0CogKjAm8CpAJxAnACcQKWAn4CpQJzApcCpQJ/AnMCmgJ1ApkCggKRAoYCiQKFAmUChwKmAnkCeQKmAnoCkwJ6AqcCkwKnAnsCqAKpAokCqgKIAnsCqgKbAogCiQKrAqgCiQJ8AqsCnQKfAmgCrAKVAp4CjQKMAq0CjQKhAo4CrgKvAnwCowKkAm8CbwKkAnACcQKkArACsQJ/AqUCdAJ/ArICsQKyAn8CswKAAnQCtAKPApgCgQKAArMCgQKzApkCYgKaArUChQK2AoMCtwK2AoUCiQK3AoUCkgKHAngCiQK4ArcChwKSArkCegKmAroCpwJ6AroCpwK7AnsCqgJ7ArsCqgK8ApsClAK9ApwCvgKdApwCfAK/AqsCvgKfAp0CfALAAr8CngLBAqwCnwLBAp4ClQKsAooCigKsAqACwAJ8AsICwwKMAqACjAKLAqACwgJ8Aq8CwgKvAsQCwwKtAowCjQKtAqECoQLFAqICrgJ8Ao8CxgKkAqMClgJxArACjwLHAq4CyAKuAskCxwLJAq4CygKWArAClgLLApACywKXApACzAKXAssClwLMAqUCzQLHAs4CxwKPAs4CtALOAo8CsgKzAnQCzwK0ApgCmgKZAtACzwKYArUCYgK1ApgCmAJ2AmICtgLRAoMCdwLSArkCkQLSAncCdwK5ApIC0wKHArkC0wKmAocCuAKJAtQCugKmAtUC1QKnAroCiQKpAtQC1gK7AqcCqQKoAtcCqALYAtcCqgK7ArwC2AKoAtkC2QLaArwCvALaApsC2gLZAtsC2gKUApsCqALbAtkCqAKrAtsCvQKUAtoCqwLcAtsCnAK9Ar4CvwLcAqsCvwLAAt0CrALBAt4C3wKsAt4C3wKgAqwCwALCAt4C3gLCAt8C4AKgAt8C3wLCAsQCxALgAt8C4ALDAqACxAKvAuECrQLDAuECrQLhAuICoQKtAuICxQKhAuICrwLjAsUCrwKuAuMC4wLkAsUC5AKiAsUCrgLIAuMC5AKjAqIC5ALGAqMC5ALIAsYCxgLIAuUCxgKwAqQCyQLmAsgC5QLIAuYCygKwAuYCyQLHAucCygLLApYC5wLoAssC5wLLAsoC6ALMAssC5wLHAs0CzgLpAs0CzALpAqUC6gKxAqUCzgLrAukCzgK0AusCsgKxAuwCtALtAuwC7gKyAuwCswKyAu4C0AKzAu4CswLQApkCzwLtArQC7wLQAu4CzwLvAu0CtQKaAtACggKDAvAC8ALSApEC8QK3AvICuALyArcC8gK4AtMC0wLSAvIC0wK5AtICuALUAtMC0wLUAtUC0wLVAqYC1ALWAtUC1gKnAtUC1gLUAqkC1wK7AtYCqQLXAtYCvAK7AtcC1wLYArwCvALYAtkC2gLbAr0C3AK9AtsC3ALdAr4CvQLcAr4C3AK/At0C3QKfAr4CnwLdAvMC8wLdAsACnwLzAsEC3gLBAvMCwALeAvMCwwLgAuECxALhAuAC4gLhAsUC4QKvAsUC4wLIAuQCsALGAuYCxgLlAuYCygLmAskCygLJAucC5wLNAugC6ALpAswCzQLpAugC6QLrAuoCpQLpAuoC6gLrArQCtALsAuoC7AKxAuoC7QLuAuwC7QLvAu4CzwK1Au8C0ALvArUC8AKRAoICtwLRArYCtwLxAtEC8ALRAvEC0gLwAvEC8QLyAtIC0QLwAoMC"]};

  const methods={preparation:prep,ecg:electro,pressure,temperature:thermal,pulmonary,ocular,chemistry};
  function draw(canvas,id,progress){
    if(!canvas||!methods[id])return;
    const t=clip(progress,0,.999999),cuts=id==='preparation'?[0,4/14,8/14,1]:[0,1/3,2/3,1];
    const stage=t<cuts[1]?0:t<cuts[2]?1:2;
    const f=new Frame(buffer(canvas),t);
    const seconds=t*(id==='preparation'?14:15),cycle=(seconds+.87)%4.35;
    f.blink=id==='ocular'&&stage===2?0:ease(1-Math.abs(cycle-2.9)/.115);
    f.breath=.00125*Math.sin(seconds*1.42);
    methods[id](f,stage,(t-cuts[stage])/(cuts[stage+1]-cuts[stage]));f.finish();
  }
  function drawPerson(canvas,view){
    const f=new Frame(buffer(canvas),0);
    f.camera(view.target,view.height,view.yaw,view.pitch,.5,.50);f.body('figure');f.finish();
  }
  const api={decodeSubject,setSubject,draw,drawPerson};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.VitalsIllustrations=api;
})();
