'use strict';

const INPUT_META = {
  spo2:{label:'Oxygen saturation',short:'SpO₂',unit:'%',digits:0,icon:'shield'},
  rr:{label:'Respiratory rate',short:'Breathing rate',unit:'breaths/min',digits:0,icon:'activity'},
  fluids:{label:'Fluid intake today',short:'Fluids',unit:'mL/day',digits:0,icon:'drop'},
  exercise:{label:'Exercise today',short:'Exercise',unit:'min/day',digits:0,icon:'activity'}
};
const INPUT_MEASUREMENT_GUIDES = [
  {key:'spo2',title:'Oxygen saturation',icon:'shield',equipment:'Approved pulse oximeter',steps:['Follow the device and mission procedure. Check fit, circulation, motion, and signal quality.','Wait for a steady reading before recording the percentage, device, time, and symptoms.','An oximeter estimates oxygen saturation. It does not measure cabin oxygen or replace assessment of breathing.'],why:'SpO₂ adds context to respiratory observations, but motion, circulation, skin pigmentation, and other factors can affect accuracy.',next:'Use the individual medical limits and symptom context. Serious or worsening breathing symptoms require crew response even when the displayed number appears reassuring.',source:'FDA: pulse oximeter basics',url:'https://www.fda.gov/consumers/consumer-updates/pulse-oximeters-and-oxygen-concentrators-what-know-about-home-oxygen-therapy'},
  {key:'rr',title:'Respiratory rate',icon:'activity',equipment:'Clock and trained observation',steps:['Use the mission observation procedure while the crew member is at rest when possible.','Observe chest or abdominal movement and count breaths for one full minute. Record breaths per minute.','Record breathing effort, unusual sounds, recent activity, and symptoms alongside the rate.'],why:'Breathing rate and breathing effort are different observations. A count alone cannot rule out a respiratory emergency.',next:'Absent or abnormal breathing, severe breathlessness, or sudden deterioration requires immediate crew assessment. Use the prescribed review limits for other changes.',source:'MedlinePlus: vital signs',url:'https://medlineplus.gov/ency/article/002341.htm'},
  {key:'fluids',title:'Fluid intake',icon:'drop',equipment:'Measured intake log',steps:['Use the units and intake categories in the individual nutrition plan.','Enter the cumulative fluid volume for the recorded day in mL, rather than a separate drink volume.','Record restrictions, nausea, appetite changes, or difficulty meeting the plan in the notes.'],why:'An intake record helps review the nutrition plan. Fluid intake alone does not establish hydration status.',next:'Follow the individual prescribed amount and any restriction. ORBIT does not calculate fluid replacement or recommend a universal daily volume.',source:'NASA: human health countermeasures',url:'https://www.nasa.gov/reference/about-human-health-countermeasures/'},
  {key:'exercise',title:'Exercise duration',icon:'activity',equipment:'Individual exercise plan and session log',steps:['Follow the aerobic and resistance prescription and approved equipment procedure.','Record completed minutes as a cumulative total for that day.','Note symptoms, workload, and deviations from the prescribed session. Duration does not measure intensity or physiological benefit.'],why:'Exercise records support review of countermeasures for muscle, bone, and cardiovascular deconditioning.',next:'Use the medical and exercise team’s plan. Report pain, dizziness, or unusual intolerance rather than changing intensity based on this dashboard.',source:'NASA: exercise physiology and countermeasures',url:'https://www.nasa.gov/directorates/esdmd/hhp/exercise-physiology-and-countermeasures/'}
];
let inputKind='manual',inputEpoch=0,inputURLs=[],inputModalURLs=[],inputPhotoDraft=null,inputPhotoLink=null,inputPhotoEpoch=0,inputCamera=null,inputCameraEpoch=0;
let inputDevice=null,inputCharacteristic=null,inputSensorReading=null,inputSensorListener=null;
let inputPendingDataset=null;

