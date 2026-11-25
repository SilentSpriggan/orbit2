import { DoctorYawn } from './doctor-yawn.mjs';
import { DoctorWatchCheck } from './doctor-watch.mjs';
// Pure motion state used by both WebGL and software 3D rendering.
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,Number.isFinite(n)?n:0));
const rest=()=>({jaw:0,rounding:0,spread:0,press:0,fricative:0,tongue:0,blink:0,yaw:0,pitch:0,roll:0,brow:0,cheek:0,squint:0,gazeX:0,gazeY:0,headYaw:0,headPitch:0,headRoll:0,breath:0,shoulderLeft:0,shoulderRight:0,torsoTurn:0,bodyShift:0,idleLooking:false,yawning:false,yawnCover:0,yawnPreview:false,watchChecking:false,watchRaise:0,watchPreview:false,gestureLeft:0,gestureRight:0,gestureBeat:0,preview:false,speaking:false});
const ease=n=>{const t=clamp(n);return t*t*t*(t*(t*6-15)+10);};
// A glance has an eye movement, a delayed neck turn, a hold, and a return.
// Its clock advances only while visible and idle; no background catch-up turns.
export class DoctorIdleLook {
  constructor(seed=Math.floor(Math.random()*0xffffffff)){this.seed=(seed>>>0)||1;this.enabled=false;this.lastSide=0;this.reset();}
  random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/0x100000000;}
  reset(){this.elapsed=0;this.phase='forward';this.duration=2.1+this.random()*1.3;this.yaw=0;this.pitch=0;}
  advance(){
    if(this.phase==='forward'){
      let side=this.random()<.5?-1:1;if(side===this.lastSide&&this.random()<.75)side=-side;this.lastSide=side;
      this.yaw=side*(.19+this.random()*.09);this.pitch=this.random()<.7?.02+this.random()*.05:-.015-this.random()*.025;
      this.phase='look';this.duration=1.05+1.1+this.random()*1.5;
    }else if(this.phase==='look'){this.phase='return';this.duration=1.05;}
    else{this.phase='forward';this.duration=2.5+this.random()*3.3;}
  }
  sample(dt,enabled=true){
    if(!enabled){if(this.enabled)this.reset();this.enabled=false;return {headYaw:0,headPitch:0,attentionYaw:0,attentionPitch:0};}
    this.enabled=true;this.elapsed+=clamp(dt,0,.1);
    while(this.elapsed>=this.duration){this.elapsed-=this.duration;this.advance();}
    if(this.phase==='forward')return {headYaw:0,headPitch:0,attentionYaw:0,attentionPitch:0};
    const returning=this.phase==='return',looking=this.phase==='look';
    const eyes=looking?ease(this.elapsed/.22):returning?1-ease(this.elapsed/.25):0;
    const head=looking?ease((this.elapsed-.14)/.86):returning?1-ease((this.elapsed-.10)/.90):0;
    return {headYaw:this.yaw*.64*head,headPitch:this.pitch*.62*head,attentionYaw:this.yaw*eyes,attentionPitch:this.pitch*eyes};
  }
}
// Explaining gestures: while the avatar talks, one hand (sometimes both) rises to
// chest height, holds with small beats on stressed syllables, then lowers.
export class DoctorGesture {
  constructor(seed=Math.floor(Math.random()*0xffffffff)){this.seed=(seed>>>0)||1;this.lastSide='left';this.reset();}
  random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/0x100000000;}
  reset(){this.active=false;this.elapsed=0;this.duration=0;this.side='right';this.kind=0;this.lastKind=-1;this.wait=.9+this.random()*1.6;this.last={left:0,right:0,kind:0,time:0};}
  start(side,kind){
    if(this.active)return false;
    const r=this.random();this.side=side||(r<.22?'both':(this.lastSide==='left'?'right':'left'));if(this.side!=='both')this.lastSide=this.side;
    // 0 present (palm up, out to the side), 1 explain (toward the centre), 2 emphasise (lower, firmer beats). Two hands always explain.
    let pick=Math.floor(this.random()*3);if(pick===this.lastKind)pick=(pick+1)%3;this.kind=Number.isInteger(kind)?kind:this.side==='both'?1:pick;this.lastKind=this.kind;
    this.active=true;this.elapsed=0;this.duration=2.2+this.random()*1.8;return true;
  }
  sample(dt,enabled){
    const step=clamp(dt,0,.1);
    if(!this.active){
      if(!enabled)return this.last={left:0,right:0,kind:this.kind,time:0};
      this.wait-=step;if(this.wait>0)return this.last={left:0,right:0,kind:this.kind,time:0};
      this.start();
    }
    this.elapsed+=step;
    // Speech stopped: lower the hand now instead of finishing the hold.
    if(!enabled&&this.elapsed<this.duration-.7)this.duration=this.elapsed+.7;
    if(this.elapsed>=this.duration){this.active=false;this.wait=2.2+this.random()*4;return this.last={left:0,right:0,kind:this.kind,time:0};}
    const up=ease(this.elapsed/.62)*(1-ease((this.elapsed-(this.duration-.7))/.7));
    return this.last={left:this.side!=='right'?up:0,right:this.side!=='left'?up:0,kind:this.kind,time:this.elapsed};
  }
}
// The pinned ElevenLabs WebRTC client emits 25 ms PCM16 playback samples.
// Keep only their level. Silence expires locally, with no retained audio buffer.
export class DoctorSpeechSignal {
  constructor(){this.reset();}
  reset(){this.level=0;this.at=-Infinity;this.received=false;}
  pushPCM(base64,now){
    if(typeof base64!=='string'||!base64.length||base64.length>8192||!Number.isFinite(now))return false;
    let bytes;try{bytes=atob(base64);}catch{return false;}
    if(!bytes.length||bytes.length%2)return false;
    let energy=0;
    for(let i=0;i<bytes.length;i+=2){let n=bytes.charCodeAt(i)|(bytes.charCodeAt(i+1)<<8);if(n&0x8000)n-=65536;energy+=(n/32768)**2;}
    this.level=clamp((Math.sqrt(energy/(bytes.length/2))-.004)*6.5);this.at=now;this.received=true;return true;
  }
  read(now){return this.received?(now>=this.at&&now-this.at<.045?this.level:0):null;}
}
const previewSyllables=[[.08,.18,.58],[.37,.14,.42],[.61,.23,.72],[1.02,.15,.5],[1.27,.20,.64],[1.76,.17,.46],[2.02,.26,.66],[2.47,.18,.53],[2.77,.15,.4]];
export class DoctorMotion {
  constructor({idleSeed}={}){this.idleLook=new DoctorIdleLook(idleSeed);this.yawn=new DoctorYawn({seed:idleSeed===undefined?undefined:idleSeed^0x5f12ad3b});this.watch=new DoctorWatchCheck({seed:idleSeed===undefined?undefined:idleSeed^0x7d30ace1});this.gesture=new DoctorGesture(idleSeed===undefined?undefined:idleSeed^0x2b61f0d5);this.pointer={yaw:0,pitch:0,active:false};this.follow=0;this.followYaw=0;this.followPitch=0;this.slowAmp=0;this.nod=0;this.gestureLeft=0;this.gestureRight=0;this.mode='idle';this.voice=false;this.paused=false;this.visible=false;this.amplitude=0;this.velocity=0;this.envelope=0;this.articulation=.5;this.press=0;this.gazeX=0;this.gazeY=0;this.previewUntil=0;this.previewStart=0;this.blinkAt=2.4;this.phrase=0;this.presence=0;this.posture={headYaw:0,headPitch:0,headRoll:0,shoulderLeft:0,shoulderRight:0,torsoTurn:0,bodyShift:0};}
  /* Where the visitor's pointer is, as a head turn toward it (radians). */
  setPointer(yaw,pitch,active){this.pointer.yaw=clamp(yaw,-.62,.62);this.pointer.pitch=clamp(pitch,-.2,.26);this.pointer.active=Boolean(active);}
  setMode(mode,voice=false){this.mode=mode;this.voice=voice;this.previewUntil=0;}
  resetSpeech(){this.amplitude=0;this.velocity=0;this.envelope=0;this.press=0;this.gazeX=0;this.gazeY=0;this.previewUntil=0;this.phrase=0;this.presence=0;this.idleLook.reset();this.yawn.reset();this.watch.reset();this.gesture.reset();this.follow=0;this.followYaw=0;this.followPitch=0;this.slowAmp=0;this.nod=0;this.gestureLeft=0;this.gestureRight=0;for(const key in this.posture)this.posture[key]=0;}
  setVisible(visible){this.visible=visible;if(!visible)this.resetSpeech();}
  setPaused(paused){this.paused=paused;if(paused)this.resetSpeech();}
  preview(now){if(!this.paused&&this.visible){this.previewStart=now;this.previewUntil=now+3.2;this.gesture.wait=.15;}}
  previewYawn(now){if(this.paused||!this.visible||!['idle','text'].includes(this.mode)||now<this.previewUntil||this.watch.active)return false;return this.yawn.start(true);}
  /* Starts a specific gesture now (used for previews and checks). Side: left, right or both; kind 0–2. */
  previewGesture(){return false;}
  /* The watch-check animation is turned off: the avatar never raises its wrist to look at the watch. */
  previewWatch(){return false;}
  sample(now,dt,volume=0,centroid=.5){
    if(!this.visible||this.paused)return rest();
    const preview=now<this.previewUntil,speaking=(this.mode==='speaking'&&this.voice)||preview;
    const step=clamp(dt,0,.1),elapsed=now-this.previewStart;
    // Distinct syllables include complete closures and a longer mid-phrase pause.
    let demo=0;for(const [start,duration,peak]of previewSyllables){const phase=(elapsed-start)/duration;if(phase>0&&phase<1)demo=peak*Math.sin(phase*Math.PI);}
    const target=preview?demo:(speaking?clamp((volume-.025)/.9)*.82:0);
    // One critically damped controller avoids stacking two slow release filters.
    this.envelope=target;
    const frequency=68,error=this.amplitude-target,c=this.velocity+frequency*error,decay=Math.exp(-frequency*step);
    this.amplitude=clamp(this.envelope+(error+c*step)*decay);
    this.velocity=(this.velocity-frequency*c*step)*decay;
    if(target===0&&this.amplitude<.0015){this.amplitude=0;this.velocity=0;}
    const tone=preview?clamp(.5+.32*Math.sin(elapsed*4.1)) : clamp(centroid);
    this.articulation+=(tone-this.articulation)*(1-Math.exp(-step/.11));
    // Compression follows falling audio energy, then releases with the next opening.
    // Spectrum shapes are approximate articulation, never inferred phoneme timing.
    const closure=speaking?clamp(-this.velocity*.12)*(1-this.amplitude)*.24:0;
    this.press+=(closure-this.press)*(1-Math.exp(-step/.055));
    const idle=!speaking&&(this.mode==='idle'||this.mode==='text'),yawn=this.yawn.sample(step,idle&&!this.watch.active),watch=this.watch.sample(step,false);
    // Head follows the pointer (fully when idle, partly while talking); eyes lead, the neck follows.
    const followTarget=this.pointer.active&&!yawn.active?(speaking?.55:1):0;
    this.follow+=(followTarget-this.follow)*(1-Math.exp(-step/.35));
    this.followYaw+=(this.pointer.yaw-this.followYaw)*(1-Math.exp(-step/.14));this.followPitch+=(this.pointer.pitch-this.followPitch)*(1-Math.exp(-step/.14));
    const fy=this.followYaw*this.follow,fp=this.followPitch*this.follow;
    const look=this.idleLook.sample(step,idle&&!yawn.active&&!watch.active&&this.follow<.05);
    // Hands gesture while explaining; nods land on stressed syllables.
    // Hand gestures are turned off: the hands stay at rest while the avatar talks.
    const gesture=this.gesture.sample(step,false);
    this.gestureLeft+=(gesture.left-this.gestureLeft)*(1-Math.exp(-step/.08));this.gestureRight+=(gesture.right-this.gestureRight)*(1-Math.exp(-step/.08));
    this.slowAmp+=(this.amplitude-this.slowAmp)*(1-Math.exp(-step/.35));
    const accent=speaking?clamp((this.amplitude-this.slowAmp)*2.2):0;
    this.nod+=(accent-this.nod)*(1-Math.exp(-step/(accent>this.nod?.07:.22)));
    if(now>this.blinkAt+.18)this.blinkAt=now+3.1+Math.abs(Math.sin(now*1.7))*2.6;
    const phase=(now-this.blinkAt)/.18,blink=phase>=0&&phase<=1?Math.sin(phase*Math.PI):0;
    const emphasis=this.amplitude*(.6+.4*Math.sin(now*1.8+.4));
    // Phrase energy has a slower response than articulation. This avoids coupling
    // shoulders and head directly to each rapid mouth opening.
    const phraseTarget=speaking?clamp(target*1.7):0;
    this.phrase+=(phraseTarget-this.phrase)*(1-Math.exp(-step/(phraseTarget>this.phrase?.22:.55)));
    this.presence+=(1-this.presence)*(1-Math.exp(-step/.38));
    const breath=this.presence*(.42+.3*Math.sin(now*1.37)+.06*Math.sin(now*.67+.8))+.12*yawn.face,phrase=this.phrase;
    const gl=this.gestureLeft,gr=this.gestureRight;
    const targets={headYaw:watch.look*.30+look.headYaw*1.3+fy*.86+(gl-gr)*.07+this.presence*(.006*Math.sin(now*.53)+phrase*(.068*Math.sin(now*.83+.6)+.03*Math.sin(now*1.61))),headPitch:watch.look*.38-.055*yawn.face+look.headPitch*1.3+fp*.82+this.nod*.08+this.presence*(.005*Math.sin(now*.71)-phrase*.036*(.5+.5*Math.sin(now*1.9))),headRoll:watch.look*.025-.012*yawn.face-look.headYaw*.08-fy*.11+(gr-gl)*.025+this.presence*(.003*Math.sin(now*.41)+phrase*.042*Math.sin(now*.67+.7)),shoulderLeft:watch.raise*.06+gl*.32+this.presence*(.08*Math.sin(now*.57+.3)+phrase*.42*Math.sin(now*.79+.6))+(breath-this.presence*.42)*.11,shoulderRight:yawn.cover*.06+gr*.32+this.presence*(.065*Math.sin(now*.61+1.4)+phrase*.36*Math.sin(now*.73+1.9))+(breath-this.presence*.42)*.09,torsoTurn:watch.raise*-.008+yawn.cover*.008+fy*.02+(gl-gr)*.006+this.presence*(.002*Math.sin(now*.38)+phrase*.012*Math.sin(now*.63+.5)),bodyShift:this.presence*(.0003*Math.sin(now*.57)+phrase*.0009*Math.sin(now*.71))};
    for(const key in targets){const settling=key.startsWith('shoulder')?.62:key==='torsoTurn'||key==='bodyShift'?.48:idle?.16:.26;this.posture[key]+=(targets[key]-this.posture[key])*(1-Math.exp(-step/settling));}
    // Eyes lead the turn, then settle relative to the actual head position.
    const gazeBlend=1-Math.exp(-step/.065);
    this.gazeX+=(watch.look*.52+look.attentionYaw+this.followYaw*this.follow-this.posture.headYaw-this.gazeX)*gazeBlend;this.gazeY+=(watch.look*.66+look.attentionPitch+this.followPitch*this.follow-this.posture.headPitch-this.gazeY)*gazeBlend;
    return {jaw:this.amplitude+(1-this.amplitude)*yawn.jaw,rounding:(1-this.articulation)*(1-yawn.face*.4),spread:this.articulation,press:this.press,fricative:this.amplitude*Math.max(0,this.articulation-.55)*.22,tongue:this.amplitude*this.articulation*.035,blink:Math.max(blink,yawn.face*.82),yaw:this.presence*Math.sin(now*.48)*.003,pitch:this.presence*Math.sin(now*.71)*.002,roll:this.presence*Math.sin(now*.34)*.002,breath,...this.posture,brow:emphasis*.08+yawn.face*.06,cheek:this.amplitude*.035+yawn.face*.03,squint:emphasis*.025+yawn.face*.45,gazeX:this.gazeX,gazeY:this.gazeY,idleLooking:idle&&!yawn.active&&!watch.active&&this.idleLook.phase!=='forward',yawning:yawn.active,yawnCover:yawn.cover,yawnPreview:yawn.preview,watchChecking:watch.active,watchRaise:watch.raise,watchPreview:watch.preview,gestureLeft:this.gestureLeft,gestureRight:this.gestureRight,gestureBeat:this.nod,gestureKind:gesture.kind,gestureTime:gesture.time,following:this.follow>.05,preview,speaking};
  }
}
