/* Local neural inference only. No UI, network calls, clinical thresholds, or record writes. */
(function(root) {
  'use strict';
  const notice = 'Experimental neural network trained entirely on fictional data. Pattern scores are not human disease probabilities, diagnoses, or medical clearance.';
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  function validateModel(model) {
    if (!object(model) || model.format_version !== 1 || model.window_days !== 7 || model.personal_count !== 16 || !Array.isArray(model.features) || model.features.length !== 20 || !Array.isArray(model.layers) || model.layers.length !== 3) throw Error('Unsupported neural model format.');
    const widths = [60,48,24,5];
    for (const [i,layer] of model.layers.entries()) {
      if (!Array.isArray(layer.weights) || layer.weights.length !== widths[i] || !Array.isArray(layer.bias) || layer.bias.length !== widths[i+1] || layer.bias.some(v => !Number.isFinite(v)) || layer.weights.some(row => !Array.isArray(row) || row.length !== widths[i+1] || row.some(v => !Number.isFinite(v)))) throw Error('Invalid neural weights.');
    }
    for (const [key,values] of Object.entries({mean:model.scaler?.mean,scale:model.scaler?.scale,low:model.feature_bounds?.low,high:model.feature_bounds?.high})) {
      if (!Array.isArray(values) || values.length !== 60 || values.some(v => !Number.isFinite(v) || (key === 'scale' && v <= 0))) throw Error('Invalid neural scaling or coverage bounds.');
    }
    if (!Array.isArray(model.thresholds) || model.thresholds.length !== 5 || model.thresholds.some(v=>!Number.isFinite(v)||v<0||v>1)) throw Error('Invalid neural demonstration thresholds.');
    return model;
  }
  function validateBaseline(baseline,model) {
    if (!object(baseline)) throw Error('A measured preflight baseline is required.');
    const cleaned={};
    for (const f of model.features.slice(0,model.personal_count)) {
      const v=baseline[f.key];
      if (typeof v!=='number'||!Number.isFinite(v)||v<f.min||v>f.max) throw Error('Missing or invalid preflight baseline: '+f.key+'.');
      cleaned[f.key]=v;
    }
    if (cleaned.systolic_bp<=cleaned.diastolic_bp) throw Error('Baseline systolic pressure must exceed diastolic pressure.');
    return cleaned;
  }
  function validate(window,baseline,model) {
    validateBaseline(baseline,model);
    if (!Array.isArray(window)||window.length!==7||window.some(r=>!object(r))) throw Error('Exactly seven complete daily records are required.');
    const days=window.map(r=>r.mission_day);
    if (days.some(d=>!Number.isInteger(d)||d<1)||days.some((d,i)=>i>0&&d-days[i-1]!==1)) throw Error('Mission days must be positive consecutive integers in ascending order.');
    for (const r of window) {
      for (const f of model.features) {
        const v=r[f.key];
        if (typeof v!=='number'||!Number.isFinite(v)||v<f.min||v>f.max) throw Error('Missing or invalid neural measurement: '+f.key+'.');
      }
      if (r.systolic_bp<=r.diastolic_bp) throw Error('Systolic blood pressure must exceed diastolic pressure.');
    }
  }
  function features(window,baseline,model) {
    validate(window,baseline,model);
    const z=window.map(r=>model.features.map((f,j)=>(r[f.key]-(j<model.personal_count?baseline[f.key]:0))/f.scale));
    const mean=model.features.map((_,j)=>z.reduce((s,r)=>s+r[j],0)/7);
    const trend=model.features.map((_,j)=>z.reduce((s,r,i)=>s+(i-3)*(r[j]-z[0][j]),0)/28*6);
    return [...z[6],...mean,...trend];
  }
  function forward(x,model) {
    if (!Array.isArray(x)||x.length!==60||x.some(v=>!Number.isFinite(v))) throw Error('Expected 60 finite neural features.');
    let h=x.map((v,j)=>(v-model.scaler.mean[j])/model.scaler.scale[j]);
    model.layers.forEach((layer,i)=>{h=layer.bias.map((b,j)=>{const v=h.reduce((s,a,k)=>s+a*layer.weights[k][j],b);return i<model.layers.length-1?Math.max(0,v):1/(1+Math.exp(-Math.max(-40,Math.min(40,v))));});});
    return h;
  }
  function assess(window,baseline,model) {
    const x=features(window,baseline,model);
    const outside=x.filter((v,j)=>v<model.feature_bounds.low[j]||v>model.feature_bounds.high[j]||Math.abs((v-model.scaler.mean[j])/model.scaler.scale[j])>8).length;
    const common={model:model.name,model_training_data:'synthetic_only',notice};
    if (outside) return {...common,status:'outside_training_distribution',scores:null,flags:null,ood_feature_count:outside};
    const scores=forward(x,model);
    return {...common,status:'experimental_pattern_scores',scores:Object.fromEntries(model.label_keys.map((k,i)=>[k,scores[i]])),flags:Object.fromEntries(model.label_keys.map((k,i)=>[k,scores[i]>=model.thresholds[i]])),thresholds:Object.fromEntries(model.label_keys.map((k,i)=>[k,model.thresholds[i]]))};
  }
  const api={notice,validateModel,validateBaseline,validate,features,forward,assess,clone};
  root.OrbitNeuralLogic=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
