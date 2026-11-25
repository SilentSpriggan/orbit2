/* Allowlisted site commands. Only explicit user input or registered tools enter here. */
(function(root,factory){
  const api=factory(typeof module!=='undefined'&&module.exports?require('./input-logic.js'):InputLogic,typeof module!=='undefined'&&module.exports?require('./condition-anatomy.js'):OrbitConditionAnatomy,typeof module!=='undefined'&&module.exports?require('./assistant-features.js'):OrbitAssistantFeatures);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrbitSiteActions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(inputs,conditionAnatomy,features){
  'use strict';
  const pages={status:'Crew status',
wellbeing:'Health assessment / Sleep & wellbeing',
skin:'Health assessment / Skin & wounds',
exercise:'Health assessment / Exercise',
risks:'Mission health risks',
research:'Evidence library',
crew:'Astronauts',
log:'Health log & trends',
care:'Health assessment',
anatomy:'Anatomy lab',
voice:'Crew voice AI assistant',
routine:'Daily routine',
collect:'Collect vitals'};
  const sections=['assessment','wellbeing','exercise','skin','inputs','measurements','mission'],methods=['manual','images','sensor','dataset'];
  const layers=['skeleton','cartilage','dental','muscles','connective','heart','arteries','veins','nervous','respiratory','digestive','urinary','reproductive','integumentary','lymphatic','endocrine','sensory'];
  const regions=['all','head-neck','thorax','abdomen','pelvis','upper','lower'];
  const panels=['health-entry','medical-response','medical-plan','condition-note','crew-profile','crew-selector','mission-settings','photo-record','export-summary','export-csv','summary-review','image-review'];
  const tasks=['vitals','exercise','nutrition','mood','sleep'];
  const clean=s=>String(s??'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9. /-]+/g,' ').replace(/\.(?=\s|$)/g,' ').replace(/(\d)\s*\/\s*(\d)/g,'$1 / $2').replace(/\s+/g,' ').trim();
  const metricAliases={hr:['heart rate','resting heart rate','pulse'],sys:['blood pressure','pressure'],temp:['temperature','body temperature'],sleep:['sleep','sleep duration'],glucose:['glucose','blood sugar','blood glucose'],mood:['mood'],spo2:['oxygen saturation','spo2','oxygen'],rr:['respiratory rate','breathing rate'],fluids:['fluids','fluid intake','hydration'],exercise:['exercise','exercise duration']};
  const layerAliases={skeleton:['bones','skeleton','skeletal system'],cartilage:['cartilage','discs'],dental:['teeth','dental'],muscles:['muscles','muscular system'],connective:['tendons','ligaments','connective tissue'],heart:['heart','cardiovascular system'],arteries:['arteries'],veins:['veins'],nervous:['nerves','nervous system'],respiratory:['lungs','respiratory system'],digestive:['digestive organs','digestive system'],urinary:['kidneys','urinary system'],reproductive:['reproductive system'],integumentary:['skin'],lymphatic:['lymphatic system'],endocrine:['endocrine system'],sensory:['eyes','sensory structures']};
  const aliases={crew:['astronauts','astronaut dashboard','crew dashboard','crew roster','vitals dashboard'],
log:['health log','log','logged vitals','health records','recorded vitals','vital records','health log and trends','health trends','trends'],
care:['health assessment','assessment'],
anatomy:['anatomy','anatomy lab','3d anatomy','3d model'],
routine:['routine','daily routine','checklist'],
collect:['collect vitals','collection methods','how to take vitals','vitals walkthrough','measurement animations'],
status:['home','overview','dashboard','crew status','crew health','crew health overview','status'],
wellbeing:['sleep and wellbeing','wellbeing','check-in','check in','mental health'],
exercise:['exercise','workouts','exercise tracking'],
skin:['skin and wounds','skin check','skin','wounds','wound tracking','rash'],
risks:['mission health risks','mission risks','radiation','bone density'],
research:['evidence library','research','evidence','citations','sources']};
  const match=(map,s)=>Object.keys(map).find(k=>k===s||map[k].includes(s));
  function validate(request){
    if(!request||typeof request!=='object'||Array.isArray(request))throw new Error('Choose a supported site command.');
    const r={kind:request.kind};
    if(['health-draft','form-draft'].includes(r.kind)&&request.commit!==undefined){if(typeof request.commit!=='boolean')throw new Error('commit must be a boolean.');r.commit=request.commit;}
    const member=(name,list,optional=false)=>{const v=request[name];if(optional&&v===undefined)return;if(!list.includes(v))throw new Error('Unsupported '+name+'.');r[name]=v;};
    switch(r.kind){
      case 'tibia-laceration':break;
      case 'feature':return features.validateFeature(request);
      case 'form-draft':return {...features.validateDraft(request),...(r.commit!==undefined?{commit:r.commit}:{})};
      case 'navigate':member('page',Object.keys(pages));member('section',sections,true);member('input',methods,true);if((r.section||r.input)&&r.page!=='care')throw new Error('Sections belong to Health assessment.');if(r.input){r.section='inputs';}break;
      case 'panel':member('target',panels);break;
      case 'trends':member('metric',Object.keys(metricAliases));member('days',[7,14,30]);break;
      case 'body-system':member('system',['cardiovascular','musculoskeletal','immune','behavioral','nutrition']);break;
      case 'search-log':if(typeof request.query!=='string'||request.query.length>100)throw new Error('Use a short log filter.');r.query=request.query.trim();break;
      case 'anatomy':
        member('operation',['system','show-system','hide-system','region','structure','view','zoom','peel','reset','motion','pause','play','bones','all','none','opacity','isolate-selected','hide-selected','restore','explode','scrub','section','theme','labels','study-topic','study-module','body','expand','library','filter-layer','filter-division']);
        if(['system','show-system','hide-system'].includes(r.operation))member('target',layers);
        if(r.operation==='region')member('target',regions);
        if(r.operation==='view')member('target',['front','back','left','right','reset','iso','fit']);
        if(r.operation==='zoom')member('target',['in','out']);
        if(r.operation==='motion')member('target',['none','elbow','eyes','flow','condition']);
        if(r.operation==='peel')member('value',[0,1,2,3,4]);
        if(['opacity','explode','scrub','section'].includes(r.operation)){if(typeof request.value!=='number'||!Number.isFinite(request.value)||request.value<0||request.value>1)throw new Error('Use a value from zero to one.');r.value=request.value;if(r.operation==='opacity')member('target',layers);}
        if(r.operation==='section')member('target',['off','sagittal','coronal','axial']);
        if(r.operation==='theme')member('target',['studio','clinical']);
        if(['labels','expand'].includes(r.operation))member('target',['on','off']);
        if(r.operation==='library')member('target',['structures','bones','studies','coverage']);
        if(r.operation==='filter-layer')member('target',['all',...layers]);
        if(r.operation==='filter-division')member('target',['all','Axial','Appendicular']);
        if(['structure','study-topic','study-module'].includes(r.operation)){if(typeof request.target!=='string'||!request.target.trim()||request.target.length>120)throw new Error('Name an anatomical structure or study.');r.target=request.target.trim();}break;
      case 'condition-highlight':member('operation',['apply','clear']);if(r.operation==='apply'){if(typeof request.report!=='string'||!request.report.trim()||request.report.length>1500)throw new Error('Describe the reported concern in 1,500 characters or fewer.');r.report=request.report.trim();}break;
      case 'health-draft':{
        if(request.replace_existing!==undefined){if(typeof request.replace_existing!=='boolean')throw new Error('replace_existing must be a boolean.');r.replace=request.replace_existing;}
        const v=request.values;if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Supply measured indicators.');
        const keys=Object.keys(v);if(!keys.length||keys.some(k=>!Object.hasOwn(inputs.fields,k)&&!['notes','glucoseContext','at'].includes(k)))throw new Error('Unknown measurement field.');
        const entry={...v,at:v.at||new Date().toISOString()};
        const units=Object.fromEntries(Object.entries(inputs.fields).map(([k,v])=>[k,v.unit]));
        const [record]=inputs.validateDataset({format:'ORBIT_INDICATOR_DATASET',version:1,synthetic:false,units,entries:[entry]},'personal');
        r.values=Object.fromEntries(Object.keys(v).map(k=>[k,record[k]]));break;
      }
      case 'routine':member('task',tasks);if(typeof request.completed!=='boolean')throw new Error('Specify completed or incomplete.');r.completed=request.completed;break;
      case 'crew':if(!Number.isInteger(request.index)||request.index<1||request.index>99)throw new Error('Choose a crew number.');r.index=request.index;break;
      case 'avatar':member('operation',['pause','resume','reset']);break;
      case 'close-dialog':r.discard=request.discard===true;break;
      case 'help':break;
      default:throw new Error('That site action is not supported.');
    }
    return r;
  }
  function parse(text){
    if(typeof text!=='string'||text.length>1500)return null;
    const combined=text.trim().match(/^(.+?)\s+(?:and|then) save(?: it| this| this form| the form)?[.!?]?$/i);
    if(combined){const draft=parse(combined[1]);if(draft&&['health-draft','form-draft'].includes(draft.kind))return {...draft,commit:true};}
    const fieldCommand=text.trim().match(/^(?:please )?(?:set|change) (?:the |my )?(mission name|mission environment|sleep target|profile name|profile role|profile notes|condition title|condition notes|symptom notes|image title|image notes) to (.+?)[.!]?$/i);
    if(fieldCommand){
      const fields={'mission name':['mission-settings','mission'],'mission environment':['mission-settings','environment'],'sleep target':['mission-settings','sleepTarget'],'profile name':['crew-profile','name'],'profile role':['crew-profile','role'],'profile notes':['crew-profile','notes'],'condition title':['condition-note','title'],'condition notes':['condition-note','notes'],'symptom notes':['assessment','notes'],'image title':['image-record','title'],'image notes':['image-record','notes']};
      const [form,key]=fields[fieldCommand[1].toLowerCase()];let value=fieldCommand[2].trim();
      if(key==='sleepTarget'){value=Number(value.replace(/\s*(?:hours?|hrs?)$/i,''));if(!Number.isFinite(value))return null;}
      if(key==='environment'){const choices=features.forms[form].fields[key].values;value=choices.find(c=>c.toLowerCase()===value.toLowerCase());if(!value)return null;}
      return {kind:'form-draft',form,values:{[key]:value},replace_existing:true};
    }
    let s=clean(text).replace(/^(?:hey orbit |orbit )/,'').replace(/^(?:please |can you |could you |would you |i want you to |i would like you to )/,'').replace(/^please /,'').replace(/ please$/,'');
    if(/^(?:clear|remove|reset) (?:the |my )?(?:condition|symptom|reported|health) highlights?$/.test(s))return {kind:'condition-highlight',operation:'clear'};
    if(/^(?:clear|remove) (?:the |my )?(?:condition|fracture) (?:animation|effects?|illustration)$/.test(s))return {kind:'condition-highlight',operation:'clear'};
    if(/^(?:pause|stop) (?:the )?(?:(?:condition|fracture|anatomy) )?(?:animation|illustration)$/.test(s))return {kind:'anatomy',operation:'pause'};
    if(/^(?:play|resume) (?:the )?(?:(?:condition|fracture|anatomy) )?(?:animation|illustration)$/.test(s))return {kind:'anatomy',operation:'play'};
    const demo=s.replace(/^(?:open|go to) (?:the )?anatomy lab (?:and (?:then )?|then )/,'');
    if(/^(?:show|illustrate|display|simulate) (?:a |the )?(?:skin )?(?:laceration|cut) (?:on|over) (?:the )?(?:skin (?:over|on) (?:the )?)?left (?:tibia|shin)(?: in (?:the )?anatomy lab)?$/.test(demo) ||
       /^(?:show|focus on|isolate) (?:the )?left (?:tibia|shin) (?:with |(?:and (?:then )?|then )(?:show |display |illustrate |make ))(?:a |the )?(?:skin )?(?:laceration|cut)(?: show| appear)?$/.test(demo))
      return {kind:'tibia-laceration'};
    const report=conditionAnatomy.parseReport(text);if(['mapped','clarify'].includes(report.status))return {kind:'condition-highlight',operation:'apply',report:text.trim()};
    if(['help','site commands','show commands','what can you do'].includes(s))return {kind:'help'};
    if(/\b(?:dont|do not|never|instead of)\b/.test(s)||/^(?:how|what|why|if|suppose|imagine)\b/.test(s))return null;
    const approvals={'confirm-action':['confirm action','confirm deletion','confirm delete','confirm import','confirm save','confirm workspace clear','yes confirm'],'cancel-action':['cancel action','cancel review','keep private'],'record-access':['review record access','allow access to my records','enable full record access'],'approve-record-access':['allow record access with elevenlabs'],'revoke-record-access':['revoke record access','stop sharing records'],'approve-health-sharing':['share summary with elevenlabs','share crew summary with elevenlabs'],'approve-image-sharing':['share image with elevenlabs','share photo with elevenlabs'],'review-latest-image':['review latest image with agent','review latest photo with agent'],'assistant-mute':['mute microphone','mute my microphone'],'assistant-unmute':['unmute microphone','unmute my microphone'],'assistant-end':['end session','end conversation'],'assistant-expand':['expand assistant'],'assistant-minimize':['minimize assistant']};
    if(/^(?:yes )?confirm (?:the )?(?:action|deletion|delete|import|save|workspace clear)$/.test(s))return {kind:'feature',feature:'confirm-action'};
    const approval=match(approvals,s);if(approval)return {kind:'feature',feature:approval};
    if(/^(?:save|submit) (?:the |my |this )?(?:current )?(?:form|draft|health check|health data|vitals|assessment|condition note|crew profile|profile|settings|mission settings|individual plan|image record|photo record)$/.test(s))return {kind:'feature',feature:'save-form'};
    if(/^(?:switch to|use) (?:the )?(demo|personal) workspace$/.test(s))return {kind:'feature',feature:'workspace-'+s.match(/(demo|personal)/)[1]};
    if(/^(?:clear|delete) (?:the |my |this )?(?:current )?workspace$/.test(s))return {kind:'feature',feature:'workspace-clear'};
    const featureAliases={'find-feature':['feature finder','feature directory','all features'],'crew-profile-add':['add crew member','new crew member'],'crew-profile-edit':['edit crew profile','edit profile'],'condition-add':['add condition note'],'condition-edit':['edit latest condition note'],'condition-locate':['locate latest condition note'],'health-record':['latest health check','latest health record'],'health-log-more':['more health checks'],'assessment-record':['latest assessment'],'photo-open':['latest photo','latest image'],'photo-add':['add image record'],'camera-start':['start camera','use camera'],'camera-stop':['stop camera'],'camera-capture':['capture still','take photo'],'sensor-connect':['connect heart rate monitor'],'sensor-disconnect':['disconnect monitor'],'sensor-use-reading':['use sensor reading'],'dataset-template':['dataset template'],'dataset-review':['review dataset'],'dataset-commit':['import reviewed dataset'],'sample-dataset':['load sample dataset'],'export-crew':['export crew'],'export-archive':['export crew archive'],'medical-handoff':['prepare medical handoff'],'workspace-demo':['demo workspace'],'workspace-personal':['personal workspace'],'offline-prepare':['prepare offline package'],'anatomy-details':['tissue models'],'anatomy-library':['study collections','anatomy library'],'anatomy-dissection':['dissection tools'],'anatomy-motion':['motion illustrations'],'anatomy-conditions':['conditions and fractures'],'anatomy-sources':['model sources'],'avatar-yawn':['preview yawn'],'avatar-watch':['check watch'],'avatar-preview':['preview avatar motion'],about:['about and data'],reminders:['task reminders']};
    const featureMatch=match(featureAliases,s.replace(/^(?:open|show(?: me)?|go to|use|run) (?:the |my )?/,''))||match(featureAliases,s);
    if(featureMatch)return {kind:'feature',feature:featureMatch};
    if(/^(?:save|submit) (?:the |my )?(?:current )?(?:form|assessment|condition note|crew profile|mission settings|individual plan)$/.test(s))return {kind:'feature',feature:'save-form'};
    const recordAction=s.match(/^(open|view|delete|download) (latest|newest|[1-9]\d*) (health record|health check|condition note|photo|image|assessment)$/);
    if(recordAction){const [,verb,item,type]=recordAction;const feature=type.startsWith('health')?(verb==='delete'?'health-record-delete':'health-record'):type==='condition note'?(verb==='delete'?'condition-delete':'condition-edit'):type==='assessment'?'assessment-record':verb==='delete'?'photo-delete':verb==='download'?'photo-download':'photo-open';return {kind:'feature',feature,item};}
    const module=s.match(/^(?:open|show) (?:the )?(.+?) (?:tissue|detail) model$/);if(module)return {kind:'anatomy',operation:'study-module',target:module[1]};
    const section=s.match(/^(?:show|set) (sagittal|coronal|axial) section(?: at (\d{1,3}) percent)?$/);if(section)return {kind:'anatomy',operation:'section',target:section[1],value:Number(section[2]||50)/100};
    if(/^(?:remove|clear) section plane$/.test(s))return {kind:'anatomy',operation:'section',target:'off',value:.5};
    const labels=s.match(/^(show|hide) (?:anatomy )?labels$/);if(labels)return {kind:'anatomy',operation:'labels',target:labels[1]==='show'?'on':'off'};
    const theme=s.match(/^(?:use|set) (clinical|studio) (?:anatomy )?(?:background|environment)$/);if(theme)return {kind:'anatomy',operation:'theme',target:theme[1]};
    if(/^(?:close|dismiss) (?:the )?(?:dialog|modal)$/.test(s))return {kind:'close-dialog',discard:false};
    if(/^(?:cancel|discard) (?:the |my )?(?:draft|entry|form)$/.test(s))return {kind:'close-dialog',discard:true};
    if(/^(?:pause|resume|reset) (?:the )?(?:avatar|doctor|doctor animation|avatar motion)$/.test(s))return {kind:'avatar',operation:s.split(' ')[0]};
    const crew=s.match(/^(?:select|switch to) crew(?: member)? (\d{1,2})$/);if(crew)return {kind:'crew',index:Number(crew[1])};
    const routine=s.match(/^(?:mark|set) (?:my |the )?(morning health check|vitals|exercise|nutrition|hydration|wellbeing|mood|sleep preparation|sleep) (?:as )?(complete|completed|done|incomplete|not done)$/);
    if(routine){const task=match({vitals:['morning health check','vitals'],exercise:['exercise'],nutrition:['nutrition','hydration'],mood:['wellbeing','mood'],sleep:['sleep preparation','sleep']},routine[1]);return {kind:'routine',task,completed:['complete','completed','done'].includes(routine[2])};}
    const draft=s.match(/^(?:log|record|enter|draft|set|change)(?: my)? (?:resting )?(heart rate|pulse|temperature|sleep|glucose|blood sugar|oxygen saturation|spo2|respiratory rate|fluid intake|exercise|mood)(?: (?:of|is|at|to))? (\d+(?:\.\d+)?)(?: (bpm|c|celsius|hours?|hrs|mg\/dl|percent|breaths per minute|ml|minutes?|out of 5))?$/);
    if(draft){const key=match(metricAliases,draft[1]),units={hr:['bpm'],temp:['c','celsius'],sleep:['hour','hours','hrs'],glucose:['mg/dl'],mood:['out of 5'],spo2:['percent'],rr:['breaths per minute'],fluids:['ml'],exercise:['minute','minutes']};if(draft[3]&&!units[key]?.includes(draft[3]))return null;return {kind:'health-draft',values:{[key]:Number(draft[2])}};}
    const search=s.match(/^search (?:the |my )?health log(?: for (.*))?$/);if(search)return {kind:'search-log',query:search[1]||''};
    const bp=s.match(/^(?:log|record|enter|draft)(?: my)? blood pressure(?: (?:of|is|at))? (\d+) (?:over|\/) (\d+)(?: mmhg)?$/);
    if(bp)return {kind:'health-draft',values:{sys:Number(bp[1]),dia:Number(bp[2])}};
    const nav=s.match(/^(?:open|show(?: me)?|go to|take me to|switch to|navigate to|view|bring up|pull up) (?:the |my |our )?(.+?)(?: page| tab| screen)?$/);
    if(nav){
      const target=nav[1],page=match(aliases,target);if(page)return {kind:'navigate',page};
    const section=match({assessment:['crew assessment','symptom checklist'],inputs:['health inputs'],measurements:['measurement guide','measurement instructions'],mission:['mission readiness','offline preparation']},target);
      if(section)return {kind:'navigate',page:'care',section};
      const input=match({manual:['manual entry','manual inputs'],images:['photos','images','photo records','imaging records'],sensor:['sensor','heart rate sensor','bluetooth sensor'],dataset:['dataset','dataset import']},target);
      if(input)return {kind:'navigate',page:'care',section:'inputs',input};
      const panel=match({'health-entry':['vital entry','health entry','log form','health check form','vital signs form'],'medical-response':['medical response','emergency guide','response guide'],'medical-plan':['individual plan','medical plan'],'condition-note':['condition note','new condition note'],'crew-profile':['new crew profile','add crew member'],'crew-selector':['crew selector'],'mission-settings':['mission settings'],'photo-record':['photo upload','image upload','camera form'],'summary-review':['summary review','health summary review'],'image-review':['image review']},target);
      if(panel)return {kind:'panel',target:panel};
      const system=match({cardiovascular:['cardiovascular system'],musculoskeletal:['bones and muscles','musculoskeletal system'],immune:['immune system'],behavioral:['mind and sleep','behavioral health'],nutrition:['nutrition and hydration']},target);if(system)return {kind:'body-system',system};
    }
    if(/^(?:log|record|enter)(?: my)? (?:vitals|health check|health data|vital signs)$/.test(s))return {kind:'panel',target:'health-entry'};
    const trend=s.match(/^(?:show|view|plot)(?: me)?(?: my)? (.+?)(?: (?:for|over)(?: the)?(?: last| past)? (7|14|30) days?)?$/);
    if(trend){const name=trend[1].replace(/ (?:trends?|chart|history)$/,'');const metric=match(metricAliases,name);if(metric)return {kind:'trends',metric,days:Number(trend[2]||7)};}
    const layer=s.match(/^(show only|show|isolate|hide)(?: me)? (?:the )?(.+)$/);
    if(layer){const target=match(layerAliases,layer[2]);if(target)return {kind:'anatomy',operation:['show only','isolate'].includes(layer[1])?'system':layer[1]==='hide'?'hide-system':'show-system',target};}
    const region=s.match(/^(?:focus on|show region|focus region) (?:the )?(.+)$/);
    if(region){const target=match({'all':['whole body'],'head-neck':['head and neck','head','neck'],thorax:['thorax','chest'],abdomen:['abdomen'],pelvis:['pelvis','pelvis and perineum'],upper:['upper extremities','arms'],lower:['lower extremities','legs']},region[1]);if(target)return {kind:'anatomy',operation:'region',target};}
    const structure=s.match(/^(?:find|locate|select)(?: the)? (.+)$/);if(structure)return {kind:'anatomy',operation:'structure',target:structure[1]};
    const view=s.match(/^(?:rotate|turn)(?: (?:the )?(?:model|anatomy))? (?:to )?(front|back|left|right)$/);if(view)return {kind:'anatomy',operation:'view',target:view[1]};
    const zoom=s.match(/^zoom (in|out)$/);if(zoom)return {kind:'anatomy',operation:'zoom',target:zoom[1]};
    if(/^(?:reset|restore) (?:the )?(?:anatomy|anatomy view|model)$/.test(s))return {kind:'anatomy',operation:'reset'};
    if(/^(?:show|open)(?: the)? (?:206 bones|bone inventory)$/.test(s))return {kind:'anatomy',operation:'bones'};
    if(/^(?:review|share)(?: my| the)? (?:health summary|crew summary)$/.test(s))return {kind:'panel',target:'summary-review'};
    if(/^(?:review|share)(?: the| my)? (?:selected image|selected photo)$/.test(s))return {kind:'panel',target:'image-review'};
    const exp=s.match(/^(?:export|download)(?: my| the)? (?:health |crew )?(summary|report|csv)$/);if(exp)return {kind:'panel',target:exp[1]==='csv'?'export-csv':'export-summary'};
    return null;
  }
  function capabilities(){return {left_tibia_laceration_tool:'show_left_tibia_laceration',feature_access:features.capabilities(),pages,care_sections:sections,input_methods:methods,panels,trend_metrics:Object.keys(metricAliases),trend_days:[7,14,30],anatomy_layers:layers,anatomy_regions:regions,anatomy_additional_controls:{section:{target:['off','sagittal','coronal','axial'],value:'0–1'},theme:['studio','clinical'],labels:['on','off'],'study-topic':'Exact topic ID or unambiguous title from the study library','study-module':'Exact module ID or unambiguous displayed name',body:'Return to body',expand:['on','off'],library:['structures','bones','studies','coverage'],'filter-layer':['all',...layers],'filter-division':['all','Axial','Appendicular'],view:['front','back','left','right','iso','fit','reset']},reported_concern_highlights:{tool:'highlight_health_concern',examples:['My left knee hurts','I have asthma','I have left kidney stones','Clear condition highlights'],note:'Maps the user’s own current report to generic reference anatomy. Recognizes all 206 inventory bone names. Explicitly named fractures and supported conditions can show schematic teaching effects. No patient lesion geometry, diagnosis, record saving, or image interpretation.'},condition_reference:{tool:'get_condition_reference',topics:1017,source:'MedlinePlus, National Library of Medicine',query:'Named condition, symptom or injury; public local summaries only',limits:'Broad but not exhaustive. Schematic effects are not patient imaging.'},routine_tasks:tasks,health_units:Object.fromEntries(Object.entries(inputs.fields).map(([k,v])=>[k,v.unit])),examples:['I have a spiral fracture of my left femur','Show a comminuted fracture of the right tibia','Animate asthma','Pause condition animation','My left knee hurts','I have asthma','Clear condition highlights','Open anatomy lab','Show sleep trends for 30 days','Open measurement guide','Isolate bones','Find left femur','Log heart rate 72 bpm','Mark exercise complete'],limits:'Site controls stay inside ORBIT. Health entry starts as a draft; an explicit Save command can commit it. The user may confirm local reviews by voice. Sharing requires its review and explicit user approval. Device pickers require a user click. All site features are registered through use_site_feature. Deletion and workspace clearing open specific confirmation dialogs, which only the user can approve. Paginated saved records are available through get_site_records after conversation-level workspace consent. No treatment orders, external navigation, arbitrary scripts, or automatic sharing.'};}
  function create({perform,getScope}){
    let generation=0,queue=Promise.resolve();
    const cancelled=()=>({status:'cancelled',message:'The crew or conversation changed. Nothing else was applied.'});
    return {reset(){generation++;queue=Promise.resolve();},execute(request,{isCurrent=()=>true,source='tool'}={}){
      let action;try{action=validate(request);}catch(e){return Promise.resolve({status:'invalid',message:e.message});}
      const scope=getScope(),stamp=generation;
      const check=()=>stamp===generation&&getScope()===scope&&isCurrent();
      const run=async()=>{if(!check())return cancelled();try{return await perform(action,{check,source});}catch(e){return {status:'error',message:'The site action could not finish. '+String(e.message||'Try again.').slice(0,180)};}};
      const result=queue.then(run,run);queue=result.catch(()=>{});return result;
    }};
  }
  return {pages,sections,methods,layers,regions,panels,tasks,parse,validate,capabilities,create};
});
