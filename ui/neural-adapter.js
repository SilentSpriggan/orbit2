/* Connects existing ORBIT measurement records to the model; never invents missing inputs. */
(function(root) {
  'use strict';
  const logic=typeof module!=='undefined'&&module.exports?require('./neural-logic.js'):root.OrbitNeuralLogic;
  const mapping={heart_rate:'hr',systolic_bp:'sys',diastolic_bp:'dia',spo2:'spo2',respiratory_rate:'rr',temperature:'temp',glucose:'glucose',sleep:'sleep',mood:'mood',exercise:'exercise',hydration:'fluids'};
  const supplemental=['stress','mass','fatigue','pain','grip','radiation','co2','gravity','comm_delay'];
  const DAY=86400000;
  let provider=null;
  function validateExtras(values,units,model) {
    if (!values||typeof values!=='object'||Array.isArray(values)) throw Error('Neural supplemental inputs must be an object.');
    const out={};
    for (const [key,v] of Object.entries(values)) {
      if (!supplemental.includes(key)) throw Error('Unknown neural supplemental field: '+key+'.');
      const f=model.features.find(f=>f.key===key);
      if(units?.[key]!==f.unit)throw Error('Declare neural '+key+' units as '+f.unit+'.');
      if(typeof v!=='number'||!Number.isFinite(v)||v<f.min||v>f.max)throw Error('Invalid neural supplemental input: '+key+'.');
      out[key]=v;
    }
    return out;
  }
  function assessRecords({records=[],baseline,model,allowed=false,workspace='personal',now=Date.now(),maxAgeHours=48}={}) {
    const common={scores:null,flags:null,model:model?.name||null,model_training_data:'synthetic_only',notice:logic.notice};
    // Model outputs can reveal private mood/stress information, even when the raw score is hidden.
    if(!allowed)return {...common,status:'restricted',message:'Neural results require access to this crew member’s wellbeing record.'};
    const ordered=records.filter(r=>Number.isFinite(Date.parse(r.at))).slice().sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
    if(!ordered.length)return {...common,status:'insufficient_data',message:'No recorded indicators are available.'};
    const lastAt=Date.parse(ordered.at(-1).at);
    if(lastAt>now+60000)return {...common,status:'invalid_input',message:'Measurements are dated in the future.'};
    if(now-lastAt>maxAgeHours*3600000)return {...common,status:'stale_data',message:'The latest measurement is more than '+maxAgeHours+' hours old.'};
    const lastDay=Math.floor(lastAt/DAY),firstDay=lastDay-6;
    const window=Array.from({length:7},(_,i)=>({mission_day:i+1}));
    const dates=window.map((_,i)=>new Date((firstDay+i)*DAY).toISOString().slice(0,10));
    for(const r of ordered) {
      const day=Math.floor(Date.parse(r.at)/DAY)-firstDay;
      if(day<0||day>6)continue;
      const target=window[day];
      for(const [key,appKey] of Object.entries(mapping)) {
        // Nonfasting glucose must not silently become a fasting model measurement.
        if(key==='glucose'&&r.glucoseContext!=='Fasting')continue;
        if(typeof r[appKey]==='number'&&Number.isFinite(r[appKey]))target[key]=key==='hydration'?r[appKey]/1000:r[appKey];
      }
      for(const key of supplemental)if(typeof r.neural?.[key]==='number'&&Number.isFinite(r.neural[key]))target[key]=r.neural[key];
    }
    const missing=[];
    for(const [i,r] of window.entries())for(const f of model.features)if(r[f.key]===undefined)missing.push({date:dates[i],field:f.key});
    let baselineIssue=null;try{logic.validateBaseline(baseline,model);}catch(error){baselineIssue=error.message;}
    if(missing.length||baselineIssue)return {...common,status:'insufficient_data',missing,baseline_issue:baselineIssue,message:'Seven complete UTC days and an explicit preflight baseline are required. Missing values are unknown.'};
    try{return {...logic.assess(window,baseline,model),workspace,input_origin:workspace==='demo'?'demo_workspace':'recorded_measurements',window_start:dates[0],window_end:dates[6],latest_recorded_at:new Date(lastAt).toISOString()};}
    catch(error){return {...common,status:'invalid_input',message:error.message};}
  }
  function summary(result) {
    let text='\nEXPERIMENTAL NEURAL PATTERN CHECK\n'+logic.notice+'\nStatus: '+result.status+'\n';
    if(result.message)text+=result.message+'\n';
    if(result.baseline_issue)text+=result.baseline_issue+'\n';
    if(result.missing?.length)text+='Missing daily feature values: '+result.missing.length+'\n';
    if(result.scores)for(const [key,score] of Object.entries(result.scores))text+=key+': '+score.toFixed(4)+' (synthetic-label score; '+(result.flags[key]?'demo flag':'below demo threshold')+')\n';
    return text;
  }
  const api={...logic,mapping,supplemental,validateExtras,assessRecords,summary,
    connect(fn){if(typeof fn!=='function')throw Error('A local record provider is required.');provider=fn;},
    getCurrentAssessment(){return provider?logic.clone(provider()):{status:'not_connected',scores:null,notice:logic.notice};}
  };
  root.OrbitNeural=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
