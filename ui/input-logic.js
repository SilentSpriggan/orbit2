'use strict';

const InputLogic = (() => {
  const fields = {
    hr: {unit:'bpm',min:0,max:350}, sys: {unit:'mmHg',min:0,max:350}, dia: {unit:'mmHg',min:0,max:250},
    temp: {unit:'°C',min:20,max:50}, sleep: {unit:'hrs',min:0,max:24}, glucose: {unit:'mg/dL',min:0,max:1500},
    mood: {unit:'/ 5',min:1,max:5}, spo2: {unit:'%',min:0,max:100}, rr: {unit:'breaths/min',min:0,max:100},
    fluids: {unit:'mL/day',min:0,max:10000}, exercise: {unit:'min/day',min:0,max:1440}
  };
  const neuralRuntime = () => typeof module !== 'undefined' && module.exports ? require('./neural-adapter.js') : OrbitNeural;
  const neuralModel = () => typeof module !== 'undefined' && module.exports ? require('./neural-model.js') : OrbitNeuralModel;
  function neuralConfig(data) {
    if (data.neural === undefined) return null;
    if (!data.neural || data.neural.model !== neuralModel().name) throw new Error('The dataset declares an unsupported neural model.');
    return {baseline:neuralRuntime().validateBaseline(data.neural.baseline,neuralModel()),units:data.neural.units};
  }
  function validateDataset(data, workspace, now = Date.now()) {
    if (!data || data.format !== 'ORBIT_INDICATOR_DATASET' || data.version !== 1 || typeof data.synthetic !== 'boolean') throw new Error('Use the ORBIT indicator template with version 1 and an explicit synthetic flag.');
    if (data.synthetic && workspace !== 'demo') throw new Error('Synthetic datasets belong in the demo workspace. Switch to demo before importing.');
    if (!Array.isArray(data.entries) || !data.entries.length || data.entries.length > 500) throw new Error('A dataset must contain 1 to 500 entries.');
    if (!data.units || typeof data.units !== 'object') throw new Error('Include the units object from the template.');
    neuralConfig(data);
    return data.entries.map((entry,index) => {
      const prefix = `Entry ${index+1}: `;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(prefix+'expected a measurement record.');
      if (typeof entry.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(entry.at) || !Number.isFinite(Date.parse(entry.at)) || Date.parse(entry.at) > now+60000) throw new Error(prefix+'use a valid ISO timestamp with a timezone, at or before the current time.');
      const record = {at:new Date(entry.at).toISOString(),notes:typeof entry.notes==='string'?entry.notes.slice(0,2000):'',source:data.synthetic?'Synthetic dataset':'Imported measurements'};
      for (const [key,rule] of Object.entries(fields)) {
        if (entry[key] === undefined || entry[key] === null) continue;
        if (data.units[key] !== rule.unit) throw new Error(prefix+`${key} must use ${rule.unit}. No unit conversion is performed.`);
        if (typeof entry[key] !== 'number' || !Number.isFinite(entry[key]) || entry[key] < rule.min || entry[key] > rule.max || (['hr','sys','dia','mood','spo2','rr','fluids','exercise'].includes(key) && !Number.isInteger(entry[key]))) throw new Error(prefix+`check ${key}. Input limits detect entry errors; they are not clinical ranges.`);
        record[key] = entry[key];
      }
      if (Number.isFinite(record.sys) !== Number.isFinite(record.dia) || (Number.isFinite(record.sys) && record.sys <= record.dia)) throw new Error(prefix+'include both pressure values, with systolic greater than diastolic.');
      if (!Object.keys(fields).some(key => Number.isFinite(record[key]))) throw new Error(prefix+'include at least one numeric health indicator.');
      if (Number.isFinite(record.glucose)) record.glucoseContext = ['Fasting','Before meal','After meal'].includes(entry.glucoseContext) ? entry.glucoseContext : 'Not specified';
      if (entry.neural !== undefined) record.neural = neuralRuntime().validateExtras(entry.neural,data.neural?.units,neuralModel());
      return record;
    });
  }
  function fingerprint(record) {
    return JSON.stringify([record.at,...Object.keys(fields).map(key=>record[key]??null),record.glucoseContext||'',record.notes||'',...['stress','mass','fatigue','pain','grip','radiation','co2','gravity','comm_delay'].map(k=>record.neural?.[k]??null)]);
  }
  function uniqueRecords(existing,incoming) {
    const seen = new Set(existing.map(fingerprint));
    return incoming.filter(record => { const key=fingerprint(record); if(seen.has(key))return false;seen.add(key);return true; });
  }
  function parseHeartRate(value) {
    const view = value instanceof DataView ? value : new DataView(value.buffer || value,value.byteOffset||0,value.byteLength);
    if(view.byteLength<2)throw new Error('Incomplete heart rate packet.');
    const flags=view.getUint8(0),wide=Boolean(flags&1);
    if(wide&&view.byteLength<3)throw new Error('Incomplete 16-bit heart rate packet.');
    const bpm=wide?view.getUint16(1,true):view.getUint8(1);
    return {bpm,contactSupported:Boolean(flags&4),contact:flags&4?Boolean(flags&2):null};
  }
  function imageKind(bytes) {
    const a=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    if(a.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>a[i]===n))return 'image/png';
    if(a.length>=3&&a[0]===255&&a[1]===216&&a[2]===255)return 'image/jpeg';
    if(a.length>=12&&String.fromCharCode(...a.slice(0,4))==='RIFF'&&String.fromCharCode(...a.slice(8,12))==='WEBP')return 'image/webp';
    return null;
  }
  function crc32(bytes) {
    let crc=0xffffffff;
    for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    return (crc^0xffffffff)>>>0;
  }
  function zipArchive(entries) {
    if(entries.length>65535)throw new Error('Too many files for this archive.');
    const encoder=new TextEncoder(),files=entries.map(entry=>{
      if(!entry.name || entry.name.startsWith('/') || entry.name.split('/').some(part=>part==='..') || entry.name.includes('\\'))throw new Error('Invalid archive path.');
      return {name:encoder.encode(entry.name),bytes:entry.bytes instanceof Uint8Array?entry.bytes:encoder.encode(entry.bytes)};
    });
    const total=files.reduce((n,f)=>n+76+f.name.length*2+f.bytes.length,22);
    if(total>100*1024*1024)throw new Error('This crew archive exceeds 100 MB. Download individual images instead.');
    const out=new Uint8Array(total),view=new DataView(out.buffer),central=[];
    let position=0;
    for(const file of files){
      const start=position,crc=crc32(file.bytes),size=file.bytes.length,n=file.name.length;
      view.setUint32(position,0x04034b50,true);view.setUint16(position+4,20,true);view.setUint16(position+6,0x800,true);view.setUint16(position+12,0x5c21,true);
      view.setUint32(position+14,crc,true);view.setUint32(position+18,size,true);view.setUint32(position+22,size,true);view.setUint16(position+26,n,true);
      out.set(file.name,position+30);out.set(file.bytes,position+30+n);position+=30+n+size;
      central.push({file,start,crc,size,n});
    }
    const centralStart=position;
    for(const {file,start,crc,size,n}of central){
      view.setUint32(position,0x02014b50,true);view.setUint16(position+4,20,true);view.setUint16(position+6,20,true);view.setUint16(position+8,0x800,true);view.setUint16(position+14,0x5c21,true);
      view.setUint32(position+16,crc,true);view.setUint32(position+20,size,true);view.setUint32(position+24,size,true);view.setUint16(position+28,n,true);view.setUint32(position+42,start,true);out.set(file.name,position+46);position+=46+n;
    }
    view.setUint32(position,0x06054b50,true);view.setUint16(position+8,files.length,true);view.setUint16(position+10,files.length,true);view.setUint32(position+12,position-centralStart,true);view.setUint32(position+16,centralStart,true);
    return out;
  }
  return {fields,neuralConfig,validateDataset,fingerprint,uniqueRecords,parseHeartRate,imageKind,crc32,zipArchive};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=InputLogic;