function extraInputFields(field) {
  return `<div class="form-section-label">ADDITIONAL MEASURED INDICATORS</div>${field('spo2','Oxygen saturation','%',0,100,1)}${field('rr','Respiratory rate','breaths/min',0,100,1)}${field('fluids','Fluid intake today','mL total',0,10000,1)}${field('exercise','Exercise today','minutes total',0,1440,1)}<p class="form-help field full">Fluid and exercise entries are the total so far for the recorded day. They are not added together automatically. Use the individual mission plan for targets.</p>`;
}
function healthInputsPage() {
  const choices=[['manual','Manual entry','clipboard'],['images','Photo & imaging record','body'],['sensor','Heart rate sensor','heart'],['dataset','Dataset import','document']];
  return `<section class="input-methods" aria-label="Choose a health data input">${choices.map(([id,title,ic])=>`<button data-input-kind="${id}" aria-pressed="${inputKind===id}" class="${inputKind===id?'active':''}">${icon(ic)}<span>${title}</span>${icon('chevronright')}</button>`).join('')}</section><div id="health-input-content">${inputKind==='images'?inputImagesPage():inputKind==='sensor'?inputSensorPage():inputKind==='dataset'?inputDatasetPage():inputManualPage()}</div>`;
}
function inputManualPage() {
  return `<section class="panel input-manual"><div><span class="eyebrow">MEASURED VALUES / CLEAR UNITS</span><h2>Log what you measured.</h2><p>Record approved device readings, symptoms, and daily totals. Blank fields remain missing; ORBIT never fills them with a healthy value.</p><button class="button primary" data-action="log">Log health indicators ${icon('plus')}</button></div><div class="input-indicator-list">${Object.entries(META).map(([key,meta])=>`<div><span>${icon(meta.icon)}${meta.short}</span><small>${meta.unit}</small></div>`).join('')}</div></section><div class="input-context-note">${icon('info')}Measurements feed the same crew history, trend charts, assessment workspace, and handoff. Individual review bands support discussion; they do not diagnose a condition.</div><section class="panel input-next"><div><h3>Follow the recorded medical plan</h3><p>Review symptoms first, then technique and context. Use the care actions and instructions entered for this crew member.</p></div><button class="text-button" data-action="input-assessment">Review assessment ${icon('arrowright')}</button></section>`;
}
function inputImagesPage() {
  return `<section class="panel input-image-intro"><div><span class="eyebrow">VISUAL OBSERVATIONS / ${esc(activeCrew().name).toUpperCase()}</span><h2>Keep the image with its context.</h2><p>Upload a photograph or an exported ultrasound or eye image, or take a still photo with your camera. Record the time, region, source, and observations for review.</p><small>PNG, JPEG, or WebP, up to 20 MB each. Original uploaded bytes are preserved. DICOM acquisition and image diagnosis are not included.</small></div><div>${button('Add image record','input-photo','primary','plus')}${button('Export crew archive','input-archive','','download')}</div></section><div class="input-gallery" id="input-gallery" aria-live="polite"><div class="panel input-gallery-empty">Loading this crew member’s image records…</div></div><p class="input-storage-note">Images stay in this browser’s image database, separate from the application cache. Export the crew archive to back them up. An original image is uploaded to ElevenLabs only if you review it and choose Share image in the Crew assistant. Image review cannot diagnose disease.</p>`;
}
function inputSensorPage() {
  return `<div class="input-sensor-grid"><section class="panel input-sensor"><span class="eyebrow">BLUETOOTH LOW ENERGY / HEART RATE SERVICE</span><h2>A reading from your monitor.</h2><p>Connect a device that advertises the standard Bluetooth Heart Rate service. This does not connect every smartwatch or read oxygen saturation from a heart rate monitor.</p><div class="input-sensor-value"><strong id="input-sensor-value">—</strong><span>bpm</span></div><p class="input-device-status" id="input-device-status" role="status">No device connected.</p><div class="input-sensor-actions">${button('Connect heart rate monitor','input-connect','primary','heart')}<button class="button" data-action="input-disconnect" disabled>Disconnect</button></div><button class="button input-use-reading" data-action="input-use-reading" disabled>Review and log this reading ${icon('arrowright')}</button><small>Nothing is saved until you review the measurement and save a health check. Leaving this page disconnects the monitor.</small></section><aside class="panel input-sensor-help"><h3>Before you connect</h3><ol><li>Use a compatible monitor and follow its fitting and measurement instructions.</li><li>Open ORBIT over HTTPS in a browser that supports Web Bluetooth. Choose the monitor in the browser’s device picker.</li><li>Check the contact indicator and recording time. Review the number before adding it to the crew record.</li></ol><p>This is a device input interface, not a medical alarm or a validated monitor. Symptoms take priority over a device reading.</p><button class="text-button" data-action="log">Enter a device reading manually ${icon('arrowright')}</button></aside></div>`;
}
function inputDatasetPage() {
  return `<div class="input-dataset-grid"><section class="panel input-import"><span class="eyebrow">STRUCTURED INDICATORS / JSON</span><h2>Import a measurement record.</h2><p>Use the ORBIT template to declare units and whether the values are measured or synthetic. Accepted records join ${esc(activeCrew().name)}’s history in this workspace.</p><label class="input-file-picker"><span>Choose an indicator dataset</span><input type="file" id="input-dataset-file" accept=".json,application/json"></label><button class="text-button" data-action="input-template">Download JSON template ${icon('download')}</button><div id="input-dataset-preview" role="status"></div><button class="button primary" data-action="input-import" disabled>Import reviewed records</button><small>Up to 500 entries and 2 MB. Units must match the template. Invalid batches are rejected before saving; duplicate records are skipped.</small></section><aside class="panel input-sample"><span class="eyebrow">FICTIONAL TEST DATA</span><h2>Try a complete input cycle.</h2><p>Add seven days of fictional indicators to the demo crew, then review the charts and assessment. The sample is not NASA telemetry or a real astronaut record.</p>${state.mode==='demo'?button('Load seven-day sample','input-sample','','plus'):button('Switch to demo workspace','input-demo','','arrowright')}<p class="input-sample-note">Synthetic data is blocked from the personal workspace.</p></aside></div>`;
}
function attachHealthInputs() {
  if(inputKind==='images')paintInputGallery();
  if(inputKind==='dataset')$('#input-dataset-file')?.addEventListener('change',reviewInputDataset);
}
function cleanupHealthInputs() {
  inputEpoch++; inputPendingDataset=null;
  stopInputCamera(); disconnectInputSensor();
  inputURLs.forEach(url=>URL.revokeObjectURL(url));inputURLs=[];
}
function disposeInputModal() {
  stopInputCamera();inputPhotoDraft=null;inputPhotoEpoch++;
  inputModalURLs.forEach(url=>URL.revokeObjectURL(url));inputModalURLs=[];
}
async function paintInputGallery() {
  const token=inputEpoch,workspace=state.mode,crewId=activeCrewId();
  try {
    const records=await ObservationStore.list(workspace,crewId);
    if(token!==inputEpoch||!$('#input-gallery'))return;
    $('#input-gallery').innerHTML=records.length?records.map(record=>{
      const url=URL.createObjectURL(record.blob);inputURLs.push(url);
      return `<article class="panel input-image-card"><button class="input-image-open" data-input-view="${esc(record.id)}" aria-label="Open image record: ${esc(record.title)}"><img src="${url}" alt="${esc(record.title)} · Recorded observation, not a diagnosis" loading="lazy"><span>${esc(record.kind)}</span></button><div class="input-image-details"><h3>${esc(record.title)}</h3><p>${careStamp(record.at)} · ${esc(CREW_REGIONS[record.region]||'General record')}</p><small>${esc(record.source)} · ${record.width} × ${record.height}</small><p class="input-image-notes">${esc(record.notes||'No observation notes recorded.')}</p><div><button class="text-button" data-input-view="${esc(record.id)}">Review record ${icon('arrowright')}</button><button class="text-button" data-input-download="${esc(record.id)}" aria-label="Download ${esc(record.title)}">${icon('download')}</button></div></div></article>`;
    }).join(''):'<div class="panel input-gallery-empty">'+icon('body')+'<h3>No image observations yet.</h3><p>Add a photograph or an exported imaging still for this crew member.</p></div>';
    hydrateIcons($('#input-gallery'));
  } catch(error) {if(token===inputEpoch&&$('#input-gallery'))$('#input-gallery').innerHTML=`<div class="panel input-gallery-empty"><h3>Image storage is unavailable.</h3><p>${esc(error.message)} Your existing vital log remains available.</p></div>`;}
}
function inputPhotoModal(prefill={}) {
  inputPhotoLink=prefill?.link||null;
  modal('Add image observation',esc(activeCrew().name)+' · Image record for review',`<form id="input-photo-form"><div class="input-photo-tools"><label class="input-file-picker"><span>Choose an image file</span><input type="file" id="input-photo-file" accept="image/png,image/jpeg,image/webp"></label><button class="button small" type="button" data-action="input-camera">Use camera ${icon('body')}</button></div><div class="input-photo-preview" id="input-photo-preview"><p>Select an image or start the camera.</p></div><div id="input-camera-area" hidden><video id="input-camera-video" autoplay playsinline muted aria-label="Camera preview"></video><div><button type="button" class="button small primary" data-action="input-capture">Capture still</button><button type="button" class="button small" data-action="input-stop-camera">Stop camera</button></div></div><p class="form-help" id="input-photo-status" role="status">Camera access starts only when you choose Use camera. Audio is never requested.</p><div class="form-grid"><label class="field full"><span>Record title</span><input class="field-input" name="title" required maxlength="100" placeholder="e.g. Skin observation, left forearm"></label><label class="field"><span>Image type</span><select class="field-input" name="kind"><option>Photograph</option><option>Ultrasound still</option><option>Eye or retinal image</option><option>Other medical image</option></select></label><label class="field"><span>Body region</span><select class="field-input" name="region">${Object.entries(CREW_REGIONS).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><label class="field full"><span>Observation time <small>(local device time)</small></span><input class="field-input" type="datetime-local" name="at" required value="${localInput()}" max="${localInput()}"></label><label class="field full"><span>Device or imaging method <small>(optional)</small></span><input class="field-input" name="method" maxlength="120" placeholder="Equipment and method used to obtain the image"></label><label class="field full"><span>Symptoms and observations <small>(optional)</small></span><textarea class="field-input" name="notes" maxlength="2000" placeholder="What changed, symptom onset, and context for medical review."></textarea></label></div><p class="form-error" id="input-photo-error" role="alert"></p></form><p class="form-help">Images are stored locally without automated interpretation. A camera photo cannot replace an ultrasound acquisition, retinal exam, or clinical examination.</p>`,`${button('Cancel','close-modal')}<button class="button primary" type="submit" form="input-photo-form">Save image record</button>`);
  $('#input-photo-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    stopInputCamera();
    try{await setInputPhotoDraft(file,'Uploaded image',file.name);}catch(error){$('#input-photo-error').textContent=error.message;}
  });
  if(prefill?.title)$('#input-photo-form').elements.title.value=prefill.title;
  $('#input-photo-form').addEventListener('submit',saveInputPhoto);
}
async function setInputPhotoDraft(blob,source,name) {
  const token=++inputPhotoEpoch;
  if(blob.size>20*1024*1024)throw new Error('Choose an image no larger than 20 MB. The file was not saved.');
  const type=InputLogic.imageKind(new Uint8Array(await blob.slice(0,16).arrayBuffer()));
  if(!type)throw new Error('Choose a valid PNG, JPEG, or WebP image. SVG and DICOM are not supported.');
  let bitmap;try{bitmap=await createImageBitmap(blob);}catch{throw new Error('The image could not be decoded. Choose another file.');}
  const width=bitmap.width,height=bitmap.height;bitmap.close();
  if(token!==inputPhotoEpoch||!$('#input-photo-preview'))return;
  inputPhotoDraft={blob,type,width,height,source,name};if($('#input-photo-form'))$('#input-photo-form').dataset.assistantDirty='true';
  const url=URL.createObjectURL(blob);inputModalURLs.push(url);
  $('#input-photo-preview').innerHTML=`<img src="${url}" alt="Image selected for the observation"><p>${width} × ${height} · ${(blob.size/1048576).toFixed(2)} MB · ${esc(source)}</p>`;
  $('#input-photo-error').textContent='';
}
async function startInputCamera() {
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){$('#input-photo-status').textContent='Camera capture requires HTTPS or localhost and a supported browser. You can upload an image instead.';return;}
  stopInputCamera();const token=inputCameraEpoch;
  $('#input-photo-status').textContent='Waiting for camera permission…';
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
    if(token!==inputCameraEpoch||!$('#input-camera-video')||!$('#modal').open){stream.getTracks().forEach(track=>track.stop());return;}
    inputCamera=stream;$('#input-camera-area').hidden=false;$('#input-camera-video').srcObject=stream;
    $('#input-photo-status').textContent='Camera is on. Capture a still or stop the camera when finished.';
  }catch(error){if($('#input-photo-status'))$('#input-photo-status').textContent=error.name==='NotAllowedError'?'Camera access was not granted. Upload an image or choose Use camera again.':'The camera could not start. Check the device, or upload an image.';}
}
function stopInputCamera() {
  inputCameraEpoch++;
  inputCamera?.getTracks().forEach(track=>track.stop());inputCamera=null;
  const video=document.getElementById('input-camera-video');if(video)video.srcObject=null;
  const area=document.getElementById('input-camera-area');if(area)area.hidden=true;
}
async function captureInputPhoto() {
  const video=$('#input-camera-video');if(!inputCamera||!video?.videoWidth){$('#input-photo-status').textContent='Wait for the camera preview before capturing.';return;}
  const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.95));
  stopInputCamera();
  if(!blob)return;
  try{await setInputPhotoDraft(blob,'Camera photograph','camera-capture.jpg');$('#input-photo-status').textContent='Still captured. The camera is off. Add context and save the record.';}catch(error){if($('#input-photo-error'))$('#input-photo-error').textContent=error.message;}
}
async function saveInputPhoto(event) {
  event.preventDefault();if(!inputPhotoDraft){$('#input-photo-error').textContent='Choose or capture an image first.';return;}
  const form=new FormData(event.target),at=new Date(form.get('at'));
  if(!Number.isFinite(at.getTime())||at.getTime()>Date.now()+60000){$('#input-photo-error').textContent='Choose a valid observation time at or before the current time.';return;}
  $('#input-photo-error').textContent='';const button=$('[form="input-photo-form"]');button.disabled=true;
  const record={...inputPhotoDraft,id:crewUID('image'),workspace:state.mode,crewId:activeCrewId(),title:String(form.get('title')).trim(),kind:form.get('kind'),region:form.get('region'),at:at.toISOString(),method:String(form.get('method')).trim(),notes:String(form.get('notes')).trim(),savedAt:new Date().toISOString(),...(inputPhotoLink?{link:inputPhotoLink}:{})};
  try{await ObservationStore.save(record);announceFormSaved('input-photo-form',event.target,true);closeModal();render();toast('Image observation saved on this device.');}
  catch(error){if($('#input-photo-error'))$('#input-photo-error').textContent=error.message;if(button.isConnected)button.disabled=false;}
}
async function viewInputImage(id,{isCurrent=()=>true}={}) {
  const workspace=state.mode,crewId=activeCrewId();
  try{
    const record=await ObservationStore.get(id,workspace,crewId);if(!record||!isCurrent()||state.mode!==workspace||activeCrewId()!==crewId)return false;
    window.dispatchEvent(new CustomEvent('orbit:image-selected',{detail:{id,workspace:state.mode,crewId:activeCrewId()}}));
    modal(esc(record.title),`${careStamp(record.at)} · ${esc(record.kind)}`,`<div class="input-image-review"><img id="input-image-full" alt="${esc(record.title)}"><dl><dt>Body region</dt><dd>${esc(CREW_REGIONS[record.region]||'General record')}</dd><dt>Source</dt><dd>${esc(record.source)} · ${esc(record.method||'Method not recorded')}</dd><dt>Observations</dt><dd>${esc(record.notes||'No notes recorded.')}</dd></dl><p class="form-help">This is a stored image, not an automated medical finding.</p></div>`, `<button class="button danger" data-input-delete="${esc(id)}">Delete image</button>${button('Close','close-modal')}<button class="button" data-assistant-photo="${esc(id)}">Ask crew assistant</button><button class="button primary" data-input-download="${esc(id)}">Download original</button>`);
    const url=URL.createObjectURL(record.blob);inputModalURLs.push(url);$('#input-image-full').src=url;return true;
  }catch(error){toast(error.message);return false;}
}
async function downloadInputImage(id,{isCurrent=()=>true}={}) {
  const workspace=state.mode,crewId=activeCrewId();
  try{const record=await ObservationStore.get(id,workspace,crewId);if(!record||!isCurrent()||state.mode!==workspace||activeCrewId()!==crewId)return false;const ext=record.type==='image/png'?'png':record.type==='image/webp'?'webp':'jpg';download(`orbit-${record.id}.${ext}`,record.blob,record.type);return true;}catch(error){toast(error.message);return false;}
}
function confirmInputImageDelete(id) {
  modal('Delete this image record?','Only the selected image and its observation metadata will be removed.','<p class="form-help">Download the original or export the crew archive first if you need a copy.</p>',`${button('Keep image','close-modal')}<button class="button danger" data-input-confirm-delete="${esc(id)}">Delete image record</button>`);
}
async function deleteInputImage(id) {
  try{await ObservationStore.remove(id,state.mode,activeCrewId());closeModal();render();toast('Image observation deleted.');return true;}catch(error){toast(error.message);return false;}
}

