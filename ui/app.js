'use strict';

const ICONS={
 layers:'<path d="m12 2 10 5-10 5L2 7l10-5Zm-10 10 10 5 10-5M2 17l10 5 10-5"/>',
 crew:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>',
 minus:'<path d="M5 12h14"/>',
 overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6M9 15h6M9 19h4"/>',
 chart:'<path d="M4 3v17h17M7 14l4-4 4 2 6-8"/>',
 body:'<circle cx="12" cy="4" r="2"/><path d="M8 9h8l3 6M8 9l-3 6M9 10v7l-2 5M15 10v7l2 5M9 16h6"/>',
 checksquare:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-7"/>',
 book:'<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1v15"/>',
 settings:'<path d="m9 3 1-1h4l1 1 .4 2 1.6 1 2-.6 2 3.4-1.5 1.4v2.6l1.5 1.4-2 3.4-2-.6-1.6 1L15 21l-1 1h-4l-1-1-.4-2-1.6-1-2 .6-2-3.4L4.5 13v-2.6L3 9l2-3.4 2 .6 1.6-1L9 3Z"/><circle cx="12" cy="12" r="3"/>',
 chevronright:'<path d="m9 5 7 7-7 7"/>',chevrondown:'<path d="m5 9 7 7 7-7"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 play:'<path d="m8 4 12 8-12 8V4Z"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 arrowright:'<path d="M4 12h16m-6-6 6 6-6 6"/>',external:'<path d="M14 3h7v7m0-7L11 13M10 3H3v18h18v-7"/>',
 heart:'<path d="M20.5 5.5c-2-2-5.2-1.9-7.2.2L12 7l-1.3-1.3C6.5 1.4.2 6 3.1 11.2 5.5 15.3 12 20 12 20s6.5-4.7 8.9-8.8c1.1-2 .9-4.2-.4-5.7Z"/><path d="M3 11h5l2-3 3 7 2-4h6"/>',
 pressure:'<path d="M6 17a8 8 0 1 1 12 0M8 20h8M12 12l4-4M5 12h2M12 5v2M17 12h2"/><circle cx="12" cy="12" r="1"/>',
 temp:'<path d="M9 14.3V5a3 3 0 0 1 6 0v9.3a5 5 0 1 1-6 0Z"/><path d="M12 7v10M17 6h3M17 10h3"/><circle cx="12" cy="18" r="1"/>',
 moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/>',
 check:'<path d="m5 12 4 4L19 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.2"/>',
 shield:'<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6L12 2Z"/><path d="m8 12 3 3 5-6"/>',
 bone:'<path d="M7 3a3 3 0 0 0-5 3c-2 2-1 5 2 5l9 9c0 3 3 4 5 2a3 3 0 0 0 3-5L7 3Z"/>',
 brain:'<path d="M12 4c-3-4-7-1-7 2-4 1-4 6-2 8-2 4 2 7 5 6 1 3 4 2 4-1V4Zm0 0c3-4 7-1 7 2 4 1 4 6 2 8 2 4-2 7-5 6-1 3-4 2-4-1"/><path d="M5 6c0 3 3 3 3 3M3 14c3-1 4 0 4 2M19 6c0 3-3 3-3 3M21 14c-3-1-4 0-4 2"/>',
 drop:'<path d="M12 2s-7 8-7 13a7 7 0 1 0 14 0c0-5-7-13-7-13Z"/>',
 activity:'<path d="M2 12h5l3-9 4 18 3-9h5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
 signal:'<path d="M4 20v-4M9 20v-8M14 20V8M19 20V3"/>',
 alert:'<path d="m12 2 10 19H2L12 2Z"/><path d="M12 9v5M12 17v.3"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
 menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 orbit:'<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="12" ry="4" transform="rotate(-35 12 12)"/>',
 lock:'<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v4"/>',
 face:'<circle cx="12" cy="12" r="9"/><path d="M8 9h.1M16 9h.1M8 14c2 3 6 3 8 0"/>',
 wind:'<path d="M3 7h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 17h6a3 3 0 1 1-3 3"/>',
 cup:'<path d="M4 3h13l-1 18H5L4 3Zm13 3h2a3 3 0 0 1 0 6h-2M4 7h13"/>',
 document:'<path d="M5 2h9l5 5v15H5V2Zm9 0v6h5M8 12h8M8 16h8M8 19h5"/>',
 refresh:'<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
 box:'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm-9 5 9 5 9-5M12 12v10"/>',
 radiation:'<circle cx="12" cy="12" r="2"/><path d="M12 7a5 5 0 0 1 4.3 2.5L20.6 7A10 10 0 0 0 12 2v5ZM7.7 9.5A5 5 0 0 1 12 7V2a10 10 0 0 0-8.6 5l4.3 2.5ZM14.5 16.3a5 5 0 0 1-5 0L7 20.7a10 10 0 0 0 10 0l-2.5-4.4Z"/>',
 dumbbell:'<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>'
};
const icon=(n)=>`<i data-icon="${n}" aria-hidden="true"></i>`;
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[el.dataset.icon]||ICONS.info}</svg>`;});}
const $=(q,root=document)=>root.querySelector(q);
const $$=(q,root=document)=>Array.from(root.querySelectorAll(q));
const esc=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='orbit-crew-health-v1';
const todayKey=()=>new Date().toLocaleDateString('en-CA');
const localInput=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
/* The year is shown only for other years, such as historical mission records. */
const dayLabel=(d)=>{const t=new Date(d);return t.toLocaleDateString('en-US',t.getFullYear()===new Date().getFullYear()?{month:'short',day:'numeric'}:{month:'short',day:'numeric',year:'numeric'});};
const formatNum=(n,d=0)=>Number.isFinite(n)?Number(n).toFixed(d):'—';
let storageAvailable=true,toastTimer,chartMetric='hr',chartRange=7,filterQuery='',logLimit=20;
const META={hr:{label:'Resting heart rate',short:'Heart rate',unit:'bpm',digits:0,icon:'heart',color:'#276bb4'},sys:{label:'Systolic blood pressure',short:'Blood pressure',unit:'mmHg',digits:0,icon:'pressure'},temp:{label:'Body temperature',short:'Temperature',unit:'°C',digits:1,icon:'temp'},sleep:{label:'Sleep duration',short:'Sleep',unit:'hrs',digits:1,icon:'moon'},glucose:{label:'Blood glucose',short:'Glucose',unit:'mg/dL',digits:0,icon:'drop'},mood:{label:'Mood check-in',short:'Mood',unit:'/ 5',digits:0,icon:'face'}};
Object.assign(META, INPUT_META);
const moodNames={1:'Very low',2:'Low',3:'Neutral',4:'Good',5:'Very good'};
const ROUTINES=[
 {id:'vitals',title:'Morning health check',short:'Resting indicators & symptom log',description:'Take your scheduled readings with mission approved equipment and note any symptoms.',time:'07:00',icon:'heart'},
 {id:'exercise',title:'Exercise countermeasures',short:'Follow your prescribed session',description:'Complete the aerobic and resistance work in your individual exercise prescription.',time:'09:00',icon:'activity'},
 {id:'nutrition',title:'Nutrition & hydration check',short:'Review your mission intake plan',description:'Review meals and fluids against your individual plan. Note appetite or intake changes.',time:'12:00',icon:'cup'},
 {id:'mood',title:'Wellbeing check-in',short:'Mood, workload & crew connection',description:'Record your mood, make time for a crew check-in, and note any concerns for medical review.',time:'18:00',icon:'brain'},
 {id:'sleep',title:'Sleep preparation',short:'Protect your planned rest period',description:'Review tomorrow’s schedule, follow your light routine, and prepare your sleep environment.',time:'21:00',icon:'moon'}
];
function seedDemo(){
 const hr=[65,63,64,66,62,65,64,63,65,67,64,63,65,66,64,65,63,64,66,65,64,63,65,67,66,64,65,64];
 const sleeps=[7.9,8.1,7.8,8.2,7.6,8.0,7.7,7.8,8.0,7.6,8.1,7.9,8.0,7.7,7.9,7.8,8.1,8.0,7.5,7.8,8.0,7.3,7.8,7.5,7.2,6.8,6.6,6.5];
 const entries=hr.map((h,i)=>{const d=new Date();d.setDate(d.getDate()-(27-i));d.setHours(7,0,0,0);if(d>new Date())d.setTime(Date.now()-60000);return {id:'sample-'+i,at:d.toISOString(),hr:h,spo2:97+i%2,rr:15+i%3,fluids:1800+i%5*150,exercise:45+i%4*5,sys:116+(i%5),dia:74+(i%4),temp:[36.6,36.7,36.8,36.7][i%4],sleep:sleeps[i],glucose:[89,92,94,91,90][i%5],glucoseContext:'Before meal',mood:i===27?3:4,notes:i===27?'Slept less after a schedule change. No symptoms reported.':'Routine morning check. No symptoms reported.'};});
 return {entries,checks:{[todayKey()]:['vitals','exercise','nutrition']}};
}
function defaultState(){return {version:1,mode:'demo',data:{demo:{entries:[],checks:{}},personal:{entries:[],checks:{}}},settings:{mission:'Exploration 01',environment:'Lunar transit',sleepTarget:8},reminderDismissed:false};}
let state,storageNotice='',storageLocked=false;
function loadState(){
 let raw=null;try{raw=localStorage.getItem(KEY);}catch{return defaultState();}
 const stored=StateLogic.readStored(raw);if(stored.state)return stored.state;
 if(stored.damaged){try{localStorage.setItem(`${KEY}-recovery-${Date.now()}`,raw);storageNotice='Saved records could not be read, so this page started fresh. A copy of the old data was kept in this browser.';}catch{storageLocked=true;storageNotice='Saved records could not be read or copied. Saving is off so they are not overwritten.';}}
 return defaultState();
}
state=loadState();
initCrewData();
initMissionData();
function persist(){if(storageLocked){storageAvailable=false;return;}try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;toast('Browser storage is unavailable. Export your records before closing this page.');}}
window.addEventListener('storage',e=>{
 if(e.storageArea!==localStorage||e.key!==KEY)return;
 const stored=StateLogic.readStored(e.newValue);if(!stored.state)return;
 state=StateLogic.adoptState(state,stored.state);initCrewData();initMissionData();
 if($('#modal').open||$('#main form')||['crew','anatomy'].includes(currentPage()))toast('Records changed in another tab. They appear here when this page next updates.');else render();
});
/* A vital the offline voice assistant saved after a person pressed Save. Only the website's own voice frame may send it. */
const VOICE_VITAL_FIELDS={heart_rate:'hr',systolic_bp:'sys',diastolic_bp:'dia',temperature:'temp',spo2:'spo2',respiratory_rate:'rr'};
const VOICE_VITAL_SOURCE='Crew voice assistant';
window.addEventListener('message',e=>{
 const m=e.data,frame=document.getElementById('voice-frame');
 if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow||m?.type!=='orbit:vital-saved')return;
 const field=VOICE_VITAL_FIELDS[m.kind],limits=InputLogic.fields[field],value=Number(m.value),at=Date.parse(m.recordedAt);
 if(!field||!limits||!Number.isFinite(value)||value<limits.min||value>limits.max||!Number.isFinite(at))return;
 /* The assistant and the website share crew ids (hist-ma9, hist-ma7). */
 const profile=crewProfiles().find(p=>p.id===m.crewId),crewId=profile?.id;
 if(!profile){toast('The assistant saved a reading for a crew member who is not in this workspace, so it was not added to the Health log.');return;}
 /* Readings said together (systolic, then diastolic) become one Health log row. */
 const recent=db().entries.find(r=>r.source===VOICE_VITAL_SOURCE&&r.crewId===crewId&&!Number.isFinite(r[field])&&Math.abs(Date.parse(r.at)-at)<120000);
 if(recent)recent[field]=value;
 else db().entries.push({id:crypto.randomUUID?.()||'entry-'+Date.now().toString(36),crewId,at:new Date(at).toISOString(),source:VOICE_VITAL_SOURCE,notes:'',[field]:value});
 persist();
 if(!$('#modal').open&&!$('#main form'))render();
 toast(`Added to ${profile.name}'s Health log.`);
});
/* Forms the offline voice assistant may open for a person, as if they pressed the button themselves.
   It only opens the form: the person fills it in and presses Save. Keys are the voice tool's names. */
