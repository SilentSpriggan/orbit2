/* Local, sourced educational information. No network search or record access. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrbitConditionReference=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 let promise;
 const normalize=s=>String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\bfractured\b/g,'fracture').replace(/\b(fracture|bone|stone|arrhythmia|sprain|strain|seizure|infection|syndrome|condition)s\b/g,'$1').replace(/\s+/g,' ').trim();
 const stop=new Set('i my have a an the of in on is am was been diagnosed with please tell me about explain show animate condition symptoms treatment what are does it mean health'.split(' '));
 const load=()=>promise||=(typeof module!=='undefined'&&module.exports?Promise.resolve(require('./models/condition-reference.json')):fetch('./models/condition-reference.json').then(r=>{if(!r.ok)throw new Error('The local condition reference could not load.');return r.json();})).catch(e=>{promise=null;throw e;});
 function search(data,query,limit=8){
  const q=normalize(query);if(!q)return [];
  const tokens=[...new Set(q.split(' ').filter(t=>!stop.has(t)))];if(!tokens.length)return [];
  return data.topics.map(topic=>{
   const labels=[topic.title,...topic.aliases].map(normalize);let score=0;
   for(const label of labels){
    const exact=label===q,contained=(' '+q+' ').includes(' '+label+' '),words=new Set(label.split(' ')),matched=tokens.filter(t=>words.has(t)).length;
    const candidate=exact?1000:contained&&label.length>=3?500+label.length:matched===tokens.length?100+matched*10:matched>=2?matched*8:label.startsWith(q)?80:0;
    score=Math.max(score,candidate);
   }
   return {topic,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.topic.title.localeCompare(b.topic.title)).slice(0,Math.min(20,limit));
 }
 async function lookup(query,{limit=3}={}){
  if(typeof query!=='string'||!query.trim()||query.length>1500)return {status:'invalid',message:'Name a health topic in 1,500 characters or fewer.'};
  const data=await load(),matches=search(data,query,limit);
  return {status:matches.length?'found':'not_found',source:data.source,snapshot:data.generated,total_topics:data.topics.length,
   references:matches.map(({topic,score})=>({...topic,score,summary:topic.summary.slice(0,6000)})),
   limits:'Reference information, not a diagnosis or individualized treatment. This library is broad, not exhaustive. A fracture type, side and site cannot be established from symptoms alone. Use approved mission medical procedures and qualified review.'};
 }
 return {load,search,lookup,normalize};
});
