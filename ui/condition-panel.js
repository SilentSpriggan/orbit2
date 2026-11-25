/* A local anatomy teaching workspace and public-domain reference browser. */
(function(root){
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function mount(host,viewer){
  if(!host)return;
  host.innerHTML=`<details class="workspace-tool-group" id="lab-condition-tools" open><summary><span><strong>Conditions & fractures</strong><small>Reported anatomy, teaching effects and a sourced health reference</small></span></summary><section class="panel condition-workspace"><form id="anatomy-condition-form"><label for="anatomy-condition-report">Describe a condition or injury</label><div class="condition-input-row"><input id="anatomy-condition-report" class="field-input" maxlength="1500" placeholder="I have a spiral fracture of my left femur" required><button class="button small" type="submit">Show anatomy</button></div><p class="condition-input-note">This form works locally. Use the crew assistant to discuss a concern. No health record is saved.</p></form><p class="condition-status" id="anatomy-condition-status" role="status"></p><div class="condition-examples" aria-label="Anatomy teaching examples"><span>TRY AN EXAMPLE</span><button type="button" data-example="Show a spiral fracture of the left femur">Spiral fracture</button><button type="button" data-example="Show a comminuted fracture of the right tibia">Comminuted fracture</button><button type="button" data-example="Animate asthma">Asthma</button><button type="button" data-example="Animate arrhythmia">Heart rhythm</button><button type="button" data-example="Show kidney stones in the left kidney">Kidney stone</button></div><div class="condition-knowledge"><div class="condition-knowledge-title"><h3>Health reference</h3><small id="condition-reference-count">Loading local topics…</small></div><label class="sr-only" for="condition-reference-search">Search health topics and alternate names</label><input id="condition-reference-search" class="field-input" type="search" maxlength="160" placeholder="Search a condition, symptom or fracture…"><div id="condition-reference-results" class="condition-reference-results"></div><article id="condition-reference-detail" class="condition-reference-detail" hidden></article><p class="condition-reference-source">Source: <a href="https://medlineplus.gov/" target="_blank" rel="noopener noreferrer">MedlinePlus, National Library of Medicine</a>. This is a dated reference snapshot, not an exhaustive disease list or a diagnosis.</p></div></section></details>`;
  const form=host.querySelector('#anatomy-condition-form'),status=host.querySelector('#anatomy-condition-status'),input=host.querySelector('#anatomy-condition-report');
  let request=0;
  form.addEventListener('submit',async event=>{
   event.preventDefault();const stamp=++request,report=input.value.trim(),parsed=root.OrbitConditionAnatomy.parseReport(report);
   if(parsed.status!=='mapped'){viewer.clearReportedConcern();status.textContent=parsed.message||'Describe the body area, bone and side, or choose a teaching example.';return;}
   const mapping=root.OrbitConditionAnatomy.resolveReport(parsed,viewer.getCatalog());
   if(mapping.status!=='mapped'){viewer.clearReportedConcern();status.textContent=mapping.message;return;}
   status.textContent='Loading related anatomy…';try{const result=await viewer.highlightReportedConcern(mapping,{isCurrent:()=>stamp===request&&host.isConnected});if(stamp!==request||!host.isConnected)return;status.textContent=result.status==='applied'?'Reference anatomy updated. Effects are schematic, not a scan or a diagnosis.':'The screen changed before the anatomy was ready.';if(result.status==='applied')document.getElementById('anatomy-stage')?.scrollIntoView({block:'center',behavior:'smooth'});}catch{status.textContent='The anatomy could not finish loading. Try again.';}
  });
  host.addEventListener('click',event=>{const button=event.target.closest('[data-example]');if(button){input.value=button.dataset.example;form.requestSubmit();}});
  try{
   const data=await root.OrbitConditionReference.load();if(!host.isConnected)return;
   host.querySelector('#condition-reference-count').textContent=data.topics.length.toLocaleString()+' topics · '+data.generated.split(' ')[0];
   const search=host.querySelector('#condition-reference-search'),results=host.querySelector('#condition-reference-results'),detail=host.querySelector('#condition-reference-detail');
   function render(){const query=search.value.trim(),matches=query?root.OrbitConditionReference.search(data,query,10).map(r=>r.topic):['Fractures','Asthma','Arrhythmia','Kidney Stones','Osteoporosis','Sprains and Strains'].flatMap(name=>root.OrbitConditionReference.search(data,name,1).map(r=>r.topic));
    results.innerHTML=matches.length?matches.map(topic=>`<button type="button" data-reference-topic="${escape(topic.id)}"><span>${escape(topic.title)}</span><small>${escape(topic.groups.slice(0,2).join(' / '))}</small></button>`).join(''):'<p>No local topic matched. Try another standard name. This library does not cover every possible condition.</p>';
   }
   search.addEventListener('input',render);render();
   results.addEventListener('click',event=>{const button=event.target.closest('[data-reference-topic]'),topic=button&&data.topics.find(t=>t.id===button.dataset.referenceTopic);if(!topic)return;
    detail.hidden=false;detail.innerHTML=`<small>MEDLINEPLUS / EDUCATIONAL SUMMARY</small><h3>${escape(topic.title)}</h3>${topic.aliases.length?`<p class="condition-aliases">Also called: ${escape(topic.aliases.join(', '))}</p>`:''}<div class="condition-reference-summary"></div><a class="text-button" href="${escape(topic.url)}" target="_blank" rel="noopener noreferrer">Open current source ↗</a><button class="text-button" type="button" data-ask-topic="${escape(topic.title)}">Discuss with crew assistant →</button>`;
    detail.querySelector('.condition-reference-summary').textContent=topic.summary;
   });
   detail.addEventListener('click',event=>{const button=event.target.closest('[data-ask-topic]');if(button)window.dispatchEvent(new CustomEvent('orbit:ask-condition-reference',{detail:{topic:button.dataset.askTopic}}));});
  }catch{if(host.isConnected)host.querySelector('#condition-reference-count').textContent='Reference data unavailable. Reload to retry.';}
 }
 root.OrbitConditionPanel={mount};
})(typeof globalThis!=='undefined'?globalThis:this);