const VOICE_FORMS={
 'health-check':{action:'log',label:'Log health data'},
 'wellbeing-check-in':{action:'mission-checkin',label:'Wellbeing check-in'},
 'workout':{action:'mission-workout',label:'Log a workout'},
 'risk-reading':{action:'mission-risk-add',label:'Add a radiation, bone or muscle reading'},
 'skin-check':{action:'skin-check',label:'Skin check'},
 'eva-skin-check':{action:'skin-eva',label:'Skin check after a spacewalk'},
 'wound':{action:'skin-wound-add',label:'Add a wound'},
 'condition-note':{action:'condition-add',label:'Add a condition note',page:'crew'},
 'image-record':{action:'input-photo',label:'Add an image record'},
 'health-assessment':{action:'input-assessment',label:'Guided health assessment',page:'care',noModal:true},
 'emergency-checklist':{action:'emergency',label:'Crew medical response'},
 'flight-surgeon-report':{action:'mission-report',label:'Flight surgeon report'},
 'crew-report':{action:'mission-crew-report',label:'Crew member report',withCrew:true},
 'crew-member':{action:'crew-add',label:'Add a crew member'},
};
function openVoiceForm(m){
 const spec=Object.hasOwn(VOICE_FORMS,m.form)?VOICE_FORMS[m.form]:null;
 if(!spec)return {ok:false,reason:'That is not a form the assistant can open.'};
 if($('#modal').open)return {ok:false,reason:'Another form or dialog is already open on screen. Ask the person to finish or close it first.'};
 if(m.crew){const p=crewFromLink(m.crew);if(!p)return {ok:false,reason:`No crew profile matches “${m.crew}”.`};if(db().activeCrewId!==p.id){db().activeCrewId=p.id;focusedConditionId=null;persist();}}
 if(spec.page&&currentPage()!==spec.page)location.hash=spec.page;
 render();
 /* The same path as a person's click: the page's own button handlers do the rest. */
 const b=document.createElement('button');b.type='button';b.hidden=true;b.dataset.action=spec.action;if(spec.withCrew)b.dataset.id=activeCrewId();
 document.body.append(b);b.click();b.remove();
 const opened=spec.noModal?currentPage()===spec.page:$('#modal').open;
 if(!opened)return {ok:false,reason:`${spec.label} did not open.`};
 return {ok:true,label:spec.label,crew:activeCrew().name,title:$('#modal').open?($('#modal h2')?.textContent||spec.label):spec.label};
}
/* The fields of the form open on screen, so the voice assistant knows what it may fill in. */
const voiceFormInputs=form=>[...form.elements].filter(el=>el.name&&!el.disabled&&!['hidden','file','submit','button','reset','password'].includes(el.type));
function voiceFieldLabel(el){
 /* A radio or checkbox group is named by its group, not by its first option. */
 const group=['radio','checkbox'].includes(el.type)?el.closest('[role="group"],fieldset'):null;
 const text=el.getAttribute('aria-label')||group?.getAttribute('aria-label')||group?.querySelector('legend')?.textContent||el.closest('label')?.querySelector('span')?.textContent||el.closest('.field')?.querySelector(':scope>span')?.textContent||el.name;
 return text.replace(/\s*\((?:optional|mmHg, optional)[^)]*\)/i,'').replace(/\s+/g,' ').trim();
}
function voiceFormFields(form){
 const out={};
 for(const el of voiceFormInputs(form)){
  if(out[el.name]){if(el.type==='radio'||el.type==='checkbox')out[el.name].options?.push(el.value);continue;}
  const unit=el.closest('.input-with-unit')?.querySelector('em')?.textContent;
  const f={label:voiceFieldLabel(el),type:el.tagName==='SELECT'?'choice':el.tagName==='TEXTAREA'?'text':el.type};
  if(unit)f.unit=unit;
  if(el.min!=='')f.min=Number(el.min);if(el.max!==''&&el.type==='number')f.max=Number(el.max);
  if(el.tagName==='SELECT')f.options=[...el.options].map(o=>o.value||o.textContent);
  if(el.type==='radio')f.options=[el.value];
  if(el.type==='checkbox'&&form.querySelectorAll(`[name="${CSS.escape(el.name)}"]`).length>1)f.options=[el.value];
  out[el.name]=f;
 }
 return out;
}
/* Type values the voice assistant heard into the open form. Each value is checked against the field; nothing is saved: the person reviews the form and presses Save. */
function fillVoiceForm(m){
 const form=$('#modal').open?$('#modal form'):null;
 if(!form)return {ok:false,reason:'No form is open on screen. Open one first.'};
 if(!m.values||typeof m.values!=='object'||Array.isArray(m.values))return {ok:false,reason:'Give the values as field names and values.',fields:voiceFormFields(form)};
 const fields=voiceFormFields(form),filled=[],rejected=[];
 for(const [name,raw]of Object.entries(m.values)){
  const f=fields[name],els=voiceFormInputs(form).filter(el=>el.name===name);
  if(!f){rejected.push({field:name,reason:'This form has no such field.'});continue;}
  const value=typeof raw==='string'?raw.trim():raw;
  if(f.type==='number'){
   const n=Number(value);
   if(value===''||!Number.isFinite(n)){rejected.push({field:name,reason:'Needs a number.'});continue;}
   if((Number.isFinite(f.min)&&n<f.min)||(Number.isFinite(f.max)&&n>f.max)){rejected.push({field:name,reason:`Must be ${f.min} to ${f.max}${f.unit?' '+f.unit:''}.`});continue;}
   els[0].value=String(n);
  }else if(f.type==='radio'||(f.type==='checkbox'&&f.options)){
   const wanted=(Array.isArray(value)?value:[value]).map(String);
   const match=els.filter(el=>wanted.some(w=>w.toLowerCase()===el.value.toLowerCase()));
   if(match.length!==wanted.length||(f.type==='radio'&&match.length!==1)){rejected.push({field:name,reason:`Choose from: ${f.options.join(', ')}.`});continue;}
   if(f.type==='checkbox')els.forEach(el=>{el.checked=match.includes(el);});else match[0].checked=true;
  }else if(f.type==='checkbox'){
   if(typeof value!=='boolean'){rejected.push({field:name,reason:'Needs true or false.'});continue;}
   els[0].checked=value;
  }else if(f.type==='choice'){
   const opt=[...els[0].options].find(o=>[o.value,o.textContent].some(v=>v.toLowerCase()===String(value).toLowerCase()));
   if(!opt){rejected.push({field:name,reason:`Choose from: ${f.options.join(', ')}.`});continue;}
   els[0].value=opt.value;
  }else{
   const max=els[0].maxLength>0?els[0].maxLength:2000;
   if(typeof value!=='string'||value.length>max){rejected.push({field:name,reason:`Needs text up to ${max} characters.`});continue;}
   els[0].value=value;
   /* Date and time fields ignore text they cannot read: check that it took. */
   if(['date','time','datetime-local'].includes(f.type)&&els[0].value!==value){rejected.push({field:name,reason:'Use the format the field shows, e.g. 2026-11-15T07:30.'});continue;}
  }
  for(const el of els){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  filled.push(`${f.label} ${typeof value==='boolean'?(value?'yes':'no'):value}${f.unit?' '+f.unit:''}`);
 }
 if(filled.length)form.dataset.assistantDirty='true';
 return {ok:filled.length>0,filled,rejected,form:$('#modal h2')?.textContent||'form',...(filled.length?{}:{reason:'Nothing was filled in.',fields})};
}
window.addEventListener('message',e=>{
 const m=e.data,frame=document.getElementById('voice-frame');
 if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow||!['orbit:open-form','orbit:fill-form'].includes(m?.type))return;
 let result;
 try{
  result=m.type==='orbit:fill-form'?fillVoiceForm(m):openVoiceForm(m);
  /* Tell the assistant what it can fill in on the form it just opened. */
  if(m.type==='orbit:open-form'&&result.ok&&$('#modal form'))result.fields=voiceFormFields($('#modal form'));
 }catch(err){result={ok:false,reason:'That did not work on the website.'};console.error('ORBIT voice form:',err);}
 frame.contentWindow.postMessage({type:`${m.type}-result`,requestId:m.requestId,...result},location.origin);
});
function db(){return state.data[state.mode];}
function entries(){return crewRecords(activeCrewId());}
/* Shown in place of a mood score or check-in note the current viewer is not allowed to see. */
const hiddenCell=(e,key)=>e.hidden?.includes(key)?`<span class="hidden-value">${icon('lock')}Hidden</span>`:'';
function latest(key){return entries().filter(e=>Number.isFinite(e[key])).at(-1);}
function previousValues(key,days=7){const cutoff=Date.now()-days*86400000;return entries().filter(e=>new Date(e.at)>=cutoff&&Number.isFinite(e[key]));}
function checks(){return db().checks[crewCheckKey()]||[];}
function toggleCheck(id){if(!ROUTINES.some(r=>r.id===id))return;const before=factsUnlocked(),s=new Set(checks());s.has(id)?s.delete(id):s.add(id);db().checks[crewCheckKey()]=[...s];persist();render();if(factsUnlocked()>before)toast(`NASA fact ${factsUnlocked()} of ${HrpLinks.facts().length} unlocked. See it on Daily routine.`);}
/* NASA's "Did you know?" facts: one unlocks for each daily task the crew member has completed (MissionLogic.tasksCompleted). */
function factsUnlocked(){return typeof HrpLinks==='undefined'?0:Math.min(HrpLinks.facts().length,MissionLogic.tasksCompleted(db().checks,activeCrewId()));}
function factSource(f){return `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.title)}<span class="sr-only"> (NASA page, opens in a new tab)</span></a> · NASA Human Research Program`;}
function routineFacts(){const all=HrpLinks.facts(),n=factsUnlocked(),f=all[n-1];return `<div class="routine-facts"><div class="eyebrow">NASA FACTS · ${n} OF ${all.length}</div><div class="routine-facts-bar" role="img" aria-label="${n} of ${all.length} facts unlocked"><span style="width:${Math.round(n/all.length*100)}%"></span></div>${f?`<blockquote class="hrp-quote"><p>${esc(f.fact)}</p><footer>${factSource(f)}</footer></blockquote>`:'<p class="routine-facts-empty">Complete a daily task to unlock your first fact.</p>'}<p class="routine-facts-next">${n<all.length?'Each completed task unlocks the next fact from NASA’s risk pages.':`You have all ${all.length} facts.`}</p>${n?`<button class="text-button" data-facts="1">All your facts ${icon('arrowright')}</button>`:''}</div>`;}
function factsModal(){const all=HrpLinks.facts(),n=factsUnlocked();modal('Your NASA facts',`${n} of ${all.length} unlocked · From the “Did you know?” sections of NASA’s risk pages`,`<ol class="facts-list">${all.map((f,i)=>i<n?`<li><span>${String(i+1).padStart(2,'0')}</span><div><p>${esc(f.fact)}</p><small>${factSource(f)}</small></div></li>`:'').join('')}</ol>${n<all.length?`<p class="form-help">${all.length-n} more to unlock. Each completed daily task opens the next one; unticking a task locks it again.</p>`:''}`);}
/* Online / offline mode. Offline: the cloud assistant and external links are off, so nothing leaves this device. */
const OFFLINE_MODE_KEY='orbit.offlineMode';
let offlineMode=(()=>{try{return localStorage.getItem(OFFLINE_MODE_KEY)==='true';}catch{return false;}})();
function orbitOnline(){return navigator.onLine&&!offlineMode;}
function connectivityState(){return offlineMode?'offline-mode':navigator.onLine?'online':'no-internet';}
function syncConnectivityUI(){
 const state=connectivityState(),banner=$('#offline-banner');
 document.body.dataset.connection=state;
 $$('#connectivity-switch [data-connectivity]').forEach(b=>{const on=(b.dataset.connectivity==='offline')===offlineMode;b.setAttribute('aria-checked',String(on));b.tabIndex=on?0:-1;});
 if(!banner)return;
 banner.hidden=state==='online';
 if(state==='offline-mode'){$('#offline-banner-title').textContent='Offline mode';$('#offline-banner-text').textContent='Nothing leaves this device. The cloud assistant and external links are off. Records keep saving in this browser, and the offline voice assistant still works.';$('#offline-banner-action').textContent='Go online';$('#offline-banner-action').hidden=false;}
 else if(state==='no-internet'){$('#offline-banner-title').textContent='No internet connection';$('#offline-banner-text').textContent='The cloud assistant is unavailable. Records keep saving in this browser.';$('#offline-banner-action').textContent='Use offline mode';$('#offline-banner-action').hidden=false;}
}
function setOfflineMode(on,{announce=true}={}){
 if(offlineMode===Boolean(on))return;
 offlineMode=Boolean(on);
 try{localStorage.setItem(OFFLINE_MODE_KEY,String(offlineMode));}catch{/* the mode still applies for this visit */}
 syncConnectivityUI();
 window.dispatchEvent(new Event('orbit:connectivity'));
 if(announce)toast(offlineMode?'Offline mode is on. Nothing leaves this device.':(navigator.onLine?'Back online. The cloud assistant and external links are available.':'Online mode is on, but this device has no internet connection.'));
}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}
/* Merged pages: old links open the page that now holds them (a section or a Health assessment tab). */
const PAGE_ALIASES={trends:{page:'log',section:'health-trends'},wellbeing:{page:'care',tab:'wellbeing'},exercise:{page:'care',tab:'exercise'},skin:{page:'care',tab:'skin'}};
function currentPage(){const name=location.hash.slice(1).split('?')[0];if(Object.hasOwn(PAGE_ALIASES,name))return PAGE_ALIASES[name].page;return Object.hasOwn(PAGE_NAMES,name)?name:'status';}
function scrollToLogSection(id){const el=document.getElementById(id);if(!el)return;el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=el.querySelector('h2');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}}
const PAGE_NAMES={status:'Crew status',
risks:'Mission health risks',
research:'Evidence library',
care:'Health assessment',
crew:'Astronauts',
anatomy:'Anatomy lab',
voice:'Crew voice AI assistant',
log:'Health log & trends',
routine:'Daily routine',
collect:'Collect vitals'};
function button(text,action,type='',ic=''){return `<button class="button ${type}" data-action="${action}">${ic?icon(ic):''}${text}</button>`;}
/* Page heading, or a section heading when the page is shown as a Health assessment tab. */
function sectionHeading(embedded,title,sub,actions=''){return embedded?`<div class="care-section-head"><div><h2>${title}</h2><p>${sub}</p></div><div class="heading-actions">${actions}</div></div>`:pageHeading(title,sub,actions)+demoNotice();}
function pageHeading(title,sub,actions=''){return `<div class="page-heading"><div><div class="eyebrow">${esc(state.settings.mission).toUpperCase()} / ${esc(activeCrew().name).toUpperCase()}</div><h1>${title}</h1><p>${sub}</p></div><div class="heading-actions">${actions}</div></div>`;}
function demoNotice(){return state.mode==='demo'?`<div class="mode-notice"><span>Demo workspace · Fictional sample crew and the historical Mercury-Atlas 7 and 9 profiles.</span><button class="text-button" data-action="show-sample-crew">Show sample crew</button><button class="text-button" data-action="personal">Use my own data ${icon('arrowright')}</button></div>`:`<div class="mode-notice"><span>Showcase the tools with fictional crew and the historical Mercury profiles. Your personal workspace stays separate.</span><button class="text-button" data-action="show-sample-crew">Show sample crew</button></div>`;}
function safetyNotice(){return `<div class="notice">${icon('info')}<p>Research prototype. Trend notes support review; they do not diagnose conditions or establish fitness for duty. Follow your crew medical officer’s instructions and mission procedures.</p></div>`;}
function sparkline(key){const v=entries().filter(e=>Number.isFinite(e[key])).slice(-12).map(e=>e[key]);if(v.length<2)return '';let min=Math.min(...v),max=Math.max(...v);if(max===min){min-=1;max+=1;}return `<svg class="sparkline" viewBox="0 0 80 28" aria-hidden="true"><path d="${v.map((n,i)=>`${i?'L':'M'}${(i*78/(v.length-1)+1).toFixed(1)},${(24-(n-min)/(max-min)*20).toFixed(1)}`).join(' ')}" fill="none" stroke="${key==='sleep'?'#ad8544':'#5d8fc1'}" stroke-width="1.4"/></svg>`;}
function metricCard(key){const m=META[key],e=latest(key),val=e?.[key];const attention=key==='sleep'&&Number.isFinite(val)&&val<state.settings.sleepTarget;const v=key==='sys'&&e?`${formatNum(e.sys)}/${formatNum(e.dia)}`:formatNum(val,m.digits);const sub=e?(key==='sleep'?`${state.settings.sleepTarget} hr planned rest target`:`Last recorded ${new Date(e.at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`):'Add your first measurement';return `<article class="metric-card"><div class="metric-top">${icon(m.icon)}<span>${m.short}</span><span class="metric-status ${attention?'attention':''}">${e?(attention?'REVIEW':'RECORDED'):'NO DATA'}</span></div><div class="metric-value ${key==='sys'?'bp':''}">${v}<small>${m.unit}</small></div><div class="metric-sub ${attention?'attention':''}">${attention?icon('clock'):''}${sub}</div>${sparkline(key)}</article>`;}
/* A historical mission profile (ui/historical-crew.js) has readings from decades ago, so its charts cover the whole mission instead of the last few days. */
const historicalView=()=>!!activeCrew()?.historical;
function chartData(){return historicalView()?entries().filter(e=>Number.isFinite(e[chartMetric])):previousValues(chartMetric,chartRange);}
const chartPeriod=()=>historicalView()?'across the mission':`in the selected ${chartRange} day period`;
function chartSVG(large=false,width=600){
 const e=chartData(),m=META[chartMetric];if(chartMetric==='mood'&&!canSeeWellbeing())return '<div class="busy-empty">Mood is hidden. Only this crew member, the crew leader and the medical officer can see it. To change who is using ORBIT, use Viewing as at the top of the screen.</div>';if(!e.length)return '<div class="busy-empty">'+(historicalView()?'This historical record has no readings of this indicator.':'No readings in this period. Log a health check to start a trend.')+'</div>';
 const w=Math.max(240,Math.round(width)),h=large?280:200,p={l:48,r:20,t:16,b:54};let min=Math.min(...e.map(x=>x[chartMetric])),max=Math.max(...e.map(x=>x[chartMetric]));let pad=Math.max((max-min)*.6,chartMetric==='temp'?.3:chartMetric==='sleep'?.5:chartMetric==='mood'?1:4);min=Math.max(chartMetric==='temp'?30:0,min-pad);max+=pad;if(chartMetric==='mood'){min=1;max=5;}
 const first=Date.parse(e[0].at),last=Date.parse(e.at(-1).at),start=last>first?first:first-86400000,end=last>first?last:first+86400000;
 const x=d=>p.l+(Date.parse(d)-start)/(end-start)*(w-p.l-p.r),y=v=>p.t+(1-(v-min)/(max-min))*(h-p.t-p.b);
 const path=e.map((d,i)=>`${i?'L':'M'}${x(d.at).toFixed(2)},${y(d[chartMetric]).toFixed(2)}`).join(' ');
 let grid='';for(let i=0;i<4;i++){const yy=p.t+i*(h-p.t-p.b)/3,v=max-i*(max-min)/3;grid+=`<line class="gridline" x1="${p.l}" y1="${yy}" x2="${w-p.r}" y2="${yy}"/><text x="${p.l-12}" y="${yy+3}" text-anchor="end">${formatNum(v,m.digits)}</text>`;}
 const ticks=Math.max(2,Math.min(5,Math.floor((w-p.l-p.r)/110)+1));
 const labels=Array.from({length:ticks},(_,i)=>{
  const at=new Date(start+(end-start)*i/(ticks-1)),xx=p.l+(w-p.l-p.r)*i/(ticks-1);
  const date=at.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
  const time=at.toISOString().slice(11,16);
  return `<text class="chart-axis-tick" x="${xx}" y="${h-30}" text-anchor="${i===0?'start':i===ticks-1?'end':'middle'}"><tspan x="${xx}">${date}</tspan>${historicalView()?`<tspan x="${xx}" dy="16">${time}</tspan>`:''}</text>`;
 }).join('');
 return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${m.label}: ${e.length} readings ${historicalView()?'across the mission':'over the past '+chartRange+' days'}, ranging from ${formatNum(Math.min(...e.map(d=>d[chartMetric])),m.digits)} to ${formatNum(Math.max(...e.map(d=>d[chartMetric])),m.digits)} ${m.unit}">${grid}<path class="plot-area" d="${path} L${x(e.at(-1).at)},${h-p.b} L${x(e[0].at)},${h-p.b} Z"/><path class="plot-line" d="${path}"/>${e.map((d,i)=>`<circle cx="${x(d.at)}" cy="${y(d[chartMetric])}" r="3.3"/><circle class="point-hit" data-point="${i}" cx="${x(d.at)}" cy="${y(d[chartMetric])}" r="12"><title>${dayLabel(d.at)}: ${d[chartMetric]} ${m.unit}</title></circle>`).join('')}${labels}</svg>`;
}
function chartPanel(large=false){const d=chartData(),m=META[chartMetric],avg=d.length?d.reduce((a,e)=>a+e[chartMetric],0)/d.length:null;return `<section class="panel chart-card ${large?'large-chart':''}"><div class="panel-head"><div><h2>${large?m.label:'Health trends'}</h2><p>${large?'Recorded values over time':'Your indicators over the past '+chartRange+' days'}</p></div>${rangeButtons()}</div>${!large?`<div class="chart-metric-tabs" role="group" aria-label="Trend indicator">${['hr','sleep','temp'].map(k=>`<button data-chart="${k}" class="${chartMetric===k?'active':''}" aria-pressed="${chartMetric===k}">${META[k].short}</button>`).join('')}</div>`:''}<div class="chart-summary"><strong>${d.length?formatNum(d.at(-1)[chartMetric],m.digits):'—'}</strong><span>${m.unit}</span><span class="chart-average">AVG ${avg===null?'—':formatNum(avg,m.digits)} ${m.unit}</span></div><div class="chart-area"><div class="chart-plot" data-large="${large}">${chartSVG(large)}</div><div class="chart-tooltip"></div></div>${historicalView()?`<p class="chart-time-note">${new Date(d[0]?.at||activeCrew().missionDate).getUTCFullYear()} · Approximate mission times (UTC)</p>`:''}<div class="chart-foot"><span></span>${esc(m.label)}${large?`<button class="text-button chart-foot-link" data-action="jump-records">View source readings →</button>`:`<a href="#trends">View all trends →</a>`}</div></section>`;}
function rangeButtons(){if(historicalView())return `<span class="eyebrow">WHOLE MISSION</span>`;return `<div class="segmented" role="group" aria-label="Chart time range">${[7,14,30].map(d=>`<button data-range="${d}" class="${chartRange===d?'active':''}" aria-pressed="${chartRange===d}">${d}D</button>`).join('')}</div>`;}


