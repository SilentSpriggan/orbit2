/* Local reference mapping of user reports. This does not diagnose disease. */
(function(root,factory){const api=factory(typeof module!=='undefined'&&module.exports?require('./bone-report-index.js'):root.OrbitBoneReportIndex);if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrbitConditionAnatomy=api;})(typeof globalThis!=='undefined'?globalThis:this,function(boneInventory){
 'use strict';
 const normalize=s=>String(s??'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9 -]+/g,' ').replace(/\s+/g,' ').trim();
 const rules=[
  ['asthma',/\basthma\b/,'Asthma','airway'],['breathing',/\b(?:shortness of breath|difficulty breathing)\b/,'Breathing concern / lung reference','lungs'],['pneumonia',/\bpneumonia\b/,'Pneumonia','lungs'],
  ['pulmonary-embolism',/\bpulmonary embol(?:ism|us)\b/,'Pulmonary embolism','pulmonary'],
  ['heart-attack',/\b(?:heart attack|myocardial infarction)\b/,'Reported heart attack','heart'],
  ['arrhythmia',/\b(?:arrhythmia|atrial fibrillation|afib)\b/,'Arrhythmia','heart'],
  ['hypertension',/\b(?:hypertension|high blood pressure)\b/,'High blood pressure','cardiovascular'],
  ['kidney-stones',/\b(?:kidney stones?|renal calculi|nephrolithiasis)\b/,'Kidney stones','renal'],
  ['kidney-infection',/\b(?:kidney infection|pyelonephritis)\b/,'Kidney infection','kidneys'],
  ['uti',/\b(?:urinary tract infection|uti|bladder infection|cystitis)\b/,'Urinary tract concern','bladder'],
  ['appendicitis',/\bappendicitis\b/,'Appendicitis','appendix'],['gastritis',/\b(?:gastritis|stomach ulcer)\b/,'Stomach condition','stomach'],
  ['reflux',/\b(?:acid reflux|gerd)\b/,'Reflux','esophagus'],['liver',/\b(?:hepatitis|liver disease|liver injury)\b/,'Liver condition','liver'],
  ['diabetes',/\bdiabetes\b/,'Diabetes / pancreas reference','pancreas'],
  ['bone-loss',/\b(?:osteoporosis|bone loss|bone density loss)\b/,'Bone loss / skeletal reference','skeleton'],
  ['stroke',/\bstroke\b/,'Reported stroke','brain'],['concussion',/\bconcussion\b/,'Concussion / head reference','head'],
  ['headache',/\b(?:headache|migraine)\b/,'Headache / head reference','head'],
  ['sans',/\b(?:sans|spaceflight associated neuro ocular syndrome)\b/,'Neuro ocular reference','eyes'],
  ['vision',/\b(?:blurred vision|vision changes?|eye pain)\b/,'Eye concern','eyes'],
  ['lymph',/\b(?:swollen lymph nodes|lymphadenopathy)\b/,'Lymph node concern','lymphatic'],
  ['dvt',/\b(?:deep vein thrombosis|dvt)\b/,'Deep vein thrombosis','leg-veins'],
  ['pneumothorax',/\b(?:pneumothorax|collapsed lung)\b/,'Pneumothorax','lungs'],
  ['bronchitis',/\bbronchitis\b/,'Bronchitis','airway'],
  ['respiratory-infection',/\b(?:influenza|covid 19|covid19)\b/,'Respiratory infection reference','lungs'],
  ['hypoxia',/\b(?:hypoxia|hypoxemia)\b/,'Low oxygen reference','lungs'],
  ['decompression',/\b(?:decompression sickness|the bends)\b/,'Decompression sickness reference','cardiovascular'],
  ['gallstones',/\b(?:gallstones?|cholecystitis)\b/,'Gallbladder condition','gallbladder'],
  ['pancreatitis',/\bpancreatitis\b/,'Pancreatitis','pancreas'],
  ['colitis',/\b(?:colitis|crohns disease|inflammatory bowel disease)\b/,'Bowel inflammation','bowel'],
  ['thyroid',/\b(?:hypothyroidism|hyperthyroidism|thyroiditis|goiter)\b/,'Thyroid condition','thyroid'],
  ['seizure',/\b(?:seizure|epilepsy)\b/,'Seizure reference','brain'],
  ['nerve',/\b(?:radiculopathy|pinched nerve|sciatica|neuropathy)\b/,'Nerve condition reference','nerves'],
  ['muscle-loss',/\b(?:muscle atrophy|muscle loss|sarcopenia)\b/,'Muscle loss reference','muscles']
 ];
 const fracturePatterns=[['unspecified','Unspecified','A fracture pattern was not supplied.'],['transverse','Transverse','The break crosses the shaft.'],['oblique','Oblique','The break follows an angled plane.'],['spiral','Spiral','The fracture line wraps around the bone.'],['comminuted','Comminuted','The bone has several fragments.'],['segmental','Segmental','Separate breaks isolate a segment.'],['stress','Stress / hairline','A small crack can follow repeated loading.'],['greenstick','Greenstick','An incomplete break affects one side.'],['compression','Compression','The affected bone loses height.'],['impacted','Impacted','Fragments press into each other.'],['avulsion','Avulsion','An attachment pulls away a bone fragment.']].map(([id,name,description])=>({id,name,description}));
 const broken=/\b(?:fractur\w*|broken|broke|cracked bone|bone crack|colles|smiths?|boxers?|bennett|jones fracture)\b/;
 const ordinals=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
 function boneText(s){let n=normalize(s).replace(/\b(?:left|right|bone|bones|of|the|my)\b/g,' ').replace(/\bphalanges\b/g,'phalanx').replace(/\bribs\b/g,'rib').replace(/\b(\d+)(?:st|nd|rd|th)\b/g,'$1');ordinals.forEach((word,i)=>n=n.replace(new RegExp('\\b'+word+'\\b','g'),String(i+1)));return n.replace(/\s+/g,' ').trim();}
 const boneIndex=(boneInventory||[]).map(b=>({...b,terms:[b.name,...b.aliases].map(boneText)}));
 function matchBones(clause){
  let query=boneText(clause).replace(/\bfemoral\b/g,'femur').replace(/\bhumeral\b/g,'humerus').replace(/\btibial\b/g,'tibia').replace(/\bfibular\b/g,'fibula').replace(/\bradial\b/g,'radius').replace(/\bulnar\b/g,'ulna').replace(/\bclavicular\b/g,'clavicle').replace(/\bscapular\b/g,'scapula').replace(/\bpatellar\b/g,'patella').replace(/\bsternal\b/g,'sternum').replace(/\bsacral\b/g,'sacrum').replace(/\bcoccygeal\b/g,'coccyx').replace(/\bmandibular\b/g,'mandible').replace(/\bmaxillary\b/g,'maxilla').replace(/\bcollarbone\b/g,'clavicle').replace(/\bthighbone\b/g,'femur').replace(/\bkneecap\b/g,'patella').replace(/\bshinbone\b/g,'tibia').replace(/\bbreastbone\b/g,'sternum').replace(/\bjawbone\b/g,'mandible').replace(/\btailbone\b/g,'coccyx').replace(/\bheel\b/g,'calcaneus');
  if(/\b(?:colles|smiths?)\b/.test(query))query+=' radius';if(/\bboxers?\b/.test(query))query+=' metacarpal 5';if(/\bbennett\b/.test(query))query+=' metacarpal 1';if(/\bjones fracture\b/.test(query))query+=' metatarsal 5';
  const tokens=new Set(query.split(' ')),matches=[];
  for(const b of boneIndex){let score=0;for(const term of b.terms){const words=term.split(' ');if(words.every(w=>tokens.has(w)))score=Math.max(score,words.length);const code=term.match(/^([ctl]\d{1,2})\b/);if(code&&tokens.has(code[1]))score=Math.max(score,5);}if(score)matches.push({bone:b,score});}
  const best=Math.max(0,...matches.map(x=>x.score));return matches.filter(x=>x.score===best).map(x=>x.bone);
 }
 function fractureDetails(clause){
  if(!broken.test(clause))return null;let pattern='unspecified';
  for(const p of fracturePatterns.slice(1))if(new RegExp('\\b'+p.id+'\\b').test(clause))pattern=p.id;
  if(/\bhairline\b/.test(clause))pattern='stress';
  if(/\b(?:burst|wedge)\b/.test(clause))pattern='compression';
  const zone=/\b(?:distal|colles|smiths?)\b/.test(clause)?'distal':/\bproximal\b/.test(clause)?'proximal':/\b(?:midshaft|mid shaft|shaft)\b/.test(clause)?'shaft':'unspecified';
  return {pattern,zone,open:/\b(?:open|compound)\b/.test(clause),displaced:/\bdisplaced\b/.test(clause)&&!/\b(?:non displaced|nondisplaced|not displaced)\b/.test(clause)};
 }
 const visualFor=key=>({asthma:'airway',bronchitis:'airway',pneumonia:'inflammation','respiratory-infection':'inflammation',arrhythmia:'rhythm','kidney-stones':'stone','kidney-infection':'inflammation',uti:'inflammation',appendicitis:'inflammation',gastritis:'inflammation',pancreatitis:'inflammation',colitis:'inflammation',gallstones:'stone',dvt:'clot','pulmonary-embolism':'clot','bone-loss':'bone-loss',nerve:'neural',seizure:'neural',lymph:'inflammation','muscle-loss':'inflammation'}[key]||null);
 const areaNames={
  knee:['knees','knee'],ankle:['ankles','ankle'],shoulder:['shoulders','shoulder'],elbow:['elbows','elbow'],wrist:['wrists','wrist'],
  hand:['hands','hand','fingers','finger'],foot:['feet','foot','toes','toe'],forearm:['forearms','forearm'],arm:['upper arm','arms','arm'],
  thigh:['thighs','thigh'],shin:['shins','shin','calf','calves','lower leg'],leg:['legs','leg'],hip:['hips','hip'],
  lumbar:['lower back','lumbar'],back:['back'],neck:['neck','cervical'],head:['head'],
  chest:['chest','thorax'],abdomen:['abdomen','abdominal','belly'],pelvis:['pelvis','pelvic'],
  lungs:['lungs','lung'],kidneys:['kidneys','kidney'],heart:['heart'],stomach:['stomach'],eyes:['eyes','eye'],skin:['skin']
 };
 const symptoms=/\b(?:pain|painful|hurts?|hurting|sore|soreness|swollen|swelling|numbness|numb|tingling|sprain|sprained|strain|strained|fracture|fractured|broken|injury|injured|injuries|rash|burn|burning|bleeding|dislocated|dislocation|torn|tear|tendonitis|tendinitis|arthritis|osteoarthritis)\b/;
 const negated=/\b(?:no|not|never|without|dont|doesnt|denies|denied|ruled out|resolved|used to|history of|previously|worried about getting)\b/;
 const urgentTerms=/\b(?:chest pain|heart attack|myocardial infarction|stroke|cannot breathe|cant breathe|severe difficulty breathing|unconscious|severe bleeding|open fracture|compound fracture)\b/;
 const hedged=/\b(?:might|maybe|possibly|could be|not sure|unsure)\b/;
 const healthTerms=/\b(?:anxiety|depression|fever|chills|nausea|nauseous|vomit|vomiting|dizzy|dizziness|lightheaded|faint|fatigue|exhausted|cough|coughing|infection|cramp|cramps|ache|aches|aching|sick|unwell|symptom|symptoms|condition|disease|disorder|syndrome|insomnia|palpitations|weak|weakness|allergy|allergies|bruise|bruised|wound)\b/;
 const adverbialRight=/\bright (?:now|after|before|away|here|there|then|when|since|at|in|on|around)\b/g;
 /* Clauses are split before normalize removes punctuation. A comma list closed by "or" stays whole so "no fever, nausea, or chest pain" keeps its negation. */
 const clauseGroups=text=>text.split(/[.!?;]+(?:\s+|$)/).flatMap(sentence=>{const list=/,\s*n?or\b/i.test(sentence);return sentence.split(/\b(?:but|however)\b/i).map(part=>(list?[part]:part.split(',')).flatMap(x=>normalize(x).replace(/\b(?:left and right|right and left)\b/g,'both').split(/\b(?:and|also)\b/)).map(x=>x.trim()).filter(Boolean));}).filter(group=>group.length);
 const listItem=clause=>clause.split(' ').length<=4&&!/\b(?:is|are|was|were|feels?|seems?|looks?|have|has|had|got)\b/.test(clause);
 const sideFor=(text,index=0,length=text.length)=>{const s=text.replace(adverbialRight,m=>' '.repeat(m.length)),near=s.slice(Math.max(0,index-25),index+length+22),before=s.slice(Math.max(0,index-25),index),b=[...before.matchAll(/\b(left|right|bilateral|both)\b/g)].at(-1);if(b)return ['both','bilateral'].includes(b[1])?'both':b[1];const after=near.match(/\b(left|right|bilateral|both)\b/);return after?(['both','bilateral'].includes(after[1])?'both':after[1]):'unspecified';};
 function parseReport(text,{explicit=false}={}){
  if(typeof text!=='string'||!text.trim()||text.length>1500)return {status:'none',concerns:[]};
  const report=text.trim(),s=normalize(report),teaching=/^(?:please )?(?:show|animate|demonstrate)(?: me)? (?:an? |the )?(?:(?:transverse|oblique|spiral|comminuted|segmental|stress|hairline|greenstick|compression|impacted|avulsion|open|closed|displaced) )?(?:fracture|asthma|pneumonia|arrhythmia|kidney stones?|bone loss|dvt|deep vein thrombosis|inflammation)\b/.test(s),command=teaching||/^(?:please )?(?:highlight|show (?:me )?(?:the )?affected areas?(?: for| of)?|show (?:the )?anatomy for|map (?:my |the )?(?:symptoms|condition)(?: to anatomy)?)/.test(s);
  if(/^(?:what|why|how|does|do|can|could|is|are|would|should)\b/.test(s)&&!explicit)return {status:'none',concerns:[]};
  if(/\b(?:if someone|if i|suppose|imagine|hypothetical|example of)\b/.test(s))return {status:'none',concerns:[]};
  const reporting=/\b(?:i (?:also )?have|ive got|i am experiencing|im experiencing|i am having|im having|i was diagnosed with|ive been diagnosed with|i feel|my .{0,45}(?:hurts|pain|swollen|numb)|patient (?:has|reports|is experiencing|is having)|astronaut (?:has|reports|is experiencing|is having)|crew member (?:has|reports|is experiencing|is having)|we have|he has|she has)\b/.test(s)||/\bi (?:broke|fractured|sprained|strained|injured|tore)\b/.test(s);
  const personalSymptom=/^my\b/.test(s)&&symptoms.test(s);
  const bare=(rules.some(r=>r[1].test(s)&&s.split(' ').length<=5)||broken.test(s)&&matchBones(s).length&&s.split(' ').length<=12)&&!/\b(?:about|explain|teach|learn|could|might|maybe)\b/.test(s);
  if(!explicit&&!command&&!reporting&&!personalSymptom&&!bare)return {status:'none',concerns:[]};
  const concerns=[],seen=new Set();
  function add(key,title,target,side,clause,extra={}){const id=key+'/'+side;if(seen.has(id)||concerns.length>=6)return;seen.add(id);concerns.push({key,title, target,side,...extra});}
  const groups=clauseGroups(report),stated=groups.flat().filter(clause=>!negated.test(clause));
  for(const group of groups)for(const clause of group){
   if(negated.test(clause)||hedged.test(clause))continue;
   /* A bare list item shares the symptom of its neighbours: "my left knee and right shoulder hurt". */
   const mapsArea=symptoms.test(clause)||command||explicit||(listItem(clause)&&group.some(other=>!negated.test(other)&&!hedged.test(other)&&symptoms.test(other)));
   let matched=false;
   for(const [key,re,title,target]of rules){const found=re.exec(clause);if(found){add(key,title,target,sideFor(clause,found.index,found[0].length),clause,{visual:visualFor(key)});matched=true;}}
   const hits=matchBones(clause),fracture=fractureDetails(clause);
   if(hits.length&&(mapsArea||fracture)){const side=sideFor(clause),names=[...new Set(hits.map(b=>b.name.replace(/\b(?:Left|Right|left|right)\s/g,'')))],title=(side==='left'?'Left ':side==='right'?'Right ':side==='both'?'Both ':'')+names.map(n=>n[0].toUpperCase()+n.slice(1)).join(' / ')+(fracture?' · '+(fracture.pattern==='unspecified'?'Fracture (pattern not reported)':fracturePatterns.find(p=>p.id===fracture.pattern).name+' fracture'):' reference');add('bone-'+names.join('-').toLowerCase(),title,'bone',side,clause,{boneIds:hits.map(b=>b.id),fracture,visual:fracture?'fracture':null});matched=true;}
   if(!hits.length&&mapsArea){
    const occupied=[];
    for(const [area,aliases]of Object.entries(areaNames)){
     const matches=aliases.flatMap(name=>[...clause.matchAll(new RegExp('\\b'+name+'\\b','g'))]).sort((a,b)=>a.index-b.index);
     for(const hit of matches){if(occupied.some(([a,b])=>hit.index>=a&&hit.index<b))continue;occupied.push([hit.index,hit.index+hit[0].length]);const side=sideFor(clause,hit.index,hit[0].length),inflammation=/\b(?:sprain|strain|swelling|swollen|arthritis|tendinitis|tendonitis)\b/.test(clause);add('area-'+area,(side==='left'?'Left ':side==='right'?'Right ':side==='both'?'Both ':'')+area.replace('lumbar','lower back')+' reference',area,side,clause,{visual:inflammation?'inflammation':/\brash\b/.test(clause)?'rash':null,needsBone:!!fracture});matched=true;}
    }
   }
  }
  const urgent=reporting&&(stated.some(clause=>urgentTerms.test(clause))||groups.some(group=>{const kept=group.filter(clause=>!negated.test(clause));return kept.some(clause=>broken.test(clause))&&kept.some(clause=>/\b(?:open|compound|pale|blue|cold|numb)\b/.test(clause));}));
  if(concerns.length)return {status:'mapped',report,concerns,urgent,mode:teaching?'educational':'user_report'};
  const healthReport=reporting&&stated.some(clause=>symptoms.test(clause)||healthTerms.test(clause)||urgentTerms.test(clause)||rules.some(r=>r[1].test(clause)));
  if((command||explicit||healthReport)&&stated.length)return {status:'clarify',report,concerns:[],urgent,message:/\b(?:fracture|broken|sprain|injury)\b/.test(s)?'Which bone or body area is involved, and is it on the left, right, or both sides?':'Tell me the body area and side to highlight. A concern alone does not always identify a specific anatomical location.'};
  return {status:'none',concerns:[],urgent};
 }
 const mid=p=>p.bounds[0].map((v,i)=>(v+p.bounds[1][i])/2);
 const paired=(p,side)=>!['left','right'].includes(side)||new RegExp('\\b'+side+'\\b','i').test(p.name);
 function resolveReport(parsed,catalog){
  if(parsed.status!=='mapped')return {...parsed,partIds:[]};
  const all=catalog.parts,byId=new Map(all.map(p=>[p.id,p]));
  const groupBones=(groups,side)=>catalog.bones.filter(b=>groups.includes(b.group)&&paired(b,side)).flatMap(b=>b.meshIds).map(id=>byId.get(id)).filter(Boolean);
  function select(c){
   const n=p=>p.name.toLowerCase(),layer=p=>p.layer||p.system,side=p=>paired(p,c.side);
   const organs={airway:p=>layer(p)==='respiratory'&&/lung|bronch|trachea/.test(n(p)),lungs:p=>layer(p)==='respiratory'&&/lung|bronch/.test(n(p)),pulmonary:p=>(layer(p)==='respiratory'&&/lung/.test(n(p)))||/pulmonary (arter|trunk)/.test(n(p)),heart:p=>layer(p)==='heart'||/coronary arter/.test(n(p)),cardiovascular:p=>layer(p)==='heart'||/^(ascending aorta|arch of aorta|aortic arch|thoracic aorta|abdominal aorta)$/.test(n(p)),renal:p=>layer(p)==='urinary'&&/kidney|ureter/.test(n(p)),kidneys:p=>layer(p)==='urinary'&&/kidney/.test(n(p)),bladder:p=>layer(p)==='urinary'&&/bladder|urethra/.test(n(p)),appendix:p=>layer(p)==='digestive'&&/appendix/.test(n(p)),stomach:p=>layer(p)==='digestive'&&/stomach/.test(n(p)),esophagus:p=>layer(p)==='digestive'&&/esophagus|stomach/.test(n(p)),liver:p=>layer(p)==='digestive'&&/liver/.test(n(p)),pancreas:p=>/pancreas/.test(n(p)),skeleton:p=>layer(p)==='skeleton',brain:p=>layer(p)==='nervous'&&p.bounds[0][1]>1.48&&!/nerve|ganglion/.test(n(p)),eyes:p=>layer(p)==='sensory'&&/eyeball|retina|cornea|iris|lens|sclera|choroid|vitreous/.test(n(p)),lymphatic:p=>layer(p)==='lymphatic',skin:p=>layer(p)==='integumentary'};
   const target={lungs:'lungs',kidneys:'kidneys'}[c.target]||c.target;
   if(organs[target])return all.filter(p=>organs[target](p)&&(!['airway','lungs','renal','kidneys','eyes'].includes(target)||side(p)||!/^left |^right /i.test(p.name)));
   if(target==='bone')return catalog.bones.filter(b=>(c.boneIds?c.boneIds.includes(b.id):normalize(b.name).includes(c.bone))&&side(b)).flatMap(b=>b.meshIds).map(id=>byId.get(id)).filter(Boolean);
   if(target==='leg-veins')return all.filter(p=>layer(p)==='veins'&&side(p)&&/saphenous|femoral|popliteal|tibial|fibular/.test(n(p)));
   if(target==='gallbladder')return all.filter(p=>layer(p)==='digestive'&&/gallbladder|bile duct/.test(n(p)));
   if(target==='bowel')return all.filter(p=>layer(p)==='digestive'&&/colon|intestine|cecum|rectum/.test(n(p)));
   if(target==='thyroid')return all.filter(p=>layer(p)==='endocrine'&&/thyroid/.test(n(p))&&!/parathyroid/.test(n(p)));
   if(target==='nerves')return all.filter(p=>layer(p)==='nervous'&&side(p)&&/sciatic|spinal nerve|spinal cord/.test(n(p)));
   if(target==='muscles')return all.filter(p=>layer(p)==='muscles'&&side(p));
   const groups={hand:['Carpals','Metacarpals','Hand phalanges'],foot:['Tarsals','Metatarsals','Foot phalanges'],wrist:['Carpals'],ankle:['Tarsals'],arm:['Arm and forearm'],forearm:['Arm and forearm'],thigh:['Thigh and leg'],shin:['Thigh and leg'],leg:['Thigh and leg','Tarsals','Metatarsals','Foot phalanges'],hip:['Pelvic girdle'],pelvis:['Pelvic girdle']};
   if(groups[target]){let parts=groupBones(groups[target],c.side);if(target==='arm')parts=parts.filter(p=>/humerus/i.test(p.name));if(target==='forearm')parts=parts.filter(p=>/radius|ulna/i.test(p.name));if(target==='thigh')parts=parts.filter(p=>/femur/i.test(p.name));if(target==='shin')parts=parts.filter(p=>/tibia|fibula/i.test(p.name));if(target==='ankle')parts=parts.filter(p=>/talus|calcaneus/i.test(p.name));return parts;}
   if(['knee','elbow','shoulder'].includes(target)){
    const anchors=all.filter(p=>layer(p)==='skeleton'&&side(p)&&(target==='knee'?/patella/i:target==='shoulder'?/scapula|clavicle/i:/humerus/i).test(p.name));
    const centers=anchors.map(p=>{const center=mid(p);if(target==='elbow')center[1]=p.bounds[0][1];return center;});
    const nearby=all.filter(p=>['cartilage','connective'].includes(layer(p))&&side(p)&&centers.some(center=>mid(p).every((v,i)=>Math.abs(v-center[i])<(i===1?.085:.09))));
    return target==='elbow'&&nearby.length?nearby:[...anchors,...nearby];
   }
   if(['lumbar','back','neck'].includes(target))return all.filter(p=>layer(p)==='skeleton'&&(target==='lumbar'?/lumbar vertebra|sacrum/:target==='neck'?/cervical vertebra|^atlas$|^axis$/:/vertebra|^atlas$|^axis$|sacrum/).test(n(p)));
   if(target==='head')return all.filter(p=>layer(p)==='skeleton'&&p.bounds[0][1]>1.48);
   const region=catalog.regions.find(r=>r.id===({chest:'thorax',abdomen:'abdomen',pelvis:'pelvis'}[target]));
   if(region)return all.filter(p=>['skeleton','heart','respiratory','digestive','urinary'].includes(layer(p))&&mid(p).every((v,i)=>v>=region.bounds[0][i]&&v<=region.bounds[1][i])&&side(p));
   return [];
  }
  const concerns=parsed.concerns.map(c=>{const parts=[...new Map(select(c).map(p=>[p.id,p])).values()],pairedBones=c.side==='unspecified'&&['fracture','stone','clot'].includes(c.visual)&&(c.target==='bone'?catalog.bones.filter(b=>c.boneIds?.includes(b.id)).some(b=>/\b(?:left|right)\b/i.test(b.name)):parts.some(p=>/\b(?:left|right)\b/i.test(p.name)));return {...c,visual:pairedBones?null:c.visual,needsSide:!!pairedBones,partIds:parts.map(p=>p.id),structures:parts.map(p=>p.name),layers:[...new Set(parts.map(p=>p.layer||p.system))]};});
  const mapped=concerns.filter(c=>c.partIds.length),partIds=[...new Set(mapped.flatMap(c=>c.partIds))];
  if(!partIds.length)return {...parsed,status:'clarify',concerns,partIds,message:'That reference could not be localized in this atlas. Specify the body area, side, or bone name.'};
  return {...parsed,concerns:mapped,partIds,label:mapped.map(c=>c.title).join(' + '),unmapped:concerns.filter(c=>!c.partIds.length).map(c=>c.title),note:'User reported concern. Highlighted reference anatomy does not establish a diagnosis or show tissue damage.'};
 }
 function toolReportAllowed(report,messages){const query=normalize(report);return query.length>=3&&messages.some(m=>normalize(m)===query);}
 return {parseReport,resolveReport,normalize,toolReportAllowed,fracturePatterns,matchBones,fractureDetails};
});
