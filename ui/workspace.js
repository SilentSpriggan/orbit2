'use strict';

// Search this static tool directory, never private health records or images.
const WORKSPACE_FEATURES = [
 {group:'Daily health',title:'Log a health check',description:'Enter vital signs, glucose, sleep, mood and daily totals.',icon:'plus',action:'log'},
 {group:'Daily health',title:'Collect vitals',description:'Watch 3D walkthroughs of seven instrument methods: ECG, blood pressure, temperature and more.',icon:'heart',page:'collect'},
 {group:'Daily health',title:'Health log & trends',description:'Search saved readings, chart any indicator and export records.',icon:'clipboard',page:'log'},
 {group:'Daily health',title:'Health assessment',description:'Record responsiveness, breathing, symptoms and next actions.',icon:'shield',page:'care',section:'assessment'},
 {group:'Daily health',title:'Health trends',description:'Compare any recorded indicator over 7, 14 or 30 days.',icon:'chart',page:'trends'},
 {group:'Daily health',title:'Trend alerts',description:'Find sustained changes in heart rate, sleep, mood and other indicators.',icon:'chart',page:'trends'},
 {group:'Daily health',title:'Sleep & wellbeing',description:'Complete a daily check-in on sleep, fatigue, stress, mood and crew connection.',icon:'moon',page:'care',section:'wellbeing'},
 {group:'Daily health',title:'Skin & wounds',description:'Complete a daily skin check and track wounds until they heal.',icon:'shield',page:'care',section:'skin'},
 {group:'Daily health',title:'Exercise',description:'Log workouts and compare them with the daily target.',icon:'dumbbell',page:'care',section:'exercise'},
 {group:'Daily health',title:'Daily routine',description:'Complete planned exercise, nutrition, wellbeing and sleep tasks.',icon:'checksquare',page:'routine'},
 {group:'Health inputs & guidance',title:'Manual health data',description:'Record approved measurements with clear units.',icon:'clipboard',page:'care',section:'inputs',input:'manual'},
 {group:'Health inputs & guidance',title:'Photos, camera & imaging',description:'Capture or upload an observation and review saved image records.',icon:'body',page:'care',section:'inputs',input:'images'},
 {group:'Health inputs & guidance',title:'Heart rate sensor',description:'Connect a compatible Bluetooth heart rate monitor.',icon:'heart',page:'care',section:'inputs',input:'sensor'},
 {group:'Health inputs & guidance',title:'Dataset import & sample data',description:'Import a reviewed JSON record or explore fictional demo indicators.',icon:'document',page:'care',section:'inputs',input:'dataset'},
 {group:'Health inputs & guidance',title:'Measurement guide',description:'Equipment, measurement steps, context and review guidance.',icon:'book',page:'care',section:'measurements'},
 {group:'Health inputs & guidance',title:'Individual medical plan',description:'Review bands, scheduled tasks and recorded care instructions.',icon:'clipboard',action:'plan'},
 {group:'Health inputs & guidance',title:'Flight surgeon report',description:'Print or download a PDF summary for your approved medical communication channel.',icon:'document',action:'handoff'},
 {group:'Health inputs & guidance',title:'Medical response & checklists',description:'Open the crew response guide and timed emergency checklists.',icon:'alert',action:'emergency'},
 {group:'Crew & anatomy',title:'Crew status',description:'See who needs attention first, with overdue checks and the most urgent concern.',icon:'alert',page:'status'},
 {group:'Crew & anatomy',title:'Astronaut profiles',description:'Choose a crew member and review vitals and linked anatomy.',icon:'crew',page:'crew'},
 {group:'Crew & anatomy',title:'Condition notes',description:'Review or add a documented concern and locate its linked region.',icon:'body',page:'crew',target:'.crew-conditions'},
 {group:'Crew & anatomy',title:'Recent crew checks',description:'Inspect the selected astronaut’s latest saved health checks.',icon:'clipboard',page:'crew',target:'.crew-history'},
 {group:'Crew & anatomy',title:'3D anatomy lab',description:'Rotate, zoom, select and inspect the reference body.',icon:'layers',page:'anatomy',target:'#lab-workspace'},
 {group:'Crew & anatomy',title:'Body system layers',description:'Show, isolate or fade skeletal, muscular, vascular and other systems.',icon:'layers',page:'anatomy',target:'#lab-systems'},
 {group:'Crew & anatomy',title:'Anatomy library & study collections',description:'Browse named structures, 21 study collections and regional topics.',icon:'book',page:'anatomy',tab:'studies',target:'#lab-library'},
 {group:'Crew & anatomy',title:'All 206 bones',description:'Search the complete named inventory and locate each bone in 3D.',icon:'body',page:'anatomy',tab:'bones',target:'#lab-library'},
 {group:'Crew & anatomy',title:'Tissue & regional 3D models',description:'Explore the 18 original schematic teaching modules.',icon:'layers',page:'anatomy',target:'.lab-detail-launcher'},
 {group:'Crew & anatomy',title:'Dissection & section planes',description:'Layer presets, isolate, hide, restore, section and exploded views.',icon:'layers',page:'anatomy',target:'#lab-dissection-tools'},
 {group:'Crew & anatomy',title:'Motion illustrations',description:'Elbow movement, ocular rotation and the cardiopulmonary pathway.',icon:'activity',page:'anatomy',target:'#lab-motion-tools'},
 {group:'Crew & anatomy',title:'Conditions & fractures',description:'Describe a concern, show teaching effects and search the local condition reference.',icon:'body',page:'anatomy',target:'#lab-condition-tools'},
 {group:'Mission & records',title:'Mission readiness & offline package',description:'Review environment hazards and prepare the app for offline use.',icon:'globe',page:'care',section:'mission'},
 {group:'Mission & records',title:'Mission health risks',description:'Track radiation dose, bone density and muscle strength against limits.',icon:'radiation',page:'risks'},
 {group:'Mission & records',title:'Evidence library',description:'Research behind ORBIT, with evidence labels and paper links.',icon:'book',page:'research'},
 {group:'Mission & records',title:'Mission settings & workspace',description:'Switch demo or personal records and set the mission environment.',icon:'settings',action:'settings'},
 {group:'Mission & records',title:'Export health records',description:'Export a CSV or health summary from the existing health log.',icon:'download',page:'log'},
 {group:'Mission & records',title:'Crew archive & profile management',description:'Add or edit profiles and export the crew archive, including images.',icon:'crew',page:'crew'},
 {group:'Mission & records',title:'About, data & sources',description:'Read project context, data controls, attribution and limits.',icon:'info',action:'about'}
];
let workspacePendingTarget=null;
function workspaceFeatureResults(query='') {
 const tokens=query.trim().toLowerCase().split(/\s+/).filter(Boolean),items=WORKSPACE_FEATURES.map((item,index)=>({...item,index})).filter(item=>tokens.every(term=>(item.title+' '+item.description+' '+item.group).toLowerCase().includes(term)));
 const result=document.getElementById('workspace-feature-results');if(!result)return;
 result.innerHTML=items.length?[...new Set(items.map(item=>item.group))].map(group=>`<section class="feature-result-group"><h3>${esc(group).toUpperCase()}</h3><div class="feature-result-list">${items.filter(item=>item.group===group).map(item=>`<button class="feature-result" data-workspace-feature="${item.index}">${icon(item.icon)}<span><strong>${esc(item.title)}</strong><small>${esc(item.description)}</small></span></button>`).join('')}</div></section>`).join(''):'<p class="feature-no-results">No matching feature. Try “photos”, “bones”, “sleep”, or “offline”.</p>';
 const count=document.getElementById('workspace-feature-count');if(count)count.textContent=`${items.length} ${items.length===1?'feature':'features'} available`;
}
function workspaceFeatureFinder() {
 if(document.querySelector('dialog[open]'))return;
 modal('Find a feature','Every workspace and tool, in one place.',`<label class="feature-search-label" for="workspace-feature-search">What would you like to do?</label><input class="field-input feature-search" type="search" id="workspace-feature-search" placeholder="Search photos, symptoms, bones, exports…" autocomplete="off"><p class="feature-result-count" id="workspace-feature-count" role="status"></p><div id="workspace-feature-results"></div>`);
 workspaceFeatureResults();document.getElementById('workspace-feature-search').focus();
}
function workspaceRevealTarget() {
 const pending=workspacePendingTarget;if(!pending)return;
 if(currentPage()!==pending.page||Date.now()>pending.expires){workspacePendingTarget=null;return;}
 const target=document.querySelector(pending.selector);if(!target)return;
 for(let parent=target;parent&&parent.id!=='main';parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 target.scrollIntoView({block:'start',behavior:'auto'});workspacePendingTarget=null;
}
function workspaceOpenFeature(index) {
 const item=WORKSPACE_FEATURES[index];if(!item)return;
 closeModal();
 const actions={log:logModal,settings:settingsModal,plan:carePlanModal,handoff:missionReportModal,emergency:()=>emergencyResponseModal(),about:()=>guideModal('about')};
 if(item.action){actions[item.action]?.();return;}
 if(item.section)careTab=item.section;if(item.input)inputKind=item.input;
 if(item.tab){anatomyBrowser.tab=item.tab;anatomyBrowser.query='';anatomyBrowser.limit=100;}
 workspacePendingTarget=item.target?{page:item.page,selector:item.target,expires:Date.now()+8000}:null;
 if(currentPage()===item.page)render();else location.hash=item.page;
 if(!item.target)window.scrollTo(0,0);
}
document.addEventListener('click',event=>{
 const skip=event.target.closest('a.skip');if(skip){event.preventDefault();const target=document.querySelector(skip.getAttribute('href'));target?.focus({preventScroll:false});return;}
 const menu=event.target.closest('.menu-toggle');if(menu){requestAnimationFrame(()=>{if(document.body.classList.contains('nav-open'))document.querySelector('.main-nav a.active')?.focus();});return;}
 if(event.target.closest('.main-nav a'))requestAnimationFrame(()=>document.querySelector('#main').focus({preventScroll:true}));
 if(event.target.closest('[data-workspace-find]')){workspaceFeatureFinder();return;}
 const item=event.target.closest('[data-workspace-feature]');if(item){workspaceOpenFeature(Number(item.dataset.workspaceFeature));return;}
 const jump=event.target.closest('[data-workspace-jump]');if(jump){workspacePendingTarget={page:currentPage(),selector:jump.dataset.workspaceJump,expires:Date.now()+8000};workspaceRevealTarget();}
});
document.addEventListener('input',event=>{if(event.target.id==='workspace-feature-search')workspaceFeatureResults(event.target.value);});
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&!document.querySelector('dialog[open]')&&!event.target.closest('input,textarea,[contenteditable=true]')){event.preventDefault();workspaceFeatureFinder();}});
window.addEventListener('orbit:context-change',()=>requestAnimationFrame(workspaceRevealTarget));
window.addEventListener('orbit:lab-ready',()=>requestAnimationFrame(workspaceRevealTarget));
const workspaceShortcut=document.querySelector('.feature-finder-trigger kbd');if(workspaceShortcut)workspaceShortcut.textContent=/Mac|iPhone|iPad/.test(navigator.platform)?'⌘ K':'Ctrl K';

document.addEventListener('keydown',event=>{if(event.key==='Escape'&&event.target.closest('.sidebar'))document.querySelector('.menu-toggle').focus();});
