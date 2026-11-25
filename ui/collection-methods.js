/* Collection methods, instrument-specific observations and display units. */
'use strict';
const CollectionMethods = (() => {
  const fields = {};
  function measure(id, label, unit, min, max, whole=false) { fields[id]={label,unit,min,max,whole}; }
  measure('hr','Heart rate','bpm',0,350,true); measure('rr','Respiratory rate','breaths/min',0,100,true);
  measure('hrvRmssd','R–R variability (RMSSD)','ms',0,1500);
  measure('sys','Brachial systolic','mmHg',0,350,true); measure('dia','Brachial diastolic','mmHg',0,250,true);
  measure('temp','Temperature','°C',20,50); measure('spo2','Oxygen saturation (SpO₂)','%',0,100);
  measure('glucose','Glucose','mg/dL',0,1500);
  measure('cabinCO2','Local CO₂ partial pressure','mmHg',0,760);
  measure('doseRate','Personal dose rate','mSv/h',0,null);
  measure('pr','PR interval','ms',0,null); measure('qrs','QRS duration','ms',0,null);
  measure('qtc','Corrected QT interval','ms',0,null); measure('axis','QRS axis','°',-180,180);
  measure('fingerSys','Finger systolic','mmHg',0,null); measure('fingerDia','Finger diastolic','mmHg',0,null);
  measure('centralSys','Estimated central systolic','mmHg',0,null); measure('centralDia','Estimated central diastolic','mmHg',0,null);
  measure('pwv','Pulse wave velocity','m/s',0,null); measure('sv','Stroke volume','mL/beat',0,null);
  measure('co','Cardiac output','L/min',0,null); measure('svr','Systemic vascular resistance','dyn·s/cm⁵',0,null);
  measure('skinTemp','Skin temperature','°C',0,60); measure('light','Illuminance','lux',0,null);
  measure('activity','Activity count for recorded epoch','counts',0,null,true);
  measure('fev1','Forced expiratory volume in 1 second (FEV₁)','L',0,null);
  measure('fvc','Forced vital capacity (FVC)','L',0,null); measure('ratio','FEV₁/FVC','%',0,100);
  measure('etco2','End-tidal CO₂','mmHg',0,null); measure('vo2','Oxygen uptake (V̇O₂)','L/min',0,null);
  measure('vco2','CO₂ production (V̇CO₂)','L/min',0,null);
  measure('ijvArea','Jugular cross-sectional area','cm²',0,null);
  measure('velocity','Doppler velocity (signed)','cm/s',null,null);
  measure('onsd','Optic nerve sheath diameter','mm',0,null); measure('iop','Intraocular pressure','mmHg',0,null);
  measure('rnfl','Retinal nerve fiber layer thickness','µm',0,null);
  measure('ph','Blood pH','',0,14); measure('pco2','Blood PCO₂','mmHg',0,null); measure('po2','Blood PO₂','mmHg',0,null);
  measure('lactate','Lactate','mmol/L',0,null); measure('sodium','Sodium (Na⁺)','mmol/L',0,null);
  measure('potassium','Potassium (K⁺)','mmol/L',0,null); measure('calcium','Ionized calcium','mmol/L',0,null);
  measure('hct','Hematocrit','%',0,100);
  fields.sound={label:'Recorded sound observation',unit:'',options:['Vesicular breath sounds','Adventitious sounds','Diminished sounds','Signal obscured by noise','Other finding on report']};
  fields.flow={label:'Reported Doppler flow',unit:'',options:['Forward','Bidirectional','Retrograde','No detectable flow','Indeterminate']};
  const side={label:'Side measured',choices:['Right','Left']};
  const instrument=(id,name,keys,context)=>({id,name,keys:keys.split(' '),context});
  const methods=[
    {id:'preparation',title:'Cabin preparation',category:'Baseline conditions',seconds:14,bounds:[0,4,8,14],
      description:'Establish the breathing-zone environment and document how the crew member was stabilized before acquisition.',
      equipment:'Breathing-zone CO₂ monitor (AWAM), personal dosimeter (CPDS), foot loops and pelvic restraint.',
      stages:[
        ['Scan the breathing zone','In microgravity, exhaled air can linger near the face. The collar monitor samples the local environment while the animation shows cabin airflow dispersing the plume.','Local ppCO₂ · 2.4 mmHg'],
        ['Stabilize the crew member','Foot loops and the pelvic restraint limit movement at the instrument rack. The schematic shows the rack connection. Grounding and equipment setup follow the rack-specific procedure.','Foot loops and pelvic restraint'],
        ['Capture baseline conditions','A headward fluid shift changes the distribution of blood in microgravity. Record the posture and rest interval used for this acquisition so later readings have context.','Baseline hold · time compressed']
      ],
      note:'Record the CO₂ reading with its sampling interval. NASA’s 3 mmHg cabin requirement applies to the one-hour average in habitable air.',
      devices:[instrument('air','Local CO₂ monitor','cabinCO2'),instrument('dose','Personal radiation dosimeter','doseRate')],
      refs:[['NASA · Cabin carbon dioxide','https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf']]},
    {id:'ecg',title:'ECG & smart garments',category:'Cardiovascular',seconds:15,
      description:'Follow an electrical heartbeat from textile contacts or ten diagnostic electrodes to a synchronized tracing.',
      equipment:'CSA Bio-Monitor / Hexoskin smart garment with thoracic and abdominal bands, or a 12-lead ECG recorder.',
      stages:[
        ['Fit the textile sensors','Conductive contacts on the fitted shirt sense cardiac electrical activity. Thoracic and abdominal inductance bands change shape as the chest and abdomen expand.','Thoracic and abdominal bands'],
        ['Identify the lead configuration','A diagnostic 12-lead ECG uses ten electrodes to view the heart from different directions. Record whether the limb electrodes used conventional placement or a torso-modified montage.','Four limb and six chest electrodes'],
        ['Read the synchronized traces','The P wave, QRS complex and T wave repeat across the leads. Copy the rate, intervals and axis reported by the instrument, together with the acquisition configuration.','HR 58 bpm · PR 162 ms · QTc 418 ms']
      ],note:'Sampling rate and electrode preparation depend on the garment or recorder. The animation illustrates contact placement and signal formation.',
      devices:[instrument('shirt','Smart garment ECG / RIP','hr rr hrvRmssd'),instrument('ecg12','12-lead ECG recorder','hr pr qrs qtc axis',{label:'Recorded montage',choices:['Standard limb placement','Torso-modified limb placement','Other or unspecified on report']})],
      refs:[['CSA · Bio-Monitor','https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp'],['American Heart Association · ECG','https://www.heart.org/en/health-topics/heart-attack/diagnosing-a-heart-attack/electrocardiogram']]},
    {id:'pressure',title:'Beat-to-beat blood pressure',category:'Hemodynamics',seconds:15,
      description:'Compare the finger pressure waveform, upper-arm cuff reading and estimates from pulse-wave analysis.',
      equipment:'Finapres / Cardiopres finger cuff with a height reference, and an upper-arm oscillometric monitor such as Mobil-O-Graph.',
      stages:[
        ['Track the arterial pulse','An optical sensor detects changes in finger arterial volume. A pneumatic servo adjusts cuff pressure beat by beat. The upper-arm cuff takes a separate brachial measurement.','Finger volume clamp'],
        ['Reference the waveform','The instrument uses its heart-level reference and calibration procedure. Record which site and acquisition mode produced the displayed pressure.','Heart-level reference'],
        ['Compare reported pressures','Direct finger pressure, brachial cuff pressure and a reconstructed central pressure describe different sites. Enter model-derived values only when the configured system reports them.','Brachial 116/72 mmHg · estimated central 106/73 mmHg']
      ],
      devices:[instrument('brachial','Upper-arm oscillometric cuff','sys dia hr'),instrument('finapres','Continuous finger cuff','fingerSys fingerDia hr'),instrument('pwa','Pulse-wave analysis report','centralSys centralDia pwv sv co svr')],
      refs:[['Finapres · Measurements and calibration','https://www.finapres.com/faq'],['Finapres · Height correction','https://www.finapres.com/technologies/height-correction-unit']]},
    {id:'temperature',title:'Core temperature',category:'Thermal & circadian',seconds:15,
      description:'Compare a forehead heat-flow estimate, gastrointestinal capsule telemetry and a tympanic spot measurement.',
      equipment:'Forehead double sensor, a gastrointestinal telemetry capsule and receiver, or a tympanic infrared thermometer such as the Braun PRO 6000. A skin patch or Actiwatch provides peripheral temperature or circadian context.',
      stages:[
        ['Observe near-skin heat transfer','The thermal overlay shows how a warm boundary layer surrounds the skin when buoyancy-driven convection is reduced. Ventilation and exercise affect the measurement context.','Surface heat distribution'],
        ['Trace the forehead heat signal','A forehead heat-flow sensor estimates core temperature using its thermal design. Its contact and stabilization requirements depend on the model.','Forehead estimate · 37.12 °C'],
        ['Compare measurement sites','The receiver picks up radio telemetry from a gastrointestinal capsule. A tympanic thermometer uses infrared emission at the ear for a separate spot measurement. Save the site with each value.','GI 37.18 °C · tympanic 36.95 °C']
      ],
      devices:[instrument('forehead','Forehead heat-flow sensor','temp'),instrument('capsule','Gastrointestinal telemetry capsule','temp'),instrument('ear','Tympanic infrared thermometer','temp',side),instrument('patch','Skin temperature patch','skinTemp'),instrument('actigraphy','Wrist actigraphy / light sensor','activity light')],
      refs:[['ESA · Space fever and forehead thermometry','https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Space_fever'],['NASA · Actigraphy and light exposure','https://humanresearchroadmap.nasa.gov/Tasks/task.aspx?i=759']]},
    {id:'pulmonary',title:'Respiratory function',category:'Pulmonary & metabolic',seconds:15,
      description:'See how exhaled gas, airflow, optical pulse signals and breath sounds become separate observations.',
      equipment:'Pulmonary Function System with a pneumotachometer, gas analyzer, sidestream capnograph, reflectance pulse oximeter and an electronic stethoscope such as the Littmann 3200.',
      stages:[
        ['Capture breathing and oxygenation','The oximeter samples pulsatile red and infrared light at the forehead. The breathing circuit measures flow, while a sidestream line samples exhaled gas for CO₂.','SpO₂ 99% · different sensor from ETCO₂'],
        ['Read the breath curves','A capnogram tracks exhaled CO₂ through a breath. Spirometry measures forced volume in the first second (FEV₁) and the full forced vital capacity (FVC). Metabolic systems can also report oxygen uptake and CO₂ production.','ETCO₂ 39 mmHg · FEV₁/FVC 84%'],
        ['Review the acoustic signal','An electronic chest piece captures breath sounds against cabin noise. Record the operator’s observation and the listening site. Noise filtering can improve audibility.','Chest audio · raw and filtered']
      ],note:'Record the instrument’s quality assessment in the notes if available. Lung sound and spirometry observations require clinical interpretation.',
      devices:[instrument('spirometer','Spirometer / PFS','fev1 fvc'),instrument('capnograph','Sidestream capnograph','etco2 rr'),instrument('oximeter','Pulse oximeter','spo2 hr'),instrument('metabolic','Metabolic gas analyzer','vo2 vco2'),instrument('stethoscope','Electronic stethoscope','sound rr',side)],
      refs:[['ESA / NASA · Pulmonary Function System','https://wsn.spaceflight.esa.int/docs/Factsheets/22%20PFS%20HR_WEB.pdf'],['MedlinePlus · Pulse oximetry','https://medlineplus.gov/lab-tests/pulse-oximetry/']]},
    {id:'ocular',title:'Venous & ocular screening',category:'Ultrasound & ophthalmology',seconds:15,
      description:'Follow three examinations of the jugular vein, optic nerve sheath and intraocular pressure.',
      equipment:'Ultrasound system with B-mode and Doppler (such as Ultrasound 2), an ocular ultrasound probe, a rebound tonometer and, when available, optical coherence tomography (OCT).',
      stages:[
        ['Image the jugular vein','B-mode displays the vessel in cross-section. Doppler adds flow information, which the operator interprets with probe orientation and settings. Preserve the side and the reported flow pattern.','Internal jugular vein · B-mode and Doppler'],
        ['Measure the optic nerve sheath','In the ocular cross-section, calipers mark the visible sheath behind the globe. Enter the operator’s diameter and eye. A single diameter cannot establish intracranial pressure or a SANS diagnosis.','Sheath measurement · 6.1 mm'],
        ['Record each eye separately','A rebound tonometer estimates intraocular pressure from the response of its brief corneal contact. OCT provides a separate structural image. Record the device output for the corresponding eye.','IOP · right 18 mmHg / left 17 mmHg']
      ],note:'These views illustrate measurements made by a trained operator using the approved equipment and examination procedure.',
      devices:[instrument('jugular','Jugular ultrasound / Doppler','ijvArea velocity flow',side),instrument('sheath','Ocular ultrasound','onsd',side),instrument('tonometry','Tonometer','iop',side),instrument('oct','Optical coherence tomography','rnfl',side)],
      refs:[['NASA · Spaceflight-associated neuro-ocular syndrome','https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf'],['JAMA Network Open · Jugular flow in spaceflight','https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2755307']]},
    {id:'chemistry',title:'Point-of-care blood chemistry',category:'Blood gases & electrolytes',seconds:15,
      description:'Trace a small blood sample from a surface-tension droplet through a cartridge to the analyzer result.',
      equipment:'Abbott i-STAT 1 analyzer, specimen-appropriate cartridge and collection supplies. Available analytes depend on both cartridge and specimen.',
      stages:[
        ['Observe the sample','Surface tension holds a droplet to a surface in microgravity. The operator identifies the cartridge and specimen type before collection.','Capillary specimen · illustrative'],
        ['Follow the microfluidic path','The sample moves through the collection tube by capillary action. A cartridge directs it into the sensing chamber. Use the specific cartridge’s instructions for accepted specimens, fill volume and preparation.','Sample well → sensing chamber'],
        ['Read the analyzer output','Electrochemical sensors produce the cartridge-specific panel. Transcribe only results the analyzer actually released for that specimen. Preserve the cartridge and specimen type.','CG4+ capillary · pH 7.41 / PCO₂ 41.2 mmHg']
      ],note:'The US CHEM8+ listing accepts arterial or venous whole blood. For CG4+, pH and blood gases may be reported from capillary blood. Lactate requires arterial or venous blood.',
      devices:[instrument('cg4cap','i-STAT CG4+ · capillary whole blood','ph pco2 po2'),instrument('cg4av','i-STAT CG4+ · arterial or venous','ph pco2 po2 lactate',{label:'Specimen',choices:['Arterial whole blood','Venous whole blood']}),instrument('chem8','i-STAT CHEM8+','sodium potassium calcium glucose hct',{label:'Specimen',choices:['Arterial whole blood','Venous whole blood']})],
      refs:[['Abbott · CHEM8+ specifications','https://www.globalpointofcare.abbott/us/en/product-details/apoc/istat-chem8.html'],['FDA · CG4+ intended use','https://www.accessdata.fda.gov/cdrh_docs/pdf24/K244014.pdf']]}
  ];
  const byId=Object.create(null);
  for(const method of methods)byId[method.id]=method;
  return {methods,byId,fields};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CollectionMethods;
