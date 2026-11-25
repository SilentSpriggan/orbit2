'use strict';
const CollectionPlayer=(()=>{
  const rootURL='assets/collection/';
  const playIcon='<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 2.6v10.8L13 8z"/></svg>';
  const pauseIcon='<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3.5 3h3v10h-3zm6 0h3v10h-3z"/></svg>';
  const expandIcon='<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>';
  const shrinkIcon='<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5"/></svg>';
  const fullscreenOK=()=>Boolean(document.fullscreenEnabled||document.webkitFullscreenEnabled);
  const fullscreenEl=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
  const formatTime=s=>'0:'+String(Math.floor(Math.max(0,s)+.0001)).padStart(2,'0');
  function visual(m,detail=false){
    const model=detail?`<button type="button" class="cl-model-toggle" data-model-toggle aria-expanded="false">Explore person in 3D</button>
      <div class="cl-model-stage" data-model-stage hidden><canvas tabindex="0" aria-label="Interactive 3D model of the crew member. Drag or use arrow keys to rotate."></canvas>
      <div class="cl-model-tools" hidden><button type="button" data-model-action="site">Focus on site</button><button type="button" data-model-action="out" aria-label="Zoom out on person">−</button><button type="button" data-model-action="in" aria-label="Zoom in on person">+</button><button type="button" data-model-action="reset">Reset</button></div>
      <span class="cl-model-hint" data-model-hint role="status">Loading model…</span></div>`:'';
    return `<div class="cl-visual${detail?' cl-large':''}" data-scene="${m.id}">
      <video muted playsinline preload="none" disablepictureinpicture aria-label="${m.title} procedure animation"></video>
      <img class="cl-poster" src="${rootURL+m.id}.webp" alt="${m.title} on the 3D crew demonstration model" decoding="async">
      <div class="cl-stage-status"><span class="cl-sim-dot"></span><span data-mode-label>Simulation</span></div>${model}
      <div class="cl-player"><button type="button" data-play aria-label="Play ${m.title} animation" aria-pressed="false">${playIcon}<span>Play 3D</span></button>
      <div class="cl-track" aria-hidden="true"><span></span></div><span class="cl-time">${formatTime(m.seconds)}</span><button type="button" class="cl-fullscreen" data-fullscreen aria-label="Full screen ${m.title} animation" title="Full screen">${expandIcon}</button></div>
      <span class="cl-player-notice" role="status" hidden></span></div>`;
  }
  function bind(root,signal){
    const players=[...root.querySelectorAll('[data-scene]')].map(el=>({el,m:CollectionMethods.byId[el.dataset.scene],video:el.querySelector('video'),
      button:el.querySelector('[data-play]'),track:el.querySelector('.cl-track span'),time:el.querySelector('.cl-time'),notice:el.querySelector('.cl-player-notice'),
      poster:true,phase:-1,seconds:0,seek:null,serial:0,callback:0,controller:null}));
    if(!players.length)return ()=>{};
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');let active=null,trigger='';
    const listen=(el,ev,fn)=>el.addEventListener(ev,fn,{signal});
    function sync(p,sec,force=false){
      if(p.controller)return;
      p.seconds=sec;const second=p.poster?p.m.seconds:sec,clock=formatTime(second);
      if(p.time.textContent!==clock)p.time.textContent=clock;
      p.track.style.transform='scaleX('+(p.poster?0:Math.min(1,sec/p.m.seconds))+')';
      const bounds=p.m.bounds||[0,5,10,15],phase=sec<bounds[1]?0:sec<bounds[2]?1:2;
      if(!p.el.classList.contains('cl-large')||(!force&&p.phase===phase))return;
      p.phase=phase;root.querySelector('[data-phase-count]').textContent=(phase+1)+' / 3';
      root.querySelector('[data-caption]').textContent=p.m.stages[phase][0];root.querySelector('[data-example]').textContent=p.m.stages[phase][2];
      root.querySelectorAll('[data-phase]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===phase)));
    }
    function button(p,playing){
      p.button.innerHTML=(playing?pauseIcon:playIcon)+'<span>'+(playing?'Pause':p.video.ended?'Replay':p.poster?'Play 3D':'Play')+'</span>';
      p.button.setAttribute('aria-pressed',String(playing));p.button.setAttribute('aria-label',(playing?'Pause ':'Play ')+p.m.title+' animation');
    }
    function ensureSource(p){
      if(p.video.getAttribute('src'))return;
      p.video.preload='metadata';p.video.muted=true;
      const h264=p.video.canPlayType('video/mp4; codecs="avc1.640020"');
      p.format=h264?'mp4':'webm';p.video.src=rootURL+p.m.id+'.'+p.format;
    }
    function seek(p,sec){
      p.seek=sec;if(p.video.readyState<1)return;
      p.video.currentTime=Math.max(0,Math.min(sec,p.m.seconds-1/60));p.seek=null;
    }
    function cancelClock(p){
      if(p.video.cancelVideoFrameCallback)p.video.cancelVideoFrameCallback(p.callback);else cancelAnimationFrame(p.callback);
      p.callback=0;
    }
    function clock(p){
      cancelClock(p);
      function update(now,meta){
        if(active!==p||signal.aborted||p.video.paused)return;
        const sec=meta?.mediaTime??p.video.currentTime;sync(p,sec);p.el.classList.add('cl-show-video');
        schedule();
      }
      function schedule(){p.callback=p.video.requestVideoFrameCallback?p.video.requestVideoFrameCallback(update):requestAnimationFrame(update);}
      schedule();
    }
    function stop(p,reset=false){
      if(!p)return;
      p.serial++;cancelClock(p);p.video.pause();if(active===p){active=null;trigger='';}
      if(reset){p.poster=true;p.seek=null;p.el.classList.remove('cl-show-video');sync(p,0);}
      button(p,false);
    }
    async function play(p,reason){
      if(p.controller||document.hidden||active===p||(reason==='hover'&&reduced.matches))return;
      if(active)stop(active);ensureSource(p);p.notice.hidden=true;
      if(p.poster||p.video.ended)seek(p,0);
      p.poster=false;active=p;trigger=reason;const serial=++p.serial;button(p,true);
      try{await p.video.play();}
      catch(err){if(p.serial!==serial||signal.aborted)return;stop(p);if(err.name!=='AbortError'){p.notice.textContent=err.name==='NotAllowedError'?'Press Play to start the animation.':'Playback is unavailable. Open the method to explore the 3D model.';p.notice.hidden=false;}}
    }
    function leaveModel(p){
      if(!p.controller)return;
      p.controller.abort();p.controller=null;const stage=p.el.querySelector('[data-model-stage]');stage.hidden=true;
      p.el.classList.remove('cl-inspecting');const toggle=p.el.querySelector('[data-model-toggle]');toggle.textContent='Explore person in 3D';toggle.setAttribute('aria-expanded','false');
      root.querySelector('.cl-caption').hidden=false;p.el.querySelector('[data-mode-label]').textContent='Simulation';sync(p,p.seconds,true);
    }
    async function model(p){
      if(p.controller){leaveModel(p);return;}
      if(active)stop(active);p.notice.hidden=true;
      const ctl=new AbortController();p.controller=ctl;
      const stage=p.el.querySelector('[data-model-stage]'),toggle=p.el.querySelector('[data-model-toggle]');
      // A canvas with a disposed WebGL context cannot be reused on a later visit.
      const prior=stage.querySelector('canvas');prior.replaceWith(prior.cloneNode(false));
      stage.hidden=false;stage.querySelector('.cl-model-tools').hidden=true;stage.querySelector('[data-model-hint]').textContent='Loading model…';
      p.el.classList.add('cl-inspecting');toggle.textContent='Back to procedure';toggle.setAttribute('aria-expanded','true');
      root.querySelector('.cl-caption').hidden=true;p.el.querySelector('[data-mode-label]').textContent='3D model';
      try{const mod=await import('./crew-viewer.mjs');if(!ctl.signal.aborted)await mod.openCrewViewer(stage,p.m.id,ctl.signal);}
      catch{if(!ctl.signal.aborted)stage.querySelector('[data-model-hint]').textContent='The model could not load. Select Back to procedure to return.';}
    }
    /* Full screen: the whole demo (video, captions and controls) fills the screen and plays.
       iPhone Safari has no element full screen, so it falls back to the native video player. */
    async function fullscreen(p){
      if(fullscreenEl()===p.el){(document.exitFullscreen||document.webkitExitFullscreen)?.call(document);return;}
      if(p.controller)leaveModel(p);
      if(fullscreenOK()){
        try{await (p.el.requestFullscreen||p.el.webkitRequestFullscreen).call(p.el);}catch{return;}
        if(active===p)trigger='manual';else play(p,'manual');
        return;
      }
      ensureSource(p);
      if(p.video.webkitEnterFullscreen){if(active!==p)await play(p,'manual');try{p.video.webkitEnterFullscreen();}catch{}}
    }
    function syncFullscreen(){
      for(const p of players){const b=p.el.querySelector('[data-fullscreen]');if(!b)continue;const on=fullscreenEl()===p.el;
        b.innerHTML=on?shrinkIcon:expandIcon;b.setAttribute('aria-label',(on?'Exit full screen':'Full screen ')+(on?'':p.m.title+' animation'));b.title=on?'Exit full screen':'Full screen';p.el.classList.toggle('cl-fullscreen-on',on);}
    }
    listen(document,'fullscreenchange',syncFullscreen);listen(document,'webkitfullscreenchange',syncFullscreen);
    const visible=new IntersectionObserver(list=>{
      for(const item of list){const p=players.find(s=>s.el===item.target);
        if(item.isIntersecting){ensureSource(p);if(matchMedia('(hover: hover)').matches&&p.el.closest('[data-previewable]')?.matches(':hover'))play(p,'hover');}
        else if(active===p)stop(p);
      }
    },{rootMargin:'60px'});
    for(const p of players){
      const area=p.el.closest('[data-previewable]')||p.el;visible.observe(p.el);sync(p,0);
      listen(area,'pointerenter',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen')play(p,'hover');});
      listen(area,'pointerleave',()=>{if(active===p&&trigger==='hover'&&fullscreenEl()!==p.el)stop(p,true);});
      const full=p.el.querySelector('[data-fullscreen]');
      if(full)listen(full,'click',e=>{e.stopPropagation();fullscreen(p);});
      listen(p.button,'click',()=>{if(active===p)stop(p);else play(p,'manual');});
      listen(p.video,'loadedmetadata',()=>{if(p.seek!==null)seek(p,p.seek);});
      listen(p.video,'playing',()=>{if(active===p){p.el.classList.add('cl-show-video');clock(p);}});
      listen(p.video,'seeked',()=>{if(!p.poster){p.el.classList.add('cl-show-video');sync(p,p.video.currentTime);}});
      listen(p.video,'ended',()=>{stop(p);sync(p,p.m.seconds);});
      listen(p.video,'error',()=>{
        if(signal.aborted)return;
        if(p.format==='mp4'&&p.video.canPlayType('video/webm; codecs="vp9"')){
          const resume=active===p,sec=p.seconds,source=trigger;p.format='webm';if(resume)stop(p);p.seek=sec;p.video.src=rootURL+p.m.id+'.webm';if(resume)play(p,source);
        }else{stop(p);p.notice.textContent='Playback is unavailable. Open the method to explore the 3D model.';p.notice.hidden=false;}
      });
      const toggle=p.el.querySelector('[data-model-toggle]');if(toggle)listen(toggle,'click',()=>model(p));
    }
    for(const b of root.querySelectorAll('[data-phase]'))listen(b,'click',()=>{
      const p=players[0],time=(p.m.bounds||[0,5,10,15])[Number(b.dataset.phase)]+.25;
      leaveModel(p);stop(p);ensureSource(p);p.poster=false;seek(p,time);sync(p,time);button(p,false);
    });
    listen(document,'visibilitychange',()=>{if(document.hidden)stop(active);});listen(window,'pagehide',()=>stop(active));
    listen(reduced,'change',()=>{if(reduced.matches)stop(active);});
    return ()=>{if(players.some(p=>fullscreenEl()===p.el))(document.exitFullscreen||document.webkitExitFullscreen)?.call(document);visible.disconnect();for(const p of players){p.controller?.abort();p.controller=null;stop(p);p.video.removeAttribute('src');p.video.load();}};
  }
  return {visual,bind};
})();