async function connectInputSensor() {
  if(!window.isSecureContext||!navigator.bluetooth?.requestDevice){$('#input-device-status').textContent='Web Bluetooth is unavailable here. Use HTTPS in a supported browser, or enter the monitor reading manually.';return;}
  disconnectInputSensor();const token=++inputEpoch;
  $('#input-device-status').textContent='Choose a compatible heart rate monitor in the browser’s device picker.';
  try{
    const device=await navigator.bluetooth.requestDevice({filters:[{services:['heart_rate']}]});
    if(token!==inputEpoch)return;
    inputDevice=device;device.addEventListener('gattserverdisconnected',sensorDisconnected);
    const server=await device.gatt.connect();
    if(token!==inputEpoch){device.gatt.disconnect();return;}
    const service=await server.getPrimaryService('heart_rate');
    const characteristic=await service.getCharacteristic('heart_rate_measurement');
    if(token!==inputEpoch){device.gatt.disconnect();return;}
    inputCharacteristic=characteristic;
    inputSensorListener=event=>{
      try{
        const reading=InputLogic.parseHeartRate(event.target.value);
        inputSensorReading={...reading,at:new Date().toISOString(),device:device.name||'Heart rate monitor'};
        if(!$('#input-sensor-value'))return;
        $('#input-sensor-value').textContent=reading.bpm;
        const valid=reading.contact!==false&&reading.bpm>=0&&reading.bpm<=350;
        $('#input-device-status').textContent=`${device.name||'Heart rate monitor'} · ${new Date().toLocaleTimeString()} · ${reading.contact===false?'Sensor reports no contact':reading.contactSupported?'Contact detected':'Contact status not supplied'}`;
        $('[data-action="input-use-reading"]').disabled=!valid;
      }catch{$('#input-device-status').textContent='The monitor sent an incomplete reading. Check the device.';$('[data-action="input-use-reading"]').disabled=true;}
    };
    characteristic.addEventListener('characteristicvaluechanged',inputSensorListener);
    await characteristic.startNotifications();
    if(token!==inputEpoch){device.gatt.disconnect();return;}
    $('#input-device-status').textContent=`Connected to ${device.name||'heart rate monitor'}. Waiting for a reading…`;
    $('[data-action="input-disconnect"]').disabled=false;
  }catch(error){if(token!==inputEpoch)return;disconnectInputSensor();if($('#input-device-status'))$('#input-device-status').textContent=error.name==='NotFoundError'?'No monitor was selected. You can try again or enter a reading manually.':'The monitor could not connect. Check compatibility and permissions, or enter a reading manually.';}
}
function sensorDisconnected() {
  inputSensorReading=null;
  if($('#input-device-status'))$('#input-device-status').textContent='Monitor disconnected. No live reading is being saved.';
  const button=$('[data-action="input-use-reading"]');if(button)button.disabled=true;
}
function disconnectInputSensor() {
  if(inputCharacteristic&&inputSensorListener)inputCharacteristic.removeEventListener('characteristicvaluechanged',inputSensorListener);
  if(inputDevice){inputDevice.removeEventListener('gattserverdisconnected',sensorDisconnected);if(inputDevice.gatt?.connected)inputDevice.gatt.disconnect();}
  inputDevice=null;inputCharacteristic=null;inputSensorListener=null;inputSensorReading=null;
  const button=document.querySelector('[data-action="input-use-reading"]');if(button)button.disabled=true;
  const disconnect=document.querySelector('[data-action="input-disconnect"]');if(disconnect)disconnect.disabled=true;
  const value=document.getElementById('input-sensor-value');if(value)value.textContent='—';
}
function useInputSensorReading() {
  const reading=inputSensorReading;
  if(!reading||reading.contact===false||Date.now()-Date.parse(reading.at)>30000){toast('Wait for a current reading with valid sensor contact.');return;}
  logModal({hr:reading.bpm,at:reading.at,source:'Bluetooth heart rate monitor',notes:`Device: ${reading.device}. ${reading.contactSupported?'Sensor contact detected.':'Contact status not supplied by this device.'}`});
}
function sampleInputDataset() {
  const last=new Date();last.setHours(7,0,0,0);if(last.getTime()>Date.now())last.setDate(last.getDate()-1);
  return {format:'ORBIT_INDICATOR_DATASET',version:1,synthetic:true,units:Object.fromEntries(Object.entries(InputLogic.fields).map(([key,rule])=>[key,rule.unit])),entries:Array.from({length:7},(_,i)=>{
    const at=new Date(last);at.setDate(at.getDate()-(6-i));
    return {at:at.toISOString(),hr:64+i%3,sys:116+i,dia:74+i%3,temp:36.6+(i%2)*.1,sleep:7.1+(i%3)*.2,glucose:89+i,glucoseContext:'Before meal',mood:i===6?3:4,spo2:97+i%2,rr:15+i%3,fluids:1800+i*50,exercise:45+i*5,notes:'Fictional software test record. Not NASA telemetry or actual astronaut data.'};
  })};
}
async function reviewInputDataset(event) {
  inputPendingDataset=null;$('[data-action="input-import"]').disabled=true;
  const file=event.target.files?.[0];if(!file)return;
  const token=inputEpoch;
  try{
    if(file.size>2*1024*1024)throw new Error('Choose a JSON dataset no larger than 2 MB.');
    const data=JSON.parse(await file.text()),records=InputLogic.validateDataset(data,state.mode);
    if(token!==inputEpoch||!$('#input-dataset-preview'))return;
    inputPendingDataset={records,workspace:state.mode,crewId:activeCrewId(),synthetic:data.synthetic,neural:InputLogic.neuralConfig(data)};
    const first=records[0],last=records.at(-1);
    $('#input-dataset-preview').innerHTML=`<div class="input-import-preview"><strong>${records.length} valid entries · ${data.synthetic?'Synthetic test data':'Declared measured data'}</strong><p>${careStamp(first.at)} to ${careStamp(last.at)}</p><p>Destination: ${esc(activeCrew().name)} · ${state.mode} workspace.</p>${data.neural?'<p>Includes explicit preflight baselines and supplemental inputs for the experimental synthetic-data neural model.</p>':''}<small>Units and input bounds checked. This does not validate the device or establish medical accuracy.</small></div>`;
    $('[data-action="input-import"]').disabled=false;
  }catch(error){if($('#input-dataset-preview'))$('#input-dataset-preview').textContent=error instanceof SyntaxError?'The file is not valid JSON. Download the template and check the structure.':error.message;}
}
function appendInputDataset(records,neural = null) {
  if(neural)activeCrew().neuralBaseline={...neural.baseline};
  const unique=InputLogic.uniqueRecords(entries(),records);
  db().entries.push(...unique.map(record=>({...record,id:crewUID('entry'),crewId:activeCrewId()})));
  persist();render();toast(`${unique.length} records imported; ${records.length-unique.length} duplicates skipped.`);
}
function importReviewedInputDataset() {
  const pending=inputPendingDataset;
  if(!pending||pending.workspace!==state.mode||pending.crewId!==activeCrewId()){toast('Choose and review the dataset for the current crew member first.');return;}
  appendInputDataset(pending.records,pending.neural);
}
function loadInputSample() {
  try{appendInputDataset(InputLogic.validateDataset(sampleInputDataset(),state.mode));}catch(error){toast(error.message);}
}
async function exportInputArchive() {
  const workspace=state.mode,crew={...activeCrew()},crewId=activeCrewId(),records=entries().map(record=>({...record})),assessments=careAssessments().map(record=>({...record}));
  toast('Preparing this crew member’s record and original image files…');
  try{
    const images=await ObservationStore.list(workspace,crewId);
    const metadata=images.map(({blob,...record})=>({...record,file:`images/${record.id}.${record.type==='image/png'?'png':record.type==='image/webp'?'webp':'jpg'}`}));
    const total=images.reduce((n,image)=>n+image.blob.size,0);if(total>99*1024*1024)throw new Error('This image collection is too large for one browser archive. Download individual original images instead.');
    const archiveEntries=[{name:'crew-record.json',bytes:JSON.stringify({format:'ORBIT_CREW_ARCHIVE',version:1,exportedAt:new Date().toISOString(),workspace,mission:{...state.settings},crew,entries:records,assessments,riskRecords:db().riskRecords.filter(r=>r.crewId===crewId),workouts:db().workouts.filter(r=>r.crewId===crewId),emergencyRuns:db().emergencyRuns.filter(r=>r.crewId===crewId),linkMessages:db().linkMessages.filter(r=>r.crewId===crewId),skinChecks:db().skinChecks.filter(r=>r.crewId===crewId),wounds:db().wounds.filter(r=>r.crewId===crewId),supplyLog:db().supplyLog.filter(r=>r.crewId===crewId),images:metadata},null,2)},...await Promise.all(images.map(async(image,index)=>({name:metadata[index].file,bytes:new Uint8Array(await image.blob.arrayBuffer())})))];
    download(`orbit-${workspace}-${crewId}-record-${todayKey()}.zip`,InputLogic.zipArchive(archiveEntries),'application/zip');toast('Crew archive prepared with the original image files. Nothing has been sent.');return true;
  }catch(error){toast(error.message);return false;}
}
async function clearWorkspaceWithImages() {
  const workspace=state.mode,button=$('[data-action="confirm-clear"]');if(button)button.disabled=true;
  try{
    await ObservationStore.clearWorkspace(workspace);
    const previous=state.data[workspace];state.data[workspace]={...previous,...missionEmptyStores(),entries:[],checks:{},assessments:[],careReminderReceipts:{},crew:previous.crew.map(profile=>({...profile,conditions:[],carePlan:undefined,priorDose:undefined}))};
    persist();closeModal();render();toast('Workspace records and image observations cleared.');return true;
  }catch(error){toast('Could not clear image storage. '+error.message);if(button?.isConnected)button.disabled=false;return false;}
}
function careActionsMarkup() {
  const plan=carePlan(),sleep=latest('sleep'),fluid=latest('fluids'),exercise=latest('exercise'),mood=latest('mood');
  const today=record=>record&&new Date(record.at).toLocaleDateString('en-CA')===todayKey();
  const review=Object.keys(META).filter(key=>careReadingStatus(key,latest(key)).className==='review'&&!['sleep','mood','fluids','exercise'].includes(key));
  const cards=[
    ['drop','Nutrition and fluids',Number.isFinite(plan.fluidTarget)?`Entered daily fluid target: ${plan.fluidTarget} mL. ${today(fluid)?`Today’s last recorded total is ${fluid.fluids} mL.`:'No total recorded for today.'}`:'Review meals, fluids, appetite, and intake against the individual mission plan. No fluid amount is prescribed by ORBIT.','Do not increase fluid intake beyond a medical restriction. Discuss persistent intake changes with the medical officer.'],
    ['activity','Exercise countermeasures',Number.isFinite(plan.exerciseTarget)?`Entered daily exercise target: ${plan.exerciseTarget} minutes. ${today(exercise)?`Today’s last recorded total is ${exercise.exercise} minutes.`:'No total recorded for today.'}`:'Use the prescribed aerobic and resistance plan to support muscle, bone, and cardiovascular conditioning.','Report new pain, dizziness, or exercise intolerance. Changes to exercise intensity require the mission medical plan.'],
    ['moon','Sleep and workload',sleep?`Last sleep entry: ${formatNum(sleep.sleep,1)} hours. Planned rest target: ${state.settings.sleepTarget} hours.`:'Record sleep duration and how rested you feel to begin reviewing the rest schedule.','Protect the planned sleep opportunity and light schedule. Discuss persistent fatigue before safety-critical tasks.'],
    ['brain','Wellbeing and medical review',review.length?`${review.map(key=>META[key].short).join(', ')}: outside an entered review band. Check the measurement context and follow the prescribed repeat or escalation plan.`:mood&&mood.mood<=2?'A low mood entry supports a private check-in with the medical officer.':'Use private check-ins to discuss persistent symptoms, stress, concentration, or changes in crew connection.','Urgent symptoms require immediate crew response regardless of recorded numbers.']
  ];
  return `<section class="input-care-actions" id="care-prevention-actions"><div class="section-label"><h2>Care actions and health improvements</h2><button class="text-button" data-action="care-plan">Edit individual plan ${icon('arrowright')}</button></div><div class="input-care-action-grid">${cards.map(([ic,title,context,next])=>`<article class="panel input-care-action"><span>${icon(ic)}</span><h3>${title}</h3><p>${esc(context)}</p><small>${esc(next)}</small></article>`).join('')}</div><div class="panel input-prescribed-plan"><div><span class="eyebrow">INSTRUCTIONS FROM THE INDIVIDUAL MEDICAL PLAN</span><h3>Recorded care instructions</h3></div><p>${plan.careInstructions?esc(plan.careInstructions):'No instructions entered. Copy the crew medical team’s treatment or follow-up instructions into the individual plan. ORBIT does not generate medication orders or treatment doses.'}</p></div><p class="input-action-source">${careLink('https://www.nasa.gov/reference/about-human-health-countermeasures/','NASA: human health countermeasures')}</p></section>`;
}
function handleHealthInputControl(target) {
  if(target.dataset.inputKind){inputKind=target.dataset.inputKind;render();return true;}
  if(target.dataset.inputView){viewInputImage(target.dataset.inputView);return true;}
  if(target.dataset.inputDownload){downloadInputImage(target.dataset.inputDownload);return true;}
  if(target.dataset.inputDelete){confirmInputImageDelete(target.dataset.inputDelete);return true;}
  if(target.dataset.inputConfirmDelete){deleteInputImage(target.dataset.inputConfirmDelete);return true;}
  const actions={
    'input-photo':inputPhotoModal,'input-camera':startInputCamera,'input-capture':captureInputPhoto,
    'input-stop-camera':()=>{stopInputCamera();if($('#input-photo-status'))$('#input-photo-status').textContent='Camera stopped. Select an image or start it again when needed.';},
    'input-connect':connectInputSensor,'input-disconnect':()=>{disconnectInputSensor();if($('#input-device-status'))$('#input-device-status').textContent='Monitor disconnected.';},
    'input-use-reading':useInputSensorReading,'input-template':()=>download('orbit-indicators-template.json',JSON.stringify(sampleInputDataset(),null,2),'application/json'),
    'input-import':importReviewedInputDataset,'input-sample':loadInputSample,'input-demo':()=>setMode('demo'),'input-archive':exportInputArchive,
    'input-assessment':()=>{careTab='assessment';render();}
  };
  if(actions[target.dataset.action]){actions[target.dataset.action]();return true;}
  return false;
}
document.getElementById('modal').addEventListener('close',disposeInputModal);
window.addEventListener('pagehide',()=>{cleanupHealthInputs();disposeInputModal();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopInputCamera();});
