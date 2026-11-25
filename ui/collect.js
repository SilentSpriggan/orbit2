'use strict';
/*
 * Collect vitals: the Collection methods gallery and each method's animated walkthrough.
 * Brought over from the GullHacks ORBIT build (Collection methods only; its camera,
 * sensor and saved-readings views are not part of this site). Readings are entered with
 * this site's own Log health data form, so they land in the Health log.
 */
const CollectionPage=(()=>{
  const {methods,byId}=CollectionMethods;
  const methodURL=id=>'#collect?method='+id;
  let cleanup=null;

  function route(){
    const params=new URLSearchParams(location.hash.split('?')[1]||'');
    const id=params.get('method');
    return Object.hasOwn(byId,id)?byId[id]:null;
  }
  function methodCard(m,index){
    return `<article class="cl-card${index===0?' cl-feature':''}" data-previewable>
      ${CollectionPlayer.visual(m)}
      <div class="cl-card-copy"><p class="cl-category"><span>${String(index+1).padStart(2,'0')}</span>${m.category}</p>
      <h2><a href="${methodURL(m.id)}">${m.title}</a></h2><p class="cl-description">${m.description}</p>
      <a class="cl-open" href="${methodURL(m.id)}" aria-label="Open ${m.title} walkthrough">Open walkthrough ${icon('arrowright')}</a></div></article>`;
  }
  function sourceLinks(m){
    return `<details class="cl-sources"><summary>Equipment & references</summary><p>${m.equipment}</p>${m.note?`<p>${m.note}</p>`:''}<ul>${m.refs.map(([name,url])=>`<li><a href="${url}" rel="noopener noreferrer" target="_blank">${name} ↗</a></li>`).join('')}<li><a href="assets/collection/model/ORBIT-crew-member.glb" download>Download the full-body 3D model (.glb)</a></li><li><a href="assets/collection/model/credits.html" target="_blank" rel="noopener">VALID · crew model credits ↗</a></li><li><a href="models/ATTRIBUTION.txt" target="_blank" rel="noopener">BodyParts3D · anatomical model credits ↗</a></li></ul></details>`;
  }
  function detail(m){
    const bounds=m.bounds||[0,5,10,15];
    return `<div class="cl-detail-head"><a href="#collect">‹ All collection methods</a>
      <p class="cl-category">${m.category}</p><h1>${m.title}</h1><p>${m.description}</p></div>
      <div class="cl-detail-grid cl-detail-solo">
        <div class="cl-guide"><div data-previewable>${CollectionPlayer.visual(m,true)}
          <div class="cl-caption"><span class="cl-caption-kicker">Simulation · <span data-phase-count>1 / 3</span></span><strong data-caption>${m.stages[0][0]}</strong><span data-example>${m.stages[0][2]}</span></div></div></div>
        <aside class="cl-guide cl-guide-side">
          <section class="cl-steps"><h2>How collection works</h2><ol>${m.stages.map(([heading,body],i)=>`<li><button type="button" data-phase="${i}" aria-label="Show animation stage ${i+1}: ${heading}">0:${String(bounds[i]).padStart(2,'0')}</button><div><h3>${heading}</h3><p>${body}</p></div></li>`).join('')}</ol></section>
          ${sourceLinks(m)}
          <div class="cl-log-cta"><p>Took this reading? Save it to the Health log for ${esc(activeCrew().name)}.</p><button type="button" class="button primary" data-action="log">${icon('plus')}Log a reading</button></div>
        </aside>
      </div>`;
  }
  function render(){
    const m=route();
    if(m)return `<section id="cl-root" class="cl-root">${detail(m)}</section>`;
    return `<section id="cl-root" class="cl-root">${pageHeading('Collect vitals','Hover over a method or press Play to watch its 3D demonstration. Open a walkthrough to step through how the reading is taken.')}<div class="cl-gallery">${methods.map(methodCard).join('')}</div><p class="cl-sim-note">${icon('info')}The animations use simulated example values on a reference crew model. They show technique; they do not measure anything.</p></section>`;
  }
  function attach(){
    const root=document.querySelector('#cl-root');if(!root)return;
    const ctl=new AbortController();
    const stop=CollectionPlayer.bind(root,ctl.signal);
    cleanup=()=>{ctl.abort();stop?.();};
  }
  function dispose(){cleanup?.();cleanup=null;}
  return {render,attach,dispose};
})();