function routineList(full=false){const done=checks();return `<div class="routine-list ${full?'routine-full':''}">${ROUTINES.map(r=>`<div class="routine-item ${done.includes(r.id)?'done':''}"><button class="check-box" data-check="${r.id}" role="checkbox" aria-checked="${done.includes(r.id)}" aria-label="${esc(r.title)}">${icon('check')}</button><div class="routine-item-text">${r.title}<small>${full?r.description:r.short}</small></div><span class="routine-time">${done.includes(r.id)?'COMPLETE':(carePlan().schedule?.[r.id]||r.time)}</span></div>`).join('')}</div><div class="routine-progress" aria-label="${done.length} of 5 routine tasks complete"><div style="width:${done.length*20}%"></div></div>`;}
function observations(){const s=latest('sleep'),m=latest('mood'),notes=[];if(s&&s.sleep<state.settings.sleepTarget)notes.push({ic:'moon',title:'Sleep below your planned target',text:`Your latest entry is ${formatNum(s.sleep,1)} hours, ${formatNum(state.settings.sleepTarget-s.sleep,1)} hours below your ${state.settings.sleepTarget} hour target. Review your schedule and note persistent fatigue.`,action:'sleep-guide',label:'Review sleep guidance'});if(m&&m.mood<=2)notes.push({ic:'brain',title:'Make time for a wellbeing check',text:'You recorded a low mood. Check in with your crew medical officer, especially if the change persists or affects daily tasks.',action:'mood-guide',label:'Review wellbeing guidance'});if(!notes.length)notes.push({ic:'clipboard',title:entries().length?'Keep your record consistent':'Start with a baseline',text:entries().length?'Compare readings taken under similar conditions. A recorded value alone does not establish that you are medically well.':'Record a health check to begin your personal history. Your medical team defines your individual baseline and action limits.',action:'log',label:'Log a health check'});notes.push({ic:'document',title:'Prepare for your medical check-in',text:'Export your recorded indicators and notes for review through your approved medical communication channel.',action:'export-summary',label:'Export health summary',blue:true});return notes.slice(0,2).map(n=>`<article class="observation"><div class="observation-icon ${n.blue?'blue':''}">${icon(n.ic)}</div><div><h3>${n.title}</h3><p>${n.text}</p><button class="text-button" data-action="${n.action}">${n.label} ${icon('arrowright')}</button></div></article>`).join('');}

