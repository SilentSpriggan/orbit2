import * as THREE from 'three';

// Original teaching geometry. These models describe relationships, not measured
// tissue, patient anatomy, or histology. Every selectable item retains its name.
export const STUDY_MODULES=['muscle','brain','spinal','heart','vessel','lymph','airway','gut','liver','gland','kidney','female','male','eye','ear','skin','bone','dental'];
const C={rose:0xb76f75,red:0xb84d58,blue:0x619bb9,cream:0xd7c9a5,gold:0xd1ac68,green:0x7aa68d,purple:0xa58caf,white:0xe5ddd1,skin:0xc9987c};
export function buildStudyModel(moduleId,entries,{topic=''}={}){
 if(!STUDY_MODULES.includes(moduleId))throw new Error('Unknown anatomy study module');
 const group=new THREE.Group(),parts=new Map(),materials=[],geometries=[];let current=null;
 const material=(color,alpha=1)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.76,metalness:0,side:THREE.DoubleSide,transparent:alpha<1,opacity:alpha,depthWrite:alpha===1});materials.push(m);return m;};
 function add(g,pos,color=C.rose,scale=[1,1,1],alpha=1){if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));geometries.push(g);const mesh=new THREE.Mesh(g,material(color,alpha));mesh.position.set(...pos);mesh.scale.set(...scale);if(current){mesh.userData.studyEntry=current;mesh.userData.part={id:current.id,name:current.name,layer:current.layer,kind:'schematic',conceptId:'ORBIT teaching model',indexCount:g.index.count};if(!parts.has(current.id))parts.set(current.id,[]);parts.get(current.id).push(mesh);}group.add(mesh);return mesh;}
 const ball=(p,s,c,alpha=1)=>add(new THREE.SphereGeometry(1,20,14),p,c,s,alpha);
 const box=(p,s,c)=>add(new THREE.BoxGeometry(...s),p,c);
 const path=(points,r,c)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(16,points.length*6),r,7,false),[0,0,0],c);
 const ring=(p,r,t,c,rot=[0,0,0])=>{const m=add(new THREE.TorusGeometry(r,t,8,36),p,c);m.rotation.set(...rot);return m;};
 const cylinder=(p,r,h,c,arc=Math.PI*2)=>add(new THREE.CylinderGeometry(r,r,h,28,1,false,0,arc),p,c);
 function coil(p,r,height,c,turns=3){const points=[];for(let i=0;i<=64;i++){const t=i/64,angle=t*Math.PI*2*turns;points.push([p[0]+Math.cos(angle)*r,p[1]+height*t,p[2]+Math.sin(angle)*r]);}return path(points,.025,c);}
 function cell(p,c,kind='round',r=.075){const m=ball(p,kind==='flat'?[r*1.7,r*.3,r]:[r,r,r],c);ball([p[0],p[1],p[2]+r*.75],[r*.33,r*.33,r*.33],C.purple);return m;}
 function branch(p,length,c=C.gold,r=.025){path([p,[p[0],p[1]+length*.5,p[2]],[p[0]+length*.22,p[1]+length,p[2]]],r,c);for(const side of [-1,1])path([[p[0],p[1]+length*.45,p[2]],[p[0]+side*length*.25,p[1]+length*.65,p[2]],[p[0]+side*length*.4,p[1]+length*.83,p[2]+.04]],r*.7,c);}
 function fiber(p,length=.6,c=C.rose){const m=ball(p,[.065,length/2,.065],c);for(let j=-3;j<=3;j++)ring([p[0],p[1]+j*length/9,p[2]],.065,.007,C.cream,[Math.PI/2,0,0]);return m;}
 function tooth(p,name){const molar=/molar/.test(name),canine=/canine/.test(name);ball([p[0],p[1]+.08,p[2]],[molar?.085:.06,canine?.11:.07,.06],C.white);path([[p[0],p[1]+.03,p[2]],[p[0]-.015,p[1]-.1,p[2]],[p[0]-.025,p[1]-.17,p[2]]],.025,C.cream);if(molar)path([[p[0]+.035,p[1]+.03,p[2]],[p[0]+.045,p[1]-.14,p[2]]],.025,C.cream);}
 function ossicle(p,n){if(/stapes/.test(n)){const m=ring(p,.09,.018,C.cream);m.scale.y=1.3;box([p[0],p[1]-.11,p[2]],[.2,.025,.07],C.white);}else{ball(p,[.065,.085,.055],C.cream);path([p,[p[0]+.04,p[1]-.11,p[2]],[p[0]+(/incus/.test(n)?-.07:.06),p[1]-.23,p[2]]],.025,C.cream);if(/incus/.test(n))path([p,[p[0]-.1,p[1]-.07,p[2]]],.025,C.cream);}}
 function seed(p,n,i){const angle=i*2.39996;return [p[0]+Math.cos(angle)*.28,p[1]+Math.sin(angle)*.25,p[2]+(i%3)*.07];}
 // The unlabelled substrate gives context; named components below remain separate meshes.
 if(moduleId==='skin'){
  const layers=[C.cream,C.skin,0xbb7f70,0xaa706a,0x956575];layers.forEach((c,i)=>box([0,.42-i*.065,0],[1.5,.055,.7],c));box([0,.02,0],[1.5,.47,.7],0xbd8f7c);box([0,-.36,0],[1.5,.27,.7],C.gold);
 }else if(moduleId==='heart'){
  ball([-.22,.1,0],[.36,.5,.22],C.rose,.2);ball([.22,0,0],[.38,.59,.25],C.red,.2);
 }else if(moduleId==='spinal'){
  cylinder([0,0,0],.07,2.3,C.cream);ball([0,1.28,0],[.18,.2,.12],C.rose);
 }else if(moduleId==='ear'){
  for(let i=0;i<3;i++)ring([.23,.2,0],.28,.025,C.blue,[i===0?Math.PI/2:0,i===1?Math.PI/2:0,i===2?.6:0]);
 }else if(moduleId==='female'){
  ball([0,.1,0],[.26,.38,.12],C.rose,.25);for(const s of [-1,1]){path([[s*.12,.3,0],[s*.35,.49,0],[s*.57,.4,0]],.035,C.rose);ball([s*.58,.31,0],[.13,.07,.07],C.cream);}path([[0,-.16,0],[0,-.4,0],[0,-.62,0]],.07,C.rose);
 }else if(moduleId==='kidney'){
  if(/nephron/i.test(topic)){ring([-.25,.6,0],.17,.035,C.cream);coil([-.25,.54,0],.1,.1,C.red,4);path([[-.1,.59,0],[.1,.3,0],[.1,-.65,0],[.3,-.8,0],[.43,-.65,0],[.43,.3,0]],.035,C.gold);path([[.68,.7,0],[.68,-.9,0]],.05,C.cream);}else{ball([-.13,0,0],[.5,.75,.16],C.rose,.32);for(let i=0;i<7;i++){const a=-1.8+i*.6;const m=add(new THREE.ConeGeometry(.11,.32,18),[-.05+Math.cos(a)*.26,Math.sin(a)*.42,.13],C.red);m.rotation.z=a-Math.PI/2;}path([[.16,.15,0],[.29,-.18,0],[.3,-.78,0]],.055,C.cream);}
 }else if(moduleId==='airway'){
  path([[0,.85,0],[0,.42,0],[-.22,.1,0]],.1,C.cream);path([[0,.42,0],[.24,.15,0],[.38,-.15,0]],.075,C.cream);for(let i=0;i<14;i++){const a=i*2.4;ball([Math.cos(a)*.34,Math.sin(a)*.3-.25,(i%3-1)*.15],[.15,.15,.15],C.rose,.35);}
 }else if(moduleId==='gut'||moduleId==='vessel'){
  [C.rose,C.cream,C.red,C.gold].forEach((c,i)=>cylinder([0,0,0],.26+i*.065,1.25,c,Math.PI*1.4));
 }else if(moduleId==='liver'){
  const shape=new THREE.Shape();for(let i=0;i<6;i++){const a=i*Math.PI/3;if(i===0)shape.moveTo(Math.cos(a)*.7,Math.sin(a)*.7);else shape.lineTo(Math.cos(a)*.7,Math.sin(a)*.7);}shape.closePath();add(new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:false}),[0,0,-.18],C.rose);cylinder([0,0,.1],.085,.4,C.blue).rotation.x=Math.PI/2;
 }else if(moduleId==='eye'){
  [C.rose,C.cream,C.purple,C.blue,C.gold].forEach((c,i)=>box([0,.4-i*.18,-.05],[1.2,.13,.35],c));
 }else if(moduleId==='dental'){
  for(const s of [-1,1])path(Array.from({length:24},(_,i)=>{const a=.15+i/23*(Math.PI-.3);return [Math.cos(a)*.75,s*.28,Math.sin(a)*.57-.15];}),.07,C.rose);
 }else if(moduleId==='brain'){
  ball([-.22,.15,0],[.3,.44,.25],C.rose,.25);ball([.22,.15,0],[.3,.44,.25],C.rose,.25);ball([0,-.38,-.1],[.3,.18,.18],C.cream,.5);path([[0,-.15,0],[0,-.42,0],[0,-.8,0]],.075,C.gold);
 }else if(moduleId==='lymph'){
  ball([0,0,0],[.5,.7,.19],C.green,.25);for(const s of [-1,1])path([[s*.7,.8,0],[s*.42,.45,0],[s*.28,.25,0]],.035,C.green);
 }else if(moduleId==='muscle'){
  ball([0,0,0],[.32,.75,.22],C.rose,.25);path([[0,.8,0],[0,1,0]],.07,C.cream);path([[0,-.7,0],[0,-1,0]],.07,C.cream);
 }else if(moduleId==='bone'){
  cylinder([0,0,0],.22,1.15,C.cream,Math.PI*1.4);cylinder([0,0,0],.14,1.08,C.red,Math.PI*1.4);ball([0,.69,0],[.32,.2,.22],C.white);ball([0,-.69,0],[.32,.2,.22],C.white);
 }else if(moduleId==='male'){
  ball([0,0,0],[.5,.66,.23],C.cream,.2);for(let i=0;i<4;i++)coil([-.25+i*.16,-.35,-.05],.1,.7,C.rose,4);
 }else if(moduleId==='gland'){
  ball([0,0,-.08],[.62,.56,.2],C.rose,.2);
 }
 entries.forEach((entry,i)=>{
  current=entry;const n=entry.name.toLowerCase(),t=entries.length,a=i*2.39996,p=seed([0,0,.24],n,i);
  if(moduleId==='dental'){
   const side=/left/.test(n)?-1:1,upper=/upper|maxillary/.test(n);let index=/central/.test(n)?0:/lateral/.test(n)?1:/canine/.test(n)?2:/first premolar/.test(n)?3:/second premolar/.test(n)?4:/first molar/.test(n)?5:/second molar/.test(n)?6:7;const angle=.13+index/7*1.35;tooth([side*Math.sin(angle)*.75,upper?.25:-.25,Math.cos(angle)*.57-.15],n);
  }else if(moduleId==='skin'){
   const names=['basale','spinosum','granulosum','lucidum','corneum'];const index=names.findIndex(x=>n.includes(x));
   if(index>=0)box([0,.16+index*.065,.12],[1.48,.045,.66],[0x956575,0xaa706a,0xbb7f70,C.skin,C.cream][index]);
   else if(/epidermis/.test(n))box([0,.32,0],[1.52,.31,.72],C.skin);
   else if(/dermis|papillary|reticular/.test(n))box([0,n.includes('papillary')?.08:-.08,.12],[1.45,.12,.65],C.rose);
   else if(/hypoderm|adip/.test(n))for(let j=0;j<8;j++)ball([-.6+j*.17,-.36,.24],[.1,.08,.1],C.gold);
   else if(/hair|arrector/.test(n))path([[-.33,.7,.2],[-.3,.15,.2],[-.18,-.2,.2]],/follicle/.test(n)?.065:.025,/arrector/.test(n)?C.red:C.cream);
   else if(/sweat|eccrine|apocrine/.test(n)){coil([.37,-.12,.22],.08,.2,C.blue,4);path([[.45,-.05,.22],[.48,.45,.22]],.018,C.blue);}
   else if(/sebace/.test(n))for(let j=0;j<4;j++)ball([-.17+j*.035,.03+(j%2)*.05,.25],[.065,.06,.05],C.gold);
   else if(/pacin|lamell/.test(n))for(let j=0;j<4;j++)ring([.05,-.24,.24],.04+j*.023,.008,C.gold);
   else if(/nerve|ending|meissner|merkel|ruffini|corpusc/.test(n))branch(p,.25,C.gold,.012);
   else cell(p,/melan/.test(n)?C.purple:C.cream,/keratin/.test(n)?'flat':'round',.06);
  }else if(moduleId==='spinal'){
   const pair=n.match(/^(c\d|t\d{1,2}|l\d|s\d|co1) spinal/);if(pair){const prefix=pair[1].replace(/\d/g,''),num=Number(pair[1].replace(/\D/g,'')),offset={c:0,t:8,l:20,s:25,co:30}[prefix]+num-1,y=1.1-offset*.071;for(const side of [-1,1])path([[0,y,0],[side*.18,y-.02,.04],[side*.48,y-.09,.06]],.012,C.gold);}
   else if(/horn|column|tract/.test(n)){const k=/dorsal/.test(n)?1:/ventral/.test(n)?-1:0;ball([Math.cos(a)*.1,k*.11-.02,.2],[.07,.12,.035],/horn/.test(n)?C.purple:C.cream);}
   else if(/gangli/.test(n)){ball(p,[.08,.08,.05],C.gold);branch(p,.18);}
   else if(/conus/.test(n))add(new THREE.ConeGeometry(.065,.26,18),[0,-1.13,0],C.cream).rotation.z=Math.PI;
   else branch([Math.cos(a)*.2,1-i/Math.max(1,t)*2,.18],.3,C.gold,.015);
  }else if(moduleId==='ear'){
   if(/malleus|incus|stapes/.test(n))ossicle([(/left/.test(n)?-.58:.35)+(/malleus/.test(n)?-.12:/incus/.test(n)?0:.14),-.28,.1],n);
   else if(/cochlea|corti|scala/.test(n))coil([-.25,-.15,.1],.025+i*.008,.08,C.cream,2.5);
   else if(/semicircular/.test(n)){const m=ring([.25,.23,.07],.27,.027,C.blue);m.rotation.set(/anterior/.test(n)?1.57:0,/posterior/.test(n)?1.57:0,/lateral/.test(n)?.6:0);}
   else if(/tympan/.test(n))ball([-.6,.05,.1],[.02,.18,.16],C.rose);
   else if(/tube/.test(n))path([[-.5,-.15,.05],[-.45,-.42,.05],[-.15,-.6,.05]],.04,C.cream);
   else if(/nerve/.test(n))branch([.1,-.05,.1],.35,C.gold);
   else ball(p,[.1,.075,.06],/muscle/.test(n)?C.rose:C.blue);
  }else if(moduleId==='female'){
   if(/uterus|myometr|endometr|perimetr/.test(n))ball([0,.12,.02],[.27-(i%3)*.035,.36-(i%3)*.03,.09],/endometr/.test(n)?C.gold:C.rose);
   else if(/cervix|vagina/.test(n))cylinder([0,/vagina/.test(n)?-.52:-.23,.06],.07,.24,C.rose,Math.PI*1.5);
   else if(/ovary|follic|corpus/.test(n))for(const s of [-1,1])ball([s*.59,.3,.08],[/ovary/.test(n)?.13:.04,.065,.05],/corpus/.test(n)?C.gold:C.cream);
   else if(/tube|fimbria|ampulla|isthmus/.test(n))for(const s of [-1,1])path([[s*.15,.3,.04],[s*.4,.48,.04],[s*.62,.38,.04]],.025,C.rose);
   else if(/labia|clitoris|vestibule/.test(n)){ball([/left/.test(n)?-.08:.08,-.78,.08],[.035,.15,.03],C.rose);}
   else if(/mammary|lactifer/.test(n)){for(let j=0;j<6;j++)branch([.85,-.35,.04],.18,C.cream);}
   else cell(p,C.gold);
  }else if(moduleId==='kidney'){
   if(/glomerul/.test(n))coil([-.25,.52,.1],.09,.1,C.red,4);
   else if(/bowman|capsule/.test(n))ring([-.25,.59,.08],.17,.025,C.cream);
   else if(/proximal/.test(n))coil([-.05,.35,.05],.1,.2,C.gold,2);
   else if(/distal/.test(n))coil([.43,.35,.05],.1,.2,C.gold,2);
   else if(/descending|ascending|henle/.test(n))path([[/ascending/.test(n)?.43:.1,.35,.04],[/ascending/.test(n)?.43:.1,-.65,.04],[.3,-.8,.04]],.03,C.gold);
   else if(/collect/.test(n))path([[.68,.7,.05],[.68,-.9,.05]],.05,C.cream);
   else if(/cortex|medulla|pyramid/.test(n))ball([-.15,.05,.15],[/cortex/.test(n)?.45:.2,.55,.035],/cortex/.test(n)?C.rose:C.red);
   else if(/calyx|calices|pelvis|ureter/.test(n))path([[.1,.3,.12],[.25,0,.12],[.3,-.65,.12]],.04,C.cream);
   else if(/arter|arteriol/.test(n))branch([-.3,.45,.12],.25,C.red);
   else if(/vein|vasa|capillar/.test(n))branch([-.2,-.6,.12],.5,C.blue);
   else cell(p,/podocyte/.test(n)?C.purple:C.cream);
  }else if(moduleId==='airway'){
   if(/bronch|duct/.test(n))branch([-.15,.1,.1],.5,C.cream,.04);
   else if(/alveol|sac/.test(n))ball(p,[.18,.16,.14],C.rose,.55);
   else if(/capillar|arter/.test(n)){for(let j=0;j<3;j++)ring([p[0],p[1],p[2]+j*.035],.17,.012,C.red);}
   else if(/type i |type 1|squamous/.test(n))cell(p,C.cream,'flat',.08);
   else if(/ciliated|cilia/.test(n)){cell(p,C.blue,'flat');for(let j=0;j<5;j++)path([[p[0]+j*.025,p[1],p[2]],[p[0]+j*.025,p[1]+.12,p[2]]],.006,C.cream);}
   else if(/cartilage/.test(n))ring(p,.13,.03,C.blue);
   else cell(p,/type ii|surfact/.test(n)?C.gold:C.purple);
  }else if(moduleId==='heart'){
   if(/atrium|atrial/.test(n))ball([/right/.test(n)?-.25:.25,.4,.12],[.19,.17,.1],C.rose,.7);
   else if(/ventric/.test(n)&&!/sept|branch|arter/.test(n))ball([/right/.test(n)?-.2:.2,-.15,.12],[.22,.36,.1],C.red,.7);
   else if(/pericard|epicard|myocard|endocard/.test(n)){const k=/fibrous/.test(n)?0:/serous/.test(n)?1:/epicard/.test(n)?2:/myocard/.test(n)?3:4;box([.7,.48-k*.14,.04],[.3,.1,.18],[C.cream,C.rose,C.gold,C.red,C.cream][k]);}
   else if(/node/.test(n))ball([/sino/.test(n)?-.22:-.03,/sino/.test(n)?.51:.18,.23],[.045,.045,.035],C.gold);
   else if(/bundle|purkinje|pathway|coronary|artery/.test(n))branch([Math.cos(a)*.18,-.48+Math.sin(a)*.1,.23],.65,/artery/.test(n)?C.red:C.gold,.012);
   else if(/valve|cuspid|semilunar/.test(n))for(let j=0;j<3;j++)ball([Math.cos(j*2.1)*.07,.07,Math.sin(j*2.1)*.07+.17],[.065,.025,.05],C.cream);
   else if(/septum/.test(n))box([0,-.03,.1],[.055,.7,.14],C.rose);
   else path([[p[0],p[1],.18],[p[0]+.03,p[1]-.2,.19]],.012,C.cream);
  }else if(moduleId==='gut'){
   if(/mucosa|submucosa|muscular|serosa|adventitia/.test(n)){const k=/submucosa/.test(n)?1:/muscular/.test(n)?2:/serosa|adventitia/.test(n)?3:0;cylinder([0,0,0],.265+k*.065,1.3,[C.rose,C.cream,C.red,C.gold][k],Math.PI*1.4);}
   else if(/villi|villus|microvilli|plicae/.test(n))for(let j=0;j<6;j++)ball([-.3+j*.12,.72,.12],[.04,.16,.035],C.rose);
   else if(/plexus|nerve/.test(n))branch([.3,-.4,.28],.6,C.gold,.012);
   else if(/tooth|teeth/.test(n))tooth(p,n);
   else if(/cell|epitheli|gland/.test(n))cell(p,/goblet|mucous/.test(n)?C.blue:C.cream);
   else path([[Math.cos(a)*.2,-.3,.29],[Math.cos(a)*.35,.1,.29],[Math.cos(a)*.15,.5,.29]],.04,C.rose);
  }else if(moduleId==='liver'){
   if(/vein|central/.test(n))cylinder([0,0,.1],.09,.4,C.blue).rotation.x=Math.PI/2;
   else if(/arter|portal|bile/.test(n)){const pos=[Math.cos(a)*.58,Math.sin(a)*.58,.12];cylinder(pos,.045,.25,/bile/.test(n)?C.green:/arter/.test(n)?C.red:C.blue).rotation.x=Math.PI/2;}
   else if(/sinusoid|canalic/.test(n))path([[Math.cos(a)*.55,Math.sin(a)*.55,.1],[Math.cos(a)*.3,Math.sin(a)*.3,.13],[0,0,.13]],.018,/canalic/.test(n)?C.green:C.blue);
   else cell(p,/kupffer/.test(n)?C.purple:C.gold,'flat');
  }else if(moduleId==='eye'){
   if(/rod|cone/.test(n))for(let j=0;j<6;j++){const q=[-.45+j*.17,.36,.22];if(/cone/.test(n))add(new THREE.ConeGeometry(.035,.2,12),q,C.gold);else cylinder(q,.022,.23,C.rose);}
   else if(/ganglion|bipolar|horizontal|amacrine/.test(n))branch([p[0],/ganglion/.test(n)?-.35:0,.24],.25,C.gold,.008);
   else if(/pigment|retina|layer/.test(n))box([0,.45-i*.09,.22],[1.12,.05,.1],i%2?C.rose:C.purple);
   else if(/cornea|lens|iris|sclera|choroid/.test(n))ball(p,[.16,.16,.045],/lens|cornea/.test(n)?C.blue:C.cream,.6);
   else cell(p,C.cream);
  }else if(moduleId==='vessel'){
   const venous=/vein|sinus/.test(n),color=venous?C.blue:C.red;if(/circle of willis/.test(n)){ring([0,.12,.45],.3,.025,C.red);for(let j=0;j<4;j++)branch([Math.cos(j*1.57)*.3,Math.sin(j*1.57)*.3,.45],.25,C.red,.018);}
   else if(/intima|media|adventitia/.test(n))cylinder([0,0,0],.27+(i%3)*.06,1.3,color,Math.PI*1.4);
   else branch([Math.cos(a)*.4,-.6+Math.sin(a)*.2,.4],.5,color,.025);
  }else if(moduleId==='lymph'){
   if(/vessel|duct|afferent|efferent/.test(n))branch([Math.cos(a)*.3,-.6,.2],.8,C.green,.025);
   else if(/capsule|cortex|medulla/.test(n))ball([0,0,.1],[.43-(i%3)*.08,.6-(i%3)*.09,.05],C.green);
   else cell(p,/lymph|cell/.test(n)?C.purple:C.cream);
  }else if(moduleId==='muscle'){
   const column=i%5,row=Math.floor(i/5),y=.55-row*.15;fiber([(column-2)*.15,y,.26],.35,C.rose);
  }else if(moduleId==='brain'){
   if(/fissure|sulcus|tract|peduncle/.test(n))path([[p[0],p[1]-.12,.2],[p[0]+.06,p[1],.25],[p[0],p[1]+.12,.2]],.015,C.gold);
   else if(/lobe/.test(n))ball([Math.cos(a)*.28,Math.sin(a)*.32+.1,.22],[.16,.17,.07],i%2?C.rose:C.cream,.8);
   else if(/arbor/.test(n))branch([0,-.55,.14],.3,C.cream,.012);
   else ball(p,[.075,.065,.05],/nucleus|nigra|gray/.test(n)?C.purple:C.gold);
  }else if(moduleId==='gland'){
   if(/follicle|colloid/.test(n)){ring(p,.1,.023,C.rose);ball(p,[.075,.075,.06],C.gold);}
   else if(/zona|cortex|medulla/.test(n))ring([0,0,.16+(i%4)*.06],.18+(i%4)*.1,.035,[C.gold,C.rose,C.cream,C.purple][i%4]);
   else if(/duct/.test(n))branch([0,-.48,.2],.6,C.cream,.025);
   else if(/acin|islet|lobe|lobule/.test(n))for(let j=0;j<5;j++)cell([p[0]+Math.cos(j*1.26)*.08,p[1]+Math.sin(j*1.26)*.08,.2],C.gold,'round',.045);
   else cell(p,/alpha|acidophil/.test(n)?C.red:/beta|basophil/.test(n)?C.purple:C.cream,'round',.075);
  }else if(moduleId==='male'){
   if(/tubule|seminifer/.test(n))coil([-.25+(i%4)*.15,-.4,.1],.075,.75,C.rose,4);
   else if(/sertoli/.test(n))cell(p,C.cream,'flat',.1);
   else if(/sperm/.test(n)){ball(p,[.02,.04,.02],C.cream);path([p,[p[0]+.03,p[1]-.12,p[2]],[p[0]-.03,p[1]-.23,p[2]]],.005,C.cream);}
   else cell(p,/leydig/.test(n)?C.gold:C.purple);
  }else if(moduleId==='bone'){
   // Unsegmented landmarks are shown on a teaching sample, not identified as source surfaces.
   ball([Math.cos(a)*.24,Math.sin(a)*.55,.24],[.07,.08,.045],C.gold);
  }
 });
 current=null;group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group);
 return {group,parts,bounds,moduleId,entries,dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
