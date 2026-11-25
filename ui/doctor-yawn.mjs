// Local idle presentation only. No audio, sensors, or health inference.
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const ease=n=>{const t=clamp(n);return t*t*t*(t*(t*6-15)+10);};
const neutral=()=>({active:false,cover:0,jaw:0,face:0,preview:false});
export class DoctorYawn {
 constructor({seed=Math.floor(Math.random()*0xffffffff)}={}){this.seed=(seed>>>0)||1;this.enabled=false;this.reset();}
 random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/0x100000000;}
 reset(){this.active=false;this.elapsed=0;this.wait=20+this.random()*14;this.cancelled=null;this.last=neutral();this.preview=false;}
 start(preview=false){if(this.active)return false;this.active=true;this.elapsed=0;this.cancelled=null;this.preview=preview;return true;}
 sample(dt,enabled){
  const step=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
  if(!enabled&&this.enabled)this.wait=20+this.random()*14;
  this.enabled=enabled;
  if(!enabled&&this.active&&!this.cancelled)this.cancelled={...this.last,time:0};
  if(this.cancelled){
   const c=this.cancelled;c.time+=step;
   this.last={active:c.time<.85,cover:c.cover*(1-ease(c.time/.85)),jaw:c.jaw*(1-ease(c.time/.25)),face:c.face*(1-ease(c.time/.35)),preview:this.preview};
   if(!this.last.active){this.active=false;this.cancelled=null;this.wait=55+this.random()*45;this.last=neutral();}
   return this.last;
  }
  if(!this.active){if(!enabled)return this.last=neutral();this.wait-=step;if(this.wait>0)return this.last=neutral();this.start();}
  this.elapsed+=step;const t=this.elapsed;
  if(t>=6){this.active=false;this.wait=55+this.random()*45;return this.last=neutral();}
  // The fist reaches the face before the jaw opens, and stays until it closes.
  const cover=ease(t/1.25)*(1-ease((t-4.55)/1.4));
  const jaw=.82*ease((t-1.35)/.9)*(1-ease((t-3.5)/.9));
  const face=ease((t-1.2)/.6)*(1-ease((t-4.0)/.7));
  return this.last={active:true,cover,jaw,face,preview:this.preview};
 }
}