function logPage(){const all=entries().reverse(),extra=['rr','spo2'].filter(k=>all.some(e=>Number.isFinite(e[k]))),shown=all.filter(e=>(e.notes+' '+dayLabel(e.at)+' '+new Date(e.at).toLocaleDateString('en-US')).toLowerCase().includes(filterQuery.toLowerCase())),d=chartData(),m=META[chartMetric],values=d.map(e=>e[chartMetric]);return `${pageHeading('Health log & trends','Your recorded measurements, and how each indicator changes over time.',button('Log health data','log','primary','plus'))}${demoNotice()}<div class="stat-strip"><div class="stat-box"><span class="eyebrow">RECORDED CHECKS</span><strong>${all.length}</strong><small>${state.mode==='demo'?'Sample health entries':'Manual health entries'}</small></div><div class="stat-box"><span class="eyebrow">LATEST CHECK</span><strong style="font-size:22px">${all.length?dayLabel(all[0].at):'—'}</strong><small>${all.length?new Date(all[0].at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'No records yet'}</small></div><div class="stat-box"><span class="eyebrow">RECORD LOCATION</span><strong style="font-size:22px">Local</strong><small>This browser, on this device</small></div></div><nav class="log-jump" aria-label="On this page"><button class="log-jump-link" data-action="jump-trends">${icon('chart')}Trends</button><button class="log-jump-link" data-action="jump-records">${icon('clipboard')}Records</button></nav><section id="health-trends" class="log-section" aria-labelledby="health-trends-title"><div class="section-label log-section-label"><h2 id="health-trends-title">Trends</h2><div class="trends-top"><label for="trend-metric" class="eyebrow">INDICATOR</label><select class="field-input trends-select" id="trend-metric">${Object.entries(META).map(([k,v])=>`<option value="${k}" ${k===chartMetric?'selected':''}>${v.label}</option>`).join('')}</select><span class="eyebrow">${state.mode==='demo'?'SAMPLE HISTORY':'YOUR RECORDS'}</span></div></div>${chartPanel(true)}<div class="trends-grid"><article class="panel insight-card"><h3>LOWEST RECORDED</h3><strong>${values.length?formatNum(Math.min(...values),m.digits):'—'} <small style="font-size:12px;color:var(--muted)">${m.unit}</small></strong><p>Minimum ${chartPeriod()}.</p></article><article class="panel insight-card"><h3>HIGHEST RECORDED</h3><strong>${values.length?formatNum(Math.max(...values),m.digits):'—'} <small style="font-size:12px;color:var(--muted)">${m.unit}</small></strong><p>Maximum ${chartPeriod()}.</p></article><article class="panel insight-card"><h3>DATA POINTS</h3><strong>${values.length}</strong><p>${m.label} readings ${historicalView()?'across the mission':'in this period'}.</p></article></div>${historicalView()?`<div class="notice">${icon('document')}<p>${esc(activeCrew().name)}’s readings are historical NASA records from ${esc(activeCrew().mission||'a past mission')}. Trend alerts compare recent days, so they do not apply. Each record’s notes give its mission phase and source.</p></div>`:missionTrendPanel()}<div class="notice">${icon('info')}<p>These charts show recorded values, not a clinical risk score. Compare measurements taken with the same method, context, and equipment. Your medical team defines your personal action limits.</p></div></section><section id="health-records" class="log-section" aria-labelledby="health-records-title"><div class="section-label log-section-label"><h2 id="health-records-title">Records</h2></div><section class="panel content-panel"><div class="filters"><label for="log-search">Filter records</label><input id="log-search" class="field-input" type="search" placeholder="Search dates or notes…" value="${esc(filterQuery)}"><button class="button small" data-action="export-csv" style="margin-left:auto">${icon('download')}Export CSV</button></div>${all.length?`<p class="workspace-table-hint">Scroll across the table to see all indicators.</p><div class="table-wrap" tabindex="0" aria-label="Health measurements. Scroll horizontally to view all columns."><table class="data-table"><thead><tr><th>DATE / LOCAL TIME</th><th>HR<br>bpm</th><th>BP<br>mmHg</th><th>TEMP<br>°C</th><th>SLEEP<br>hrs</th><th>GLUCOSE<br>mg/dL</th><th>MOOD<br>/ 5</th>${extra.map(k=>`<th>${k==='rr'?'RESP':'SpO₂'}<br>${esc(META[k].unit)}</th>`).join('')}<th>NOTES</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${shown.slice(0,logLimit).map(e=>`<tr><td><button class="text-button" data-entry="${esc(e.id)}">${dayLabel(e.at)}</button><span class="small-sub">${new Date(e.at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span></td><td>${formatNum(e.hr)}</td><td>${Number.isFinite(e.sys)?formatNum(e.sys)+'/'+formatNum(e.dia):'—'}</td><td>${formatNum(e.temp,1)}</td><td>${formatNum(e.sleep,1)}</td><td>${formatNum(e.glucose)}<span class="small-sub">${esc(e.glucoseContext||'')}</span></td><td>${hiddenCell(e,'mood')||formatNum(e.mood)}</td>${extra.map(k=>`<td>${formatNum(e[k])}</td>`).join('')}<td class="log-note" title="${esc(e.notes)}">${hiddenCell(e,'notes')||esc(e.notes)||'—'}</td><td><button class="table-delete" data-delete="${esc(e.id)}" aria-label="Delete record from ${dayLabel(e.at)}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>${!shown.length?'<div class="empty-state" style="padding:35px">No records match your search.</div>':''}${shown.length>logLimit?`<button class="text-button" style="margin-top:20px" data-action="more-log">Show more records</button>`:''}`:emptyState()} </section><div class="notice">${icon('lock')}<p>Records stay in this browser. Clearing browser storage removes them. Use CSV or the health summary export to keep a copy; no data is sent to a medical team. The optional Crew assistant receives only the records you explicitly review and share.</p></div></section>`;}
function emptyState(){return `<div class="empty-state">${icon('clipboard')}<h2>Your health record starts here.</h2><p>Add a measurement, sleep entry, or mood check-in.</p>${button('Log a health check','log','primary','plus')}</div>`;}
/* Health trends now lives inside the health log page; kept so older callers still render it. */
function trendsPage(){return logPage();}








function routinePage(){const n=checks().length;return `${pageHeading('Daily routine','Your daily health tasks, in one place.',button('Log health data','log','','plus'))}${demoNotice()}<div class="routine-page-grid"><section class="panel"><div class="panel-head"><div><h2>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</h2><p>Individual schedule · Local device time</p></div><span class="check-summary">${n}/5 COMPLETE</span></div>${routineList(true)}<div class="notice" style="margin:0 21px 21px">${icon('clock')}<p>The list starts fresh each local day. Checkmarks record completion; they do not verify that a clinical protocol was performed.</p></div></section><aside class="panel routine-side"><div class="progress-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52"/><circle class="progress-ring-fill" cx="60" cy="60" r="52" stroke-dasharray="326.73" stroke-dashoffset="${326.73*(1-n/5)}"/></svg><strong>${n}/5</strong></div><h2>${n===5?'Daily routine complete.':'Keep a steady routine.'}</h2><p>${n===5?'Your completion record is saved for today. Return tomorrow for a fresh checklist.':'A consistent routine helps you notice changes. Use your actual mission schedule and individual prescriptions to guide each task.'}</p><button class="text-button" data-action="reminders">${icon('clock')}About task reminders ${icon('arrowright')}</button>${routineFacts()}</aside></div>${safetyNotice()}`;}

/* NASA's named risks and current studies, from the challenge resources (dist/hrp-reference.js, made by scripts/fetch-hrp.mjs). Summaries are NASA's own words. */
/* NASA risks tied to an indicator, body system or anatomy layer (dist/hrp-links.js). detail: 'action' adds NASA's "What can be done", 'summary' NASA's summary. */
function hrpQuote(q){return q?`<blockquote class="hrp-quote"><p>“${esc(q.text)}”</p><footer><a href="${esc(q.url)}" target="_blank" rel="noopener noreferrer">${esc(q.title)}<span class="sr-only"> (opens in a new tab)</span></a> · ${esc(q.credit)}</footer></blockquote>`:'';}
function csaBlock({areas=[],experiments=[]},names=false){if(!areas.length&&!experiments.length)return '';const credit=typeof HrpReference!=='undefined'?HrpReference.csaCredit:'© Canadian Space Agency';return `${areas.map(a=>`<div class="hrp-csa-area"><b>${esc(a.title)}</b><p>${esc(a.text)}</p></div>`).join('')}${experiments.length?`<ul class="hrp-risk-list hrp-csa-list">${experiments.map(e=>`<li><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title.split(':')[0])}<span class="sr-only"> (CSA page, opens in a new tab)</span></a>${names?'':`<p>${esc(e.summary)}</p>`}</li>`).join('')}</ul>`:''}<p class="hrp-risk-note">${esc(credit)}. ${areas.length?'From <a href="'+esc(HrpReference.csaInfographic.url)+'" target="_blank" rel="noopener noreferrer">How does space affect the human body?</a>. ':''}Which experiments show here is ORBIT’s pairing.</p>`;}
function hrpRiskList(risks,detail=''){if(!risks.length)return '';return `<ul class="hrp-risk-list">${risks.map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(HrpLinks.name(r.title))}<span class="sr-only"> (NASA page, opens in a new tab)</span></a>${detail==='action'&&r.action?`<details><summary>What NASA does about it</summary><p>${esc(r.action)}</p>${hrpStudiesLine(r.id)}</details>`:detail==='summary'?`<p>${esc(r.summary)}</p>`:''}</li>`).join('')}</ul><p class="hrp-risk-note">ORBIT’s pairing with NASA’s named risks. <a href="#research">Browse the evidence library</a></p>`;}
/* NASA's own link from its studies to a risk ("Top Risks Addressed" on each study page). */
function hrpStudiesLine(riskId){const list=HrpLinks.studiesFor(riskId);return list.length?`<p class="hrp-studies">NASA studies on this risk: ${list.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}<span class="sr-only"> (opens in a new tab)</span></a>`).join(', ')}</p>`:'';}









/* A link such as #log?crew=hist-ma9 opens the page for that crew member. The parameter is then removed, so a later choice in the crew selector is not undone on the next render. */
/* The voice assistant may name the person instead ("Gordon Cooper", "Cooper", "Atlas 9"): match the id, then the full name, then one profile whose name or mission contains it. */
function crewFromLink(text){
 const all=crewProfiles(),t=String(text||'').trim().toLowerCase().replace(/\s+/g,' ');
 if(!t)return null;
 const exact=all.find(p=>p.id.toLowerCase()===t||p.name.toLowerCase()===t);if(exact)return exact;
 const partial=all.filter(p=>`${p.name} ${p.mission||''}`.toLowerCase().includes(t));
 return partial.length===1?partial[0]:null;
}
function applyCrewFromHash(){
 const [page,query='']=location.hash.slice(1).split('?'),params=new URLSearchParams(query),asked=params.get('crew');
 if(!asked)return;
 const id=crewFromLink(asked)?.id;
 if(!id)toast(`No crew profile matches “${asked}”.`);
 else if(db().activeCrewId!==id){db().activeCrewId=id;focusedConditionId=null;filterQuery='';logLimit=20;persist();}
 params.delete('crew');const rest=params.toString();
 history.replaceState(null,'',`#${page}${rest?'?'+rest:''}`);
}
/* Opening a different collection walkthrough starts at the top of the page. */
let lastCollectHash='';
function render(){
 applyCrewFromHash();
 window.dispatchEvent(new Event('orbit:scope-check'));
 anatomyLastSelection=null;anatomyLastState=null;
 const pendingAlias=PAGE_ALIASES[location.hash.slice(1).split('?')[0]];if(pendingAlias?.tab)careTab=pendingAlias.tab;
 const p=currentPage(),main=$('#main');
 if(main.dataset.page!==p){const group=document.querySelector('.main-nav [data-nav="'+p+'"]')?.closest('details');if(group)group.open=true;}
 // Re-renders must not reload the embedded voice workspace (that would end a live session).
 const keepVoice=p==='voice'&&main.dataset.page==='voice'&&!!main.querySelector('#voice-frame');
 const parkedVoice=document.getElementById('voice-frame');
 const voiceOutside=parkedVoice&&!main.contains(parkedVoice);
 main.dataset.page=p;let scroll=window.scrollY;cleanupHealthInputs();disposeCrewViewer();CollectionPage.dispose();
 if(p==='collect'&&location.hash!==lastCollectHash){scroll=0;}lastCollectHash=p==='collect'?location.hash:'';
 if(!keepVoice){
  main.innerHTML=(!storageAvailable?'<div class="save-warning">Local saving is unavailable. Export your data before leaving this page.</div>':'')+({status:missionStatusPage,risks:missionRisksPage,research:missionResearchPage,care:carePage,crew:crewDashboardPage,anatomy:anatomyLabPage,voice:voicePage,log:logPage,routine:routinePage,collect:()=>CollectionPage.render()}[p])();
  if(p==='voice'&&voiceOutside&&parkedVoice.isConnected){const slot=main.querySelector('#voice-slot');if(slot){parkedVoice.classList.remove('assistant-local-frame');parkedVoice.classList.add('voice-frame');slot.append(parkedVoice);}}
 }
 $$('.main-nav a').forEach(a=>{a.classList.toggle('active',a.dataset.nav===p);if(a.dataset.nav===p)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('#header-page').textContent=PAGE_NAMES[p];if($('#data-mode'))$('#data-mode').textContent=state.mode==='demo'?'DEMO MISSION':'MY HEALTH LOG';$('#rail-environment').textContent=state.settings.environment.toUpperCase();document.title=`${PAGE_NAMES[p]} | ORBIT`;
 syncCrewHeader();hydrateIcons(main);bindChart();if(p==='crew')attachCrewViewer();if(p==='anatomy')attachAnatomyLab();if(p==='collect')CollectionPage.attach();if(p==='care')attachCarePage();if(p==='research')attachOnboardAssistant();window.scrollTo(0,scroll);
 const alias=PAGE_ALIASES[location.hash.slice(1).split('?')[0]];if(alias){history.replaceState(null,'','#'+alias.page);if(alias.section)requestAnimationFrame(()=>scrollToLogSection(alias.section));}
 window.dispatchEvent(new Event('orbit:context-change'));
}
let chartResizeObserver;
function bindChart(){
 chartResizeObserver?.disconnect();
 const plot=$('.chart-plot'),tip=$('.chart-tooltip');if(!plot||!tip)return;
 const draw=width=>{
  if(width<=0)return;
  plot.innerHTML=chartSVG(plot.dataset.large==='true',width);
  plot.querySelectorAll('[data-point]').forEach(el=>{
   const show=()=>{const d=chartData()[+el.dataset.point];if(!d)return;tip.textContent=`${new Date(d.at).toISOString().slice(0,16).replace('T',' ')} UTC · ${formatNum(d[chartMetric],META[chartMetric].digits)} ${META[chartMetric].unit}`;tip.classList.add('visible');};
   el.setAttribute('tabindex','0');el.addEventListener('pointerenter',show);el.addEventListener('focus',show);
   el.addEventListener('pointerleave',()=>tip.classList.remove('visible'));el.addEventListener('blur',()=>tip.classList.remove('visible'));
  });
 };
 draw(plot.clientWidth);
 if(typeof ResizeObserver!=='undefined'){
  let previous=plot.clientWidth;
  chartResizeObserver=new ResizeObserver(items=>{const width=items[0]?.contentRect.width;if(width&&Math.abs(width-previous)>=1){previous=width;draw(width);}});
  chartResizeObserver.observe(plot);
 }
}
function modal(title,subtitle,body,footer=''){disposeInputModal();const d=$('#modal');d.innerHTML=`<div class="modal-head"><div><h2 id="modal-title">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div><div class="modal-body">${body}</div>${footer?`<div class="modal-foot">${footer}</div>`:''}`;hydrateIcons(d);if(!d.open)d.showModal();d.scrollTop=0;window.dispatchEvent(new Event('orbit:modal-open'));}
function announceFormSaved(form,node,persistent=storageAvailable){window.dispatchEvent(new CustomEvent('orbit:form-saved',{detail:{form,save_id:node?.dataset.assistantSaveId||'',persistent,workspace:state.mode,crewId:activeCrewId()}}));}
function closeModal(){disposeInputModal();$('#modal').close();}
function logModal(prefill={}){
 const fields=[['hr','Resting heart rate','bpm',0,350,1],['temp','Body temperature','°C',20,50,.1],['sleep','Sleep duration','hrs',0,24,.1],['glucose','Blood glucose','mg/dL',0,1500,1]];
 const f=(k,label,unit,min,max,step)=>`<label class="field"><span>${label} <small>(optional)</small></span><div class="input-with-unit"><input class="field-input" name="${k}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" placeholder="—"><em>${unit}</em></div></label>`;
 modal('Log a health check',state.mode==='demo'?'Demo workspace · Entries stay separate from your personal record.':'Personal workspace · Saved only in this browser.',`<p class="form-help">Enter the indicators you measured. Leave the others blank. Use the same equipment and technique where possible. <button class="instruction-link" data-action="care-inline-guide" aria-expanded="false" aria-controls="log-care-guide">Measurement guide</button></p>${careInlineGuideMarkup()}<form id="health-form"><div class="form-grid">${crewFieldMarkup()}<label class="field full"><span>Measurement date & time <small>(local device time)</small></span><input class="field-input" type="datetime-local" name="at" required value="${localInput()}" max="${localInput()}"></label><div class="form-section-label">PHYSIOLOGICAL INDICATORS</div>${f(...fields[0])}<label class="field"><span>Blood pressure <small>(mmHg, optional)</small></span><div class="bp-pair"><input class="field-input" name="sys" type="number" inputmode="numeric" min="0" max="350" placeholder="Systolic" aria-label="Systolic blood pressure"><b>/</b><input class="field-input" name="dia" type="number" inputmode="numeric" min="0" max="250" placeholder="Diastolic" aria-label="Diastolic blood pressure"></div></label>${f(...fields[1])}${f(...fields[2])}${f(...fields[3])}<label class="field"><span>Glucose measurement context</span><select class="field-input" name="glucoseContext"><option>Not specified</option><option>Fasting</option><option>Before meal</option><option>After meal</option></select></label>${extraInputFields(f)}<div class="form-section-label">WELLBEING & OBSERVATIONS</div><div class="field full"><span>Mood <small>(optional personal check-in)</small></span><div class="mood-picker" role="group" aria-label="Mood">${Object.entries(moodNames).map(([n,t])=>`<label class="mood-option"><input type="radio" name="mood" value="${n}"><span>${n}<small>${t}</small></span></label>`).join('')}</div></div><label class="field full"><span>Symptoms & notes <small>(optional)</small></span><textarea class="field-input" name="notes" maxlength="2000" placeholder="Include symptom onset, measurement conditions, or changes to your routine."></textarea></label></div><div class="form-error" role="alert" id="form-error"></div></form><div class="notice" style="margin-top:18px">${icon('info')}<p>Input limits help catch entry errors; they are not clinical reference ranges. A saved reading does not mean you are medically well.</p></div>`,`${button('Cancel','close-modal')}<button class="button primary" type="submit" form="health-form">${icon('check')}Save health check</button>`);
 const form=$('#health-form');form.dataset.source=prefill.source||'Manual entry';for(const key of [...Object.keys(InputLogic.fields),'at','notes'])if(prefill[key]!==undefined&&form.elements.namedItem(key))form.elements.namedItem(key).value=key==='at'?localInput(new Date(prefill[key])):String(prefill[key]);
 form.addEventListener('submit',saveHealthCheck);
}
function saveHealthCheck(event){
 event.preventDefault();const f=new FormData(event.target),record={source:event.target.dataset.source||'Manual entry',crewId:f.get('crewId')||activeCrewId(),id:crypto.randomUUID?.()||'entry-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),at:new Date(f.get('at')).toISOString(),notes:f.get('notes').trim(),glucoseContext:f.get('glucoseContext')};
 for(const k of Object.keys(InputLogic.fields)){const v=f.get(k);if(v!==null&&String(v).trim()!=='')record[k]=Number(v);}
 const fail=msg=>{$('#form-error').textContent=msg;};
 if(!crewProfiles().some(p=>p.id===record.crewId))return fail('Select a valid crew member.');
 if(Date.parse(record.at)>Date.now()+60000)return fail('Choose the current time or an earlier measurement time.');
 if((Number.isFinite(record.sys))!==Number.isFinite(record.dia))return fail('Enter both systolic and diastolic blood pressure, or leave both blank.');
 if(Number.isFinite(record.sys)&&record.sys<=record.dia)return fail('Systolic pressure must be greater than diastolic pressure. Check the values.');
 if(!Object.keys(META).some(k=>Number.isFinite(record[k]))&&!record.notes)return fail('Add at least one indicator or an observation.');
 if(!Number.isFinite(record.glucose))delete record.glucoseContext;
 db().activeCrewId=record.crewId;db().entries.push(record);if(new Date(record.at).toLocaleDateString('en-CA')===todayKey()){const s=new Set(checks());s.add('vitals');if(record.mood)s.add('mood');db().checks[crewCheckKey()]=[...s];}
 persist();announceFormSaved('health-form',event.target);closeModal();render();toast(storageAvailable?(state.mode==='demo'?'Demo health check saved.':'Health check saved on this device.'):'Reading added for this session. Export it before closing the page.');
}
function settingsModal(){modal('Workspace settings','Crew member, workspace, data, and daily rest target.',`<div class="settings-crew"><label class="field full"><span>Crew member <small>(applies to the overview, health log, trends and daily routine)</small></span><select class="field-input" id="settings-crew">${crewProfiles().map(p=>`<option value="${esc(p.id)}" ${p.id===activeCrewId()?'selected':''}>${esc(p.name)} · ${esc(p.role)}</option>`).join('')}</select></label><a class="text-button" href="#crew" data-action="close-modal">Manage crew profiles ${icon('arrowright')}</a><div class="settings-viewer"><div><span>Who is using ORBIT</span><strong>${viewerProfile()?esc(viewerProfile().name):'Not chosen'}</strong><small>Decides whose mood and wellbeing detail is shown.</small></div><button class="button small" data-action="viewer-select">${viewerProfile()?'Change':'Choose'}</button></div></div><div class="settings-divider"></div><div class="settings-modes"><button class="mode-option ${state.mode==='demo'?'active':''}" data-mode="demo"><div class="eyebrow">SIMULATION WORKSPACE</div><h3>Explore demo data</h3><p>A sample crew record with 28 days of indicators.</p></button><button class="mode-option ${state.mode==='personal'?'active':''}" data-mode="personal"><div class="eyebrow">PERSONAL WORKSPACE</div><h3>Use my own data</h3><p>A separate record. ${state.data.personal.entries.length} entries saved locally.</p></button></div><form id="settings-form"><div class="form-grid"><label class="field full"><span>Mission name</span><input class="field-input" name="mission" value="${esc(state.settings.mission)}" maxlength="40" required></label><label class="field"><span>Mission environment</span><select class="field-input" name="environment">${['Lunar transit','Space station','Lunar surface habitat','Mars transit','Mars surface habitat','Surface rover'].map(t=>`<option ${state.settings.environment===t?'selected':''}>${t}</option>`).join('')}</select></label><label class="field"><span>Planned sleep target <small>(hrs)</small></span><input class="field-input" name="sleepTarget" type="number" min="4" max="12" step="0.5" required value="${state.settings.sleepTarget}"></label></div><p class="form-help" style="margin:15px 0 0">The sleep target is a planning preference. Use the rest period set by your medical team.</p></form><div class="settings-divider"></div><div class="prose"><h3>Data controls</h3><p>Data stays in this browser. No application accounts, medical service connection, or cloud synchronization are included. Camera and compatible heart rate monitor inputs work only when you choose to use them.</p><div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">${button('Export CSV','export-csv','small','download')}${button('Clear current workspace','clear-data','danger small','trash')}</div></div>`,`${button('Close','close-modal')}<button class="button primary" type="submit" form="settings-form">Save settings</button>`);$('#settings-form').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.settings={...state.settings,mission:f.get('mission').trim()||'Exploration 01',environment:f.get('environment'),sleepTarget:Number(f.get('sleepTarget'))};persist();announceFormSaved('settings-form',e.target);closeModal();render();toast('Workspace settings saved.');});$('#settings-crew').addEventListener('change',e=>{selectCrew(e.target.value);toast(`Crew member: ${activeCrew().name}.`);});}
function setMode(mode){if(!['demo','personal'].includes(mode))return;state.mode=mode;initCrewData();persist();closeModal();render();toast(mode==='demo'?'Demo workspace selected.':'Your personal workspace is ready.');}
function download(name,content,type){const b=new Blob([content],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@\-]|^[\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function exportCSV(){const all=entries();if(!all.length){toast('No records to export. Add a health check first.');return;}const keys=['at',...Object.keys(InputLogic.fields),'glucoseContext','source','notes'];const headers=['Crew ID','Crew name','Timestamp (ISO 8601)',...Object.entries(InputLogic.fields).map(([key,rule])=>(META[key]?.label||'Diastolic pressure')+' ('+rule.unit+')'),'Glucose context','Input source','Notes'];const rows=[headers,...all.map(record=>[record.crewId||'crew-01',activeCrew().name,...keys.map(key=>record[key]??'')])];download(`orbit-${state.mode}-health-${todayKey()}.csv`,'\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');toast('Health records exported as CSV.');}

function exportSummary(){const all=entries();if(!all.length){toast('No records to export. Add a health check first.');return;}const since=Date.now()-7*86400000,week=all.filter(e=>Date.parse(e.at)>=since);let t=`ORBIT | CREW HEALTH SUMMARY\n${state.mode==='demo'?'SIMULATED DATA — DEMO WORKSPACE':'PERSONAL RECORD — SELF REPORTED'}\nCrew: ${activeCrew().name} (${activeCrewId()})\nMission: ${state.settings.mission}\nEnvironment: ${state.settings.environment}\nExported: ${new Date().toISOString()}\nAll timestamps below use the device’s local time.\n\nLATEST RECORDED INDICATORS\n`;
 for(const [k,m]of Object.entries(META)){const e=latest(k);t+=`${m.label}: ${e?`${formatNum(e[k],m.digits)} ${m.unit} (${new Date(e.at).toLocaleString()})`:'Not recorded'}\n`;}
 t+=`\nPAST 7 DAYS: ${week.length} health checks\n`;
 week.forEach(e=>{t+=`\n${new Date(e.at).toLocaleString()}\n`;for(const [k,m]of Object.entries(META)){if(Number.isFinite(e[k]))t+=`  ${m.label}: ${formatNum(e[k],m.digits)} ${m.unit}${k==='glucose'?' ('+(e.glucoseContext||'context not specified')+')':''}\n`;}if(Number.isFinite(e.dia))t+=`  Diastolic pressure: ${e.dia} mmHg\n`;if(e.notes)t+=`  Notes: ${e.notes}\n`;});
 t+=`\nCONDITION NOTES\n${activeCrew().conditions.length?activeCrew().conditions.map(c=>`${c.title} | ${c.status} | ${CREW_REGIONS[c.region]||'General'} | ${c.source} | ${c.date}\n${c.notes||''}`).join('\n\n'):'No condition notes recorded.'}\n`;
 t+=`\nTODAY’S SELF REPORTED ROUTINE\n${ROUTINES.map(r=>`[${checks().includes(r.id)?'x':' '}] ${r.title}`).join('\n')}\n\nLIMITATIONS\nIndependent research prototype. Not clinically validated. No diagnosis, fitness determination, or medication recommendation. Records are manually entered and are not verified. Use approved mission medical procedures. This export has not been transmitted to any medical service.\n`;
 t+=OrbitNeural.summary(OrbitNeural.getCurrentAssessment());
 download(`orbit-${state.mode}-summary-${todayKey()}.txt`,t,'text/plain;charset=utf-8');toast('Health summary exported. Nothing has been transmitted.');}
function entryModal(id){const e=entries().find(e=>e.id===id);if(!e)return;modal('Health check record',new Date(e.at).toLocaleString()+' · '+(state.mode==='demo'?'Sample workspace':'Personal record'),`<div class="review-entry-grid">${Object.entries(META).map(([k,m])=>`<div class="review-entry-item"><span>${m.label.toUpperCase()}</span><strong>${hiddenCell(e,k)||formatNum(e[k],m.digits)+' '+m.unit}</strong>${k==='sys'?`<small>Diastolic: ${formatNum(e.dia)} mmHg</small>`:''}${k==='glucose'&&e.glucoseContext?`<small>${esc(e.glucoseContext)}</small>`:''}</div>`).join('')}</div><div class="prose" style="margin-top:24px"><h3>Symptoms & notes</h3><p class="review-notes">${hiddenCell(e,'notes')?'Hidden. Only this crew member, the crew leader and the medical officer can read check-in notes.':esc(e.notes)||'No observations recorded.'}</p></div>`,button('Close','close-modal'));}
function deleteModal(id){const e=db().entries.find(e=>e.id===id);if(!e)return;modal('Delete health record?',new Date(e.at).toLocaleString(),'<p class="form-help">This removes the selected entry from this browser. Export a copy first if you need to keep it.</p>',`${button('Keep record','close-modal')}<button class="button danger" data-confirm-delete="${esc(id)}">Delete record</button>`);}
function clearModal(){modal('Clear this workspace?',state.mode==='demo'?'Demo data only':'Personal health records',`<div class="delete-confirm"><p>This removes ${db().entries.length} health records , all condition notes, guided assessments, care plans, image observations, emergency checklists, mission risk readings, supplies, workouts, simulated Earth link messages, skin checks, wounds, and daily checklist history from the ${state.mode==='demo'?'demo':'personal'} workspace. It leaves the other workspace intact. Export a copy first if you need one.</p></div>`,`${button('Keep my data','close-modal')}<button class="button danger" data-action="confirm-clear">Clear workspace</button>`);}
const GUIDES={
 'sleep-guide':{title:'Protect your rest period',sub:'Crew reference / Sleep & alertness',body:'<h3>Review the context</h3><p>Record sleep duration alongside schedule changes, workload, noise, and how rested you feel. A short night is a prompt to review your routine; it does not diagnose a sleep disorder.</p><h3>Plan your next rest period</h3><p>Follow the mission light and sleep schedule. Protect a consistent sleep opportunity and review persistent fatigue with your crew medical officer, especially before safety critical tasks.</p><h3>How ORBIT flags this</h3><p>The latest sleep duration appears as “Review” when it falls below your planned sleep target. That target is an adjustable planning preference, not a clinical threshold.</p>'},
 'mood-guide':{title:'Make time for a check-in',sub:'Crew reference / Behavioral health',body:'<h3>Keep an honest record</h3><p>The crew member, the crew leader and the medical officer can see mood entries; the rest of the crew sees only a neutral support prompt. It does not provide a diagnosis or a validated screening result. Note changes in sleep, motivation, concentration, or how daily tasks feel.</p><h3>Use your support channels</h3><p>Follow your private medical communication plan and check in with your crew medical officer about persistent changes. If you feel unable to keep yourself or others safe, tell a crew member and activate your onboard emergency medical procedure immediately.</p><h3>How ORBIT flags this</h3><p>A mood entry of 1 or 2 prompts a supportive check-in reminder. This simple product rule has no established clinical validity.</p>'},
 'measurement-guide':{title:'Take a consistent measurement',sub:'Crew reference / Manual health checks',body:'<h3>Use the mission procedure</h3><p>Use approved equipment and your trained measurement technique. Record the time and context. The instructions below help document a measurement and do not replace the device instructions or mission protocol.</p><h3>Heart rate & blood pressure</h3><p>Record resting readings under similar conditions. Note exercise, symptoms, posture or body restraint, and measurement method. Follow the approved cuff size and placement instructions.</p><h3>Temperature</h3><p>Use the same device and measurement site. Document the method in your notes because different sites and devices can yield different readings.</p><h3>Blood glucose</h3><p>Only test when your medical plan calls for it. Follow your meter procedure and record whether the reading came before a meal, after a meal, or during fasting. Use your prescribed action limits.</p><h3>Sleep & mood</h3><p>Record the hours you actually slept and your current mood. Add useful context, such as a schedule change or unusual workload.</p><h3>Unexpected readings</h3><p>Follow the device and mission procedure for checking an unexpected result. Document symptoms and contact the crew medical officer when the result meets your individual action limits or concerns you.</p>'},
 emergency:{title:'Urgent crew response',sub:'Use your approved mission emergency procedures.',body:'<h3 class="emergency-heading">Symptoms take priority over the dashboard</h3><p>Severe chest pain, serious breathing difficulty, loss of consciousness, signs of stroke, uncontrolled bleeding, or any immediate threat to safety require an immediate crew response.</p><ol><li>Alert the crew and crew medical officer immediately.</li><li>Activate the approved onboard medical emergency procedure for the situation.</li><li>Contact ground medical support through the mission emergency channel when available. Communication delays must not postpone trained immediate care.</li></ol><p>ORBIT cannot detect emergencies, contact medical support, or guide clinical treatment. Do not use a dashboard reading to rule out a serious problem.</p>'},
 reminders:{title:'Your daily task reminders',sub:'Routine support / Local device time',body:'<h3>During an app session</h3><p>The checklist follows the individual schedule entered in Health assessment, with illustrative times until you change them. It starts fresh at midnight in the device’s local time and preserves previous completion history in browser storage.</p><h3>Outside the app</h3><p>Enable in-session reminders and edit each crew member’s schedule under Health assessment → Mission readiness → Edit individual plan. ORBIT checks due tasks while the app is open and visible. It does not send background notifications. Use the mission scheduling system or a device alarm for reliable reminders, and follow your actual medical and exercise schedule.</p>'},
 about:{title:'About ORBIT',sub:'Crew health monitoring / Research prototype',body:'<h3>Built for the challenge</h3><p>ORBIT organizes manually entered health indicators, personal trends, daily routines, and crew condition notes for an exploration mission scenario. The Astronauts dashboard links those records to generic reference anatomy, not patient specific scans. It is an independent prototype and has no NASA affiliation or endorsement.</p><h3>Your data</h3><p>Records and settings stay in this browser’s local storage. The optional Crew assistant sends voice or text, page context, and selected reference anatomy to ElevenLabs and its model provider after you start a session. Health summaries and original images require a separate review and explicit sharing action. These shared copies may be retained under your ElevenLabs settings; ending a session does not delete them. No report is sent to a medical team. An optional compatible Bluetooth heart rate monitor can supply a reading after you choose a device. Uploaded and captured image observations stay in this browser’s image database, and the crew archive can back them up. Guided assessments and individual plans also stay in this browser. The optional offline package caches application and anatomy files, not a separate medical backup. Browser storage is not a clinical record system or an encrypted medical vault. Shared device users may be able to access it. Export a copy before clearing browser storage.</p><h3>Demo & personal workspaces</h3><p>Demo readings are synthetic. You can explore and edit the demo without affecting a separate personal record. Switch workspaces in Mission settings.</p><h3>Clinical limits</h3><p>No clinical validation, diagnosis, medication advice, or fitness for duty assessment is provided. Sleep and mood reminders use simple disclosed product rules, not validated medical triage. The assessment workspace can compare readings with optional, manually entered individual review bands. These are not NASA limits, clinical classifications, or proof of medical fitness. Emergency guidance and guided checklists are educational prompts; onboard procedures govern care. Trend alerts use simple disclosed product rules. Mission risk and supply figures come only from entered records; projections are straight lines, not medical predictions.</p><h3>Sources & image credit</h3><p>Educational content summarizes <a href="https://www.nasa.gov/humans-in-space/the-human-body-in-space/" target="_blank" rel="noopener noreferrer">NASA’s Human Research Program overview of the human body in space</a>. The aurora photograph, taken from the International Space Station, is credited to NASA. Charts reflect only manually entered or synthetic data.</p>'}
};
function guideModal(name){const g=GUIDES[name];if(!g)return;modal(g.title,g.sub,`<div class="prose">${g.body}</div>`,button('Close','close-modal'));}
function navClose(){document.body.classList.remove('nav-open');$('.menu-toggle').setAttribute('aria-expanded','false');}
document.addEventListener('click',e=>{
 const t=e.target.closest('button,a');if(!t)return;if(handleHealthInputControl(t))return;if(handleMissionControl(t))return;if(handleSkinControl(t))return;if(handleCareControl(t))return;if(handleAnatomyControl(t))return;if(handleCrewControl(t))return;
 if(t.dataset.action){const a=t.dataset.action;if(a==='log')logModal();else if(a==='close-modal')closeModal();else if(a==='settings')settingsModal();else if(a==='personal')setMode('personal');else if(a==='export-csv')exportCSV();else if(a==='export-summary')exportSummary();else if(a==='clear-data')clearModal();else if(a==='confirm-clear'){clearWorkspaceWithImages();}else if(a==='more-log'){logLimit+=20;render();}else if(a==='jump-trends')scrollToLogSection('health-trends');else if(a==='jump-records')scrollToLogSection('health-records');else if(a==='menu'){document.body.classList.toggle('nav-open');$('.menu-toggle').setAttribute('aria-expanded',document.body.classList.contains('nav-open'));}else if(GUIDES[a])guideModal(a);}
 if(t.dataset.chart){chartMetric=t.dataset.chart;render();}
 if(t.dataset.range){chartRange=+t.dataset.range;render();}
 if(t.dataset.body){location.hash='anatomy';}

 if(t.dataset.check)toggleCheck(t.dataset.check);
 if(t.dataset.facts)factsModal();
 if(t.dataset.mode)setMode(t.dataset.mode);
 if(t.dataset.entry)entryModal(t.dataset.entry);
 if(t.dataset.delete)deleteModal(t.dataset.delete);
 if(t.dataset.confirmDelete){db().entries=db().entries.filter(r=>r.id!==t.dataset.confirmDelete);persist();closeModal();render();toast('Health record deleted.');}
 if(t.matches('.main-nav a'))navClose();
});
document.addEventListener('change',e=>{if(e.target.id==='trend-metric'){chartMetric=e.target.value;render();}});
document.addEventListener('input',e=>{if(e.target.id==='log-search'){const pos=e.target.selectionStart;filterQuery=e.target.value;render();const input=$('#log-search');input.focus();input.setSelectionRange(pos,pos);}});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
$('.mobile-scrim').addEventListener('click',navClose);
/* Changing tabs: the old page slides out to the right and the new one slides in from the left (quick, and off with reduced motion). */
function pageTransition(update){
 const main=$('#main'),from=main?.dataset.page,to=currentPage();
 const still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!main||!from||from===to||still){update();return;}
 if(document.startViewTransition){
  main.style.viewTransitionName='orbit-page';
  const t=document.startViewTransition(update);
  t.finished.finally(()=>{main.style.viewTransitionName='';});
  return;
 }
 update();main.classList.remove('page-enter');void main.offsetWidth;main.classList.add('page-enter');
}
window.addEventListener('hashchange',()=>{navClose();pageTransition(()=>{render();window.scrollTo(0,0);});});
document.addEventListener('keydown',e=>{if(e.key==='Escape')navClose();});
let lastDay=todayKey();setInterval(()=>{if(todayKey()!==lastDay){lastDay=todayKey();render();}careTick();},30000);
OrbitNeuralLogic.validateModel(OrbitNeuralModel);
OrbitNeural.connect(() => OrbitNeural.assessRecords({records:entries(),baseline:activeCrew().neuralBaseline,model:OrbitNeuralModel,allowed:canSeeWellbeing(),workspace:state.mode}));
hydrateIcons();persist();render();if(storageNotice)toast(storageNotice);
syncConnectivityUI();
window.addEventListener('online',syncConnectivityUI);window.addEventListener('offline',syncConnectivityUI);
/* On phones the switch shows only the current mode, so tapping it toggles. */
$('#connectivity-switch')?.addEventListener('click',e=>{const b=e.target.closest('#connectivity-switch [data-connectivity]');if(!b)return;const compact=matchMedia('(max-width:620px)').matches;setOfflineMode(compact&&b.getAttribute('aria-checked')==='true'?!offlineMode:b.dataset.connectivity==='offline');});
$('#connectivity-switch')?.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();setOfflineMode(!offlineMode);$(`#connectivity-switch [data-connectivity="${offlineMode?'offline':'online'}"]`)?.focus();});
$('#offline-banner-action')?.addEventListener('click',()=>setOfflineMode(connectivityState()!=='offline-mode'));
/* In offline mode, links to other websites stay closed so nothing is requested off the device. */
document.addEventListener('click',e=>{if(!offlineMode)return;const a=e.target.closest('a[href]');if(!a)return;let url;try{url=new URL(a.href,location.href);}catch{return;}if(url.origin===location.origin||!/^https?:$/.test(url.protocol))return;e.preventDefault();e.stopPropagation();toast(`Offline mode: external links are off. Switch to Online to open ${url.hostname}.`);},true);
