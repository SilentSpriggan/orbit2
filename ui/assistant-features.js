/* Shared directory and strict input contracts for the crew assistant. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrbitAssistantFeatures=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const rows=[
    ['find-feature','Find any site feature'],
    ['assessment','Guided health assessment'],['measurement-guide','Measurement guide'],['mission-readiness','Mission readiness'],
    ['manual-entry','Manual health inputs'],['image-records','Photos and imaging'],['heart-rate-sensor','Heart rate sensor'],['dataset-import','Dataset import'],
    ['crew-profile-add','Add crew profile'],['crew-profile-edit','Edit selected crew profile'],['crew-selector','Choose crew member'],
    ['condition-add','Add condition note'],['condition-edit','Edit condition note'],['condition-locate','Locate linked condition region'],['condition-delete','Review deletion of condition note'],
    ['health-record','Inspect health check'],['health-record-delete','Review deletion of health check'],['health-log-more','Show more health checks'],['assessment-record','Inspect saved assessment'],
    ['photo-add','Add image observation'],['photo-open','View saved image'],['photo-download','Download original image'],['photo-delete','Review deletion of image'],
    ['camera-start','Choose camera access'],['camera-capture','Capture camera still'],['camera-stop','Stop camera'],
    ['sensor-connect','Choose Bluetooth monitor'],['sensor-disconnect','Disconnect monitor'],['sensor-use-reading','Draft latest monitor reading'],
    ['dataset-template','Download sample dataset template'],['dataset-review','Review selected dataset'],['dataset-commit','Confirm reviewed dataset import'],['sample-dataset','Review adding synthetic sample data'],
    ['export-summary','Download crew health summary'],['export-csv','Download health CSV'],['export-crew','Download all crew profiles and records'],['export-archive','Download selected crew archive with images'],['medical-handoff','Prepare medical handoff'],
    ['mission-settings','Mission settings'],['workspace-demo','Switch to demo workspace'],['workspace-personal','Switch to personal workspace'],['workspace-clear','Review clearing current workspace'],
    ['offline-prepare','Prepare offline app and anatomy'],['medical-plan','Individual care plan'],['medical-response','Crew medical response'],
    ['review-health-sharing','Review health summary for sharing'],['review-image-sharing','Review selected image for sharing'],
    ['anatomy-bones','All 206 bones'],['anatomy-library','Anatomy library and study collections'],['anatomy-layers','Anatomy system layers'],['anatomy-dissection','Dissection and section planes'],['anatomy-motion','Motion illustrations'],['anatomy-details','Tissue and regional models'],['anatomy-conditions','Condition and fracture illustrations'],['condition-reference','Search local health reference'],['anatomy-sources','Anatomy attribution'],['anatomy-retry','Reload anatomy viewer'],
    ['avatar-yawn','Preview avatar yawn'],['avatar-watch','Avatar wristwatch gesture'],['avatar-preview','Preview avatar movement'],['avatar-pause','Pause avatar motion'],['avatar-resume','Resume avatar motion'],['avatar-reset','Reset avatar view'],
    ['assistant-mute','Mute voice microphone'],['assistant-unmute','Choose microphone unmute'],['assistant-end','End current conversation'],['assistant-expand','Expand assistant controls'],['assistant-minimize','Minimize assistant controls'],
    ['save-form','Save current form'],['cancel-form','Discard current draft'],
    ['confirm-action','Confirm the pending local action by voice'],['cancel-action','Cancel the pending review'],
    ['record-access','Review session access to current workspace records'],['revoke-record-access','Revoke session record access'],
    ['approve-record-access','Allow record access with ElevenLabs'],['approve-health-sharing','Share reviewed summary with ElevenLabs'],['approve-image-sharing','Share reviewed image with ElevenLabs'],
    ['select-crew','Select a crew member by number'],['review-latest-image','Review latest image for the assistant'],
    ['about','About, data and sources'],['reminders','Task reminder information']
  ];
  const features=Object.fromEntries(rows.map(([id,title])=>[id,{id,title}]));
  const text=max=>({type:'text',max}),choice=values=>({type:'choice',values}),number=(min,max)=>({type:'number',min,max});
  const regions=['none','skull','cervical','thoracic','lumbar','pelvis','leftShoulder','rightShoulder','leftKnee','rightKnee','leftLeg','rightLeg','heart','lungs','brain','skeleton'];
  const forms={
    assessment:{id:'care-assessment-form',feature:'assessment',fields:{response:choice(['yes','no','unsure']),breathing:choice(['normal','abnormal','unsure']),flags:{type:'list',values:['chest','breathing','stroke','bleeding','safety']},onset:{type:'datetime'},notes:text(2000)}},
    'crew-profile':{id:'crew-profile-form',feature:'crew-profile-edit',fields:{name:text(60),role:text(60),notes:text(2000)}},
    'condition-note':{id:'condition-form',feature:'condition-add',fields:{title:text(100),region:choice(regions),status:choice(['Active','Monitoring','History']),source:choice(['Crew reported','Clinician documented','Historical record','Sample scenario']),date:{type:'date'},notes:text(2000)}},
    'medical-plan':{id:'care-plan-form',feature:'medical-plan',fields:{reminders:{type:'boolean'},glucoseContext:choice(['Fasting','Before meal','After meal']),protocol:text(160),fluidTarget:number(0,10000),exerciseTarget:number(0,1440),careInstructions:text(4000)}},
    'mission-settings':{id:'settings-form',feature:'mission-settings',fields:{mission:text(40),environment:choice(['Lunar transit','Space station','Lunar surface habitat','Mars transit','Mars surface habitat','Surface rover']),sleepTarget:number(4,12)}},
    'image-record':{id:'input-photo-form',feature:'photo-add',fields:{title:text(100),kind:choice(['Photograph','Ultrasound still','Eye or retinal image','Other medical image']),region:choice(regions),at:{type:'datetime'},method:text(120),notes:text(2000)}}
  };
  for(const task of ['vitals','exercise','nutrition','mood','sleep'])forms['medical-plan'].fields['time-'+task]={type:'time'};
  for(const metric of ['hr','sys','dia','temp','glucose','spo2','rr'])for(const bound of ['min','max'])forms['medical-plan'].fields[metric+'-'+bound]=number(0,10000);
  const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
  function validateFeature(request){
    if(!Object.hasOwn(features,request.feature))throw new Error('Choose a feature ID from get_site_capabilities.');
    const out={kind:'feature',feature:request.feature};
    for(const [key,max]of [['query',150],['item',120]])if(request[key]!==undefined){if(typeof request[key]!=='string'||request[key].length>max)throw new Error('Use a short '+key+'.');out[key]=request[key].trim();}
    return out;
  }
  function validateDraft(request){
    if(!Object.hasOwn(forms,request.form))throw new Error('Choose a supported site form.');
    let values=request.values;
    if(request.values_json!==undefined){if(typeof request.values_json!=='string'||request.values_json.length>10000)throw new Error('Use a JSON object of form values.');try{values=JSON.parse(request.values_json);}catch{throw new Error('Form values must be a valid JSON object.');}}
    if(!plain(values)||!Object.keys(values).length)throw new Error('Supply at least one form value.');
    const out={kind:'form-draft',form:request.form,values:{},replace:request.replace_existing===true};
    if(request.replace_existing!==undefined&&typeof request.replace_existing!=='boolean')throw new Error('replace_existing must be a boolean.');
    for(const [key,value]of Object.entries(values)){
      const rule=Object.hasOwn(forms[request.form].fields,key)?forms[request.form].fields[key]:null;
      if(!rule)throw new Error('Unsupported field: '+key+'.');
      let valid=false;
      if(rule.type==='text')valid=typeof value==='string'&&value.length<=rule.max;
      if(rule.type==='choice')valid=rule.values.includes(value);
      if(rule.type==='number')valid=value===''||(typeof value==='number'&&Number.isFinite(value)&&value>=rule.min&&value<=rule.max);
      if(rule.type==='boolean')valid=typeof value==='boolean';
      if(rule.type==='list')valid=Array.isArray(value)&&value.length<=rule.values.length&&value.every(v=>rule.values.includes(v))&&new Set(value).size===value.length;
      if(rule.type==='time')valid=typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
      if(['date','datetime'].includes(rule.type)){
        const pattern=rule.type==='date'?/^\d{4}-\d\d-\d\d$/:/^\d{4}-\d\d-\d\dT\d\d:\d\d$/;
        valid=typeof value==='string'&&(value===''||(pattern.test(value)&&!Number.isNaN(Date.parse(value))));
        if(valid&&value){const d=new Date(value),date=rule.type==='date'?d.toISOString().slice(0,10):`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;valid=date===value;}
      }
      if(!valid)throw new Error('Check the value and units for '+key+'.');
      out.values[key]=Array.isArray(value)?[...value]:value;
    }
    return out;
  }
  function draftInto(form,action){
    const spec=forms[action.form];if(!form||form.id!==spec.id)throw new Error('The expected form is no longer open.');
    const edits=[];
    for(const [key,value]of Object.entries(action.values)){
      const fields=Array.from(form.elements).filter(el=>el.name===key);
      if(!fields.length||fields.some(el=>el.disabled||['file','hidden','password'].includes(el.type)))throw new Error('That field is unavailable.');
      const rule=spec.fields[key];
      if(fields[0].tagName==='SELECT'&&!Array.from(fields[0].options).some(o=>o.value===value&&!o.disabled))throw new Error('That option is unavailable in this workspace.');
      let current=rule.type==='list'?fields.filter(f=>f.checked).map(f=>f.value):rule.type==='boolean'?fields[0].checked:fields[0].type==='radio'?fields.find(f=>f.checked)?.value||'':fields[0].value;
      const expected=typeof value==='number'?String(value):value;
      const empty=current===''||(Array.isArray(current)&&current.length===0);
      if(form.dataset.assistantDirty==='true'&&!action.replace&&!empty&&JSON.stringify(current)!==JSON.stringify(expected))throw new Error('This draft has unsaved work. Explicitly request a replacement or finish the draft first.');
      edits.push(()=>{for(const field of fields){if(rule.type==='list')field.checked=value.includes(field.value);else if(rule.type==='boolean')field.checked=value;else if(field.type==='radio')field.checked=field.value===value;else field.value=String(value);}});
    }
    edits.forEach(edit=>edit());form.dataset.assistantDirty='true';
    form.dispatchEvent(new Event('change',{bubbles:true}));
    return Object.keys(action.values);
  }
  function pick(records,item='latest'){
    if(!records.length)return null;
    if(!item||item==='latest'||item==='newest')return records[0];
    if(/^[1-9]\d*$/.test(item))return records[Number(item)-1]||null;
    return records.find(r=>r.id===item)||null;
  }
  function capabilities(){return {tool:'use_site_feature',access:'All registered ORBIT features',features:rows.map(([id,title])=>({id,title})),draft_tool:'draft_site_form',forms:Object.fromEntries(Object.entries(forms).map(([name,spec])=>[name,{fields:spec.fields}])),record_selection:'Use latest, a 1-based position in the displayed list, or an exact known record ID. Data stays local until a sharing or conversation-level record permission is granted.',confirmations:'Explicit user commands can save validated forms, cancel drafts, import reviewed data and start exports. Permanent deletes use a review that the user can confirm by voice. Only user input can confirm actions or grant sharing. Session record access covers the current workspace; images need a separate review. Browser permission and file pickers may require a click. No arbitrary script execution or external account control.'};}
  return {features,forms,validateFeature,validateDraft,draftInto,pick,capabilities};
});
