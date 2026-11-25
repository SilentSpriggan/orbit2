'use strict';

let careTab = 'assessment';
let careOfflineReady = false;
let careOfflineBusy = false;
let careOfflineMessage = 'Prepare the app and all anatomy layers for use without a connection.';
const CARE_FLAGS = {
  chest: 'New or severe chest discomfort',
  breathing: 'Severe difficulty breathing',
  stroke: 'Sudden face, arm, speech, or vision change',
  bleeding: 'Severe or uncontrolled bleeding',
  safety: 'Immediate threat to personal or crew safety'
};
const CARE_ENVIRONMENTS = {
  'Lunar transit': { gravity: 'Microgravity', focus: 'Secure the crew member and measurement equipment using approved restraints. Keep the onboard response procedure accessible.', task: 'Review restraint placement and the onboard medical kit before the next health check.' },
  'Space station': { gravity: 'Microgravity', focus: 'Record body restraint and exercise timing consistently. Coordinate shared equipment and private medical check-ins with the station schedule.', task: 'Review the exercise prescription and compare resting readings taken under similar conditions.' },
  'Lunar surface habitat': { gravity: 'Partial gravity', focus: 'Record surface activity, suit use, and symptoms during transitions between work and rest. Use the habitat medical and airlock procedures.', task: 'Plan a health check around surface operations and record any difficulty adapting to gravity.' },
  'Mars transit': { gravity: 'Microgravity / distant operations', focus: 'Keep procedures and handoff records available onboard. Ground communication may be delayed; trained immediate care must begin locally.', task: 'Confirm the onboard emergency roles, equipment locations, and delayed communication plan.' },
  'Mars surface habitat': { gravity: 'Partial gravity / distant operations', focus: 'Record exertion, mobility changes, and suit operations. Plan medical care around the surface schedule and delayed ground support.', task: 'Review mobility, prescribed exercise, and the local emergency response plan before surface work.' },
  'Surface rover': { gravity: 'Surface operations', focus: 'Use the vehicle medical procedure. Check equipment access, crew roles, and the communication plan before leaving the habitat.', task: 'Confirm the rover medical kit and the approved return or evacuation procedure.' }
};
const CARE_MEASUREMENTS = [
  { key: 'hr', title: 'Heart rate', icon: 'heart', equipment: 'Approved monitor or a clock',
    steps: ['Rest according to the mission procedure and record recent exercise or symptoms.', 'For a manual wrist pulse, place the index and middle fingers below the base of the thumb. Press lightly and count for 60 seconds.', 'Record beats per minute, the method, and any irregularity or symptoms.'],
    why: 'A consistent resting record helps the medical team review changes alongside exertion, symptoms, and other indicators.',
    next: 'If a reading is unexpected, check the technique and follow your individual repeat and review instructions. Chest discomfort, collapse, or severe breathing difficulty requires an immediate crew response.',
    source: 'MedlinePlus: taking a pulse', url: 'https://medlineplus.gov/ency/imagepages/19974.htm' },
  { key: 'sys', title: 'Blood pressure', icon: 'pressure', equipment: 'Approved cuff and monitor',
    steps: ['Use the correct cuff size on the bare upper arm and follow the device procedure.', 'On Earth, rest quietly for five minutes and support the arm at heart level; avoid exercise and caffeine for 30 minutes beforehand. In microgravity, use the mission restraint and positioning procedure.', 'Record systolic and diastolic pressure, body position or restraint, symptoms, and repeat readings as directed.'],
    why: 'Blood pressure adds context to circulation and symptoms. Gravity, exertion, and measurement technique can affect a reading.',
    next: 'Use the review limits supplied by the medical team. Repeat an unexpected reading as instructed. Do not wait for another reading when urgent symptoms are present.',
    source: 'American Heart Association: home monitoring', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home' },
  { key: 'temp', title: 'Body temperature', icon: 'temp', equipment: 'Approved digital thermometer',
    steps: ['Clean and operate the thermometer according to its instructions.', 'Use the same measurement site and method for comparisons. For an oral reading, allow 20 to 30 minutes after eating or hot or cold drinks.', 'Record the temperature in °C, measurement site, time, and symptoms.'],
    why: 'Temperature can support review of illness or heat exposure, but the device, measurement site, and activity affect the result.',
    next: 'Review a persistent or unexpected change with the crew medical officer. Use the mission procedure for illness or heat concerns rather than interpreting one number alone.',
    source: 'MedlinePlus: temperature measurement', url: 'https://medlineplus.gov/ency/article/003400.htm' },
  { key: 'glucose', title: 'Blood glucose', icon: 'drop', equipment: 'Prescribed meter, compatible strips, lancet',
    steps: ['Test only when the individual medical plan calls for it. Wash and dry hands, and check strip compatibility and expiry.', 'Follow the meter instructions for sampling and drop size. Use a fresh lancet and the approved sharps and biological waste procedure.', 'Record mg/dL, meal or fasting context, symptoms, and the time. Do not share lancets.'],
    why: 'Glucose needs meal, medication, and symptom context. A fasting value and an after-meal value cannot use the same comparison by default.',
    next: 'Follow the treatment and action limits already prescribed by the medical team. ORBIT does not calculate medication doses or prescribe treatment.',
    source: 'FDA: blood glucose monitoring devices', url: 'https://www.fda.gov/medical-devices/in-vitro-diagnostics/blood-glucose-monitoring-devices' },
  { key: 'sleep', title: 'Sleep and alertness', icon: 'moon', equipment: 'Sleep journal or approved monitor',
    steps: ['Record actual sleep duration rather than time spent in bed.', 'Note awakenings, schedule changes, light, noise, and how rested you feel.', 'Compare the entry with the rest period in the individual mission plan.'],
    why: 'Sleep and workload records help the crew review alertness and the effects of isolation and the cabin environment.',
    next: 'Protect the planned rest period and discuss persistent fatigue or impaired performance with the medical officer. The sleep target is a planning preference, not a diagnosis.',
    source: 'NASA: five hazards of human spaceflight', url: 'https://www.nasa.gov/hrp/hazards/' },
  { key: 'mood', title: 'Mood and wellbeing', icon: 'brain', equipment: 'Private check-in',
    steps: ['Choose the mood description that best reflects how you feel now.', 'Note changes in concentration, motivation, sleep, workload, or crew connection.', 'Use a private medical support channel for concerns that need discussion.'],
    why: 'A consistent personal journal can help start a discussion about isolation and confinement. The five-point scale is not a clinical screening tool.',
    next: 'A value of 1 or 2 prompts a supportive check-in in this prototype. Persistent changes warrant medical review; immediate safety concerns require an immediate crew response.',
    source: 'NASA: five hazards of human spaceflight', url: 'https://www.nasa.gov/hrp/hazards/' }
];

CARE_MEASUREMENTS.push(...INPUT_MEASUREMENT_GUIDES);

function carePlan() { return activeCrew().carePlan || { schedule: {}, limits: {}, remindersEnabled: false, protocol: '' }; }
function careEnvironment() { return CARE_ENVIRONMENTS[state.settings.environment] || CARE_ENVIRONMENTS['Lunar transit']; }
function careTasks() { return CareLogic.dailyTasks(ROUTINES, carePlan().schedule, checks()); }
function careAssessments() { return (db().assessments || []).filter(a => a.crewId === activeCrewId()); }
function careLink(url, label) { return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ${icon('external')}</a>`; }
function careStamp(at) { return `${dayLabel(at)} · ${new Date(at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`; }
function careLatestReadings() {
  return Object.entries(META).flatMap(([key, meta]) => {
    const record = latest(key);
    if (!record) return [];
    return [{ key, label: meta.short, value: key === 'sys' ? `${record.sys}/${record.dia}` : formatNum(record[key], meta.digits), unit: meta.unit, at: record.at, context: key === 'glucose' ? record.glucoseContext || '' : '' }];
  });
}
function careReadingStatus(key, record) {
  if (!record) return { label: 'Not recorded', className: 'muted' };
  const plan = carePlan();
  if(key==='fluids'||key==='exercise'){const target=plan[key==='fluids'?'fluidTarget':'exerciseTarget'];const current=new Date(record.at).toLocaleDateString('en-CA')===todayKey();return {label:!current?'Previous day’s total':!Number.isFinite(target)?'Plan target not set':record[key]<target?'Below entered plan':'Daily total recorded',className:current&&Number.isFinite(target)&&record[key]<target?'review':'muted'};}
  if (key === 'sleep') return { label: record.sleep < state.settings.sleepTarget ? 'Below planned rest' : 'Rest entry recorded', className: record.sleep < state.settings.sleepTarget ? 'review' : 'muted' };
  if (key === 'mood') return { label: record.mood <= 2 ? 'Supportive check-in' : 'Journal entry', className: record.mood <= 2 ? 'review' : 'muted' };
  if (key === 'glucose' && plan.glucoseContext !== record.glucoseContext) return { label: 'No matching context band', className: 'muted' };
  const results = (key === 'sys' ? ['sys', 'dia'] : [key]).map(k => CareLogic.reviewBand(record[k], plan.limits?.[k]));
  if (results.includes('outside')) return { label: 'Outside entered band', className: 'review' };
  if (results.every(r => r === 'within')) return { label: 'Within entered band', className: 'info' };
  return { label: 'Review band not set', className: 'muted' };
}
function careOverviewStrip() {
  const tasks = careTasks(), next = tasks.find(t => t.due) || tasks.find(t => !t.done);
  return `<section class="care-overview-strip"><div class="care-strip-icon">${icon('clipboard')}</div><div><strong>${next ? (next.due ? 'Scheduled task due' : 'Next scheduled task') : 'Today’s routine is complete'}</strong><p>${next ? `${esc(next.title)} · ${next.time} local device time` : 'Continue to record symptoms and follow your individual mission plan.'}</p></div><a class="button small" href="#care">Open health assessment ${icon('arrowright')}</a></section>`;
}
/* Health assessment tabs. Sleep & wellbeing, Exercise and Skin & wounds used to be separate pages. */
const CARE_TAB_GROUPS = [
  ['Checks & tracking', [
    ['assessment', 'Crew assessment', 'Symptoms, readings & next actions', 'clipboard'],
    ['wellbeing', 'Sleep & wellbeing', 'Rest, stress & connection', 'moon'],
    ['exercise', 'Exercise', 'Workouts against the target', 'dumbbell'],
    ['skin', 'Skin & wounds', 'Daily skin check & wounds', 'shield'],
  ]],
  ['Recording & readiness', [
    ['inputs', 'Health inputs', 'Entry, photos, sensors & data', 'plus'],
    ['measurements', 'Measurement guide', 'Equipment, technique & context', 'activity'],
    ['mission', 'Mission readiness', 'Environment, hazards & offline', 'globe'],
  ]],
];
const CARE_TABS = CARE_TAB_GROUPS.flatMap(([, tabs]) => tabs);
const CARE_TAB_LABELS = Object.fromEntries(CARE_TABS.map(([id, label]) => [id, label]));
/* Headings for tabs whose content does not bring its own. */
const CARE_TAB_INTROS = {
  assessment: 'Check the person first, then symptoms and readings, then choose the next crew action.',
  inputs: 'Add readings by hand, from photos, from a heart rate sensor, or from a dataset.',
  measurements: 'How to take each reading consistently, with the right equipment and context.',
  mission: 'Routines, environment considerations and offline preparation for this mission.',
};
const CARE_TAB_PAGES = {
  assessment: () => careAssessmentPage(),
  wellbeing: () => missionWellbeingPage(true),
  exercise: () => missionExercisePage(true),
  skin: () => skinPage(true),
  inputs: () => healthInputsPage(),
  measurements: () => careMeasurementPage(),
  mission: () => careMissionPage(),
};
function careTabsNav() {
  return `<nav class="care-rail" aria-label="Health assessment sections">${CARE_TAB_GROUPS.map(([group, tabs]) => `<div class="care-rail-group"><span class="care-rail-label">${group}</span><div class="care-rail-list">${tabs.map(([id, label, hint, ic]) => `<button type="button" data-care-tab="${id}" aria-pressed="${careTab === id}" ${careTab === id ? 'aria-current="true"' : ''} class="care-rail-item${careTab === id ? ' active' : ''}"><span class="care-rail-icon">${icon(ic)}</span><span class="care-rail-text"><strong>${label}</strong><small>${hint}</small></span></button>`).join('')}</div></div>`).join('')}</nav>`;
}
function careTabIntro() {
  const intro = CARE_TAB_INTROS[careTab];
  return intro ? `<div class="care-section-head"><div><h2>${CARE_TAB_LABELS[careTab]}</h2><p>${intro}</p></div></div>` : '';
}
function carePage() {
  const environment = careEnvironment();
  return `${pageHeading('Health assessment', 'Check symptoms, review your record, and choose the next crew action.', button('Prepare handoff', 'care-handoff', '', 'document'))}
    ${demoNotice()}
    <details class="workspace-mission-context"><summary><span><strong>Mission context</strong> · ${esc(state.settings.environment)}</span><small>${esc(environment.gravity)} · View guidance</small></summary><div class="care-context"><div><span class="eyebrow">MISSION CONTEXT</span><strong>${esc(state.settings.environment)}</strong><span>${esc(environment.gravity)}</span></div><p>${esc(environment.focus)}</p><button class="text-button" data-action="care-plan">Edit individual plan ${icon('arrowright')}</button></div></details>
    <div class="care-layout">${careTabsNav()}<div class="care-pane" id="care-pane">${careTabIntro()}${(CARE_TAB_PAGES[careTab] || careAssessmentPage)()}</div></div>
    <p class="care-scope-note">Research prototype. The symptom checklist supports a crew conversation; it is not validated triage, a diagnosis, or medical clearance. Use mission medical procedures.</p>`;
}
function careAssessmentPage() {
  const history = careAssessments().slice(-3).reverse();
  return `<div class="care-urgent-banner">${icon('alert')}<div><strong>Collapse, absent or abnormal breathing, or severe symptoms?</strong><p>Alert the crew and activate the onboard emergency procedure now. Do not wait to complete this form or receive a reply from Earth.</p></div><button class="button care-response-button" data-action="emergency">Medical response ${icon('arrowright')}</button></div>
    <div class="care-assessment-grid"><section class="panel care-check-panel"><div class="care-panel-heading"><span class="eyebrow">01 / OBSERVE</span><h2>Start with the crew member</h2><p>${esc(activeCrew().name)} · Check the person before the numbers.</p></div>
      <form id="care-assessment-form" class="care-assessment-form">
        <fieldset><legend>Are they responsive?</legend><div class="care-radio-row">${[['yes','Yes'],['no','No'],['unsure','Unsure']].map(([value,label]) => `<label><input type="radio" name="response" value="${value}" required><span>${label}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Are they breathing normally?</legend><div class="care-radio-row">${[['normal','Normal'],['abnormal','Absent or gasping'],['unsure','Unsure']].map(([value,label]) => `<label><input type="radio" name="breathing" value="${value}" required><span>${label}</span></label>`).join('')}</div></fieldset>
        <fieldset class="care-symptoms"><legend>Any urgent warning signs?</legend><p>Select reported or observed concerns. An unselected item does not rule it out.</p>${Object.entries(CARE_FLAGS).map(([key,label]) => `<label><input type="checkbox" name="flags" value="${key}"><span>${label}</span></label>`).join('')}</fieldset>
        <div class="form-grid"><label class="field full"><span>Symptom onset <small>(optional, local device time)</small></span><input class="field-input" type="datetime-local" name="onset" max="${localInput()}"></label><label class="field full"><span>Symptoms and observations <small>(optional)</small></span><textarea class="field-input" name="notes" maxlength="2000" placeholder="What changed, when it started, and what the crew has observed."></textarea></label></div>
        <div class="care-form-footer"><span>Save observations for this crew member.</span><button class="button primary" type="submit">Save assessment ${icon('check')}</button></div>
      </form></section>
      <aside class="care-review-column"><section class="panel care-result" id="care-result" aria-live="polite">${careResultMarkup({})}</section><section class="panel care-record-panel"><div class="care-panel-heading"><span class="eyebrow">02 / REVIEW</span><h2>Last recorded indicators</h2><p>Saved values, with individual recording times.</p></div><div class="care-readings">${Object.entries(META).map(([key,meta]) => {
        const r = latest(key), status = careReadingStatus(key,r);
        return `<div class="care-reading"><span>${icon(meta.icon)}${meta.short}</span><strong>${r ? (key === 'sys' ? `${r.sys}/${r.dia}` : formatNum(r[key],meta.digits)) : '—'}<small>${meta.unit}</small></strong><span class="care-reading-tag ${status.className}">${status.label}</span><small class="care-reading-time">${r ? careStamp(r.at) + (key === 'glucose' ? ' · ' + esc(r.glucoseContext || 'Context not recorded') : '') : 'No measurement available'}</small></div>`;
      }).join('')}</div><div class="care-record-footer"><button class="text-button" data-action="log">Log a measurement ${icon('plus')}</button><button class="text-button" data-action="care-plan">Set review bands</button></div><p class="care-record-note">Bands come from your entered plan, not NASA thresholds. A value within a band cannot rule out an emergency.</p></section></aside></div>
    ${careActionsMarkup()}<section class="panel care-history"><div class="care-panel-heading"><h2>Assessment record</h2><p>Saved observations for ${esc(activeCrew().name)} in this workspace.</p></div>${history.length ? history.map(check => `<button class="care-history-row" data-care-history="${esc(check.id)}"><span>${careStamp(check.at)}</span><strong>${esc(CareLogic.assessSafety(check).title)}</strong>${icon('chevronright')}</button>`).join('') : '<p class="care-history-empty">No guided assessments saved yet. Your existing vital history remains in the health log.</p>'}</section>`;
}
function careReadForm() {
  const form = document.getElementById('care-assessment-form');
  const data = form ? new FormData(form) : new FormData();
  return { at: new Date().toISOString(), response: data.get('response') || '', breathing: data.get('breathing') || '', flags: data.getAll('flags'), onset: data.get('onset') ? new Date(data.get('onset')).toISOString() : '', notes: String(data.get('notes') || '').trim() };
}
function careResultMarkup(check) {
  const result = CareLogic.assessSafety(check);
  const emergency = result.level === 'emergency';
  const body = emergency
    ? (result.arrest ? 'Unresponsive with absent or abnormal breathing: activate the mission CPR and AED procedure immediately. Use approved restraint methods and equipment; follow your training and AED prompts.' : 'Alert the crew medical officer and activate the relevant onboard emergency procedure immediately. Arrange trained care locally; ground contact must not delay it.')
    : result.level === 'uncertain' ? 'Do not treat uncertainty as a normal result. Alert another crew member and use the onboard primary assessment procedure.'
    : result.level === 'incomplete' ? 'Make a direct observation of responsiveness and normal breathing. Urgent symptoms can require action before any measurement is taken.'
    : 'No listed urgent sign has been selected. Review the symptoms, each reading’s time, and your medical plan with the crew medical officer. New, persistent, or concerning symptoms need review even when readings are within an entered band.';
  return `<div class="care-result-marker ${emergency ? 'emergency' : ''}">${icon(emergency ? 'alert' : 'clipboard')}<span>03 / NEXT CREW ACTION</span></div><h2>${result.title}</h2><p>${body}</p>${emergency || result.level === 'uncertain' ? `${MissionLogic.checklistFor(check) ? `<button class="button care-response-button" data-action="mission-run-start" data-id="${MissionLogic.checklistFor(check)}">Start ${esc(MissionLogic.CHECKLISTS[MissionLogic.checklistFor(check)].short.toLowerCase())} checklist</button> ` : ''}<button class="button care-response-button" data-action="emergency">Open medical response</button>` : '<button class="text-button" data-action="care-guide">How to take the measurements '+icon('arrowright')+'</button>'}<div class="care-result-foot">ORBIT does not alert the crew or contact ground medical support.</div>`;
}
function careMeasurementPage() {
  return `<div class="care-guide-intro"><span class="eyebrow">MEASURE / UNDERSTAND / ACT</span><h2>Make each reading useful.</h2><p>Use mission approved equipment and procedures. These reference cards explain the technique, context, and next step without assigning a diagnosis.</p></div><div class="care-guide-grid">${CARE_MEASUREMENTS.map((guide,i) => `<article class="panel care-guide-card"><div class="care-guide-card-head"><span>${icon(guide.icon)}</span><div><small>INDICATOR ${String(i+1).padStart(2,'0')}</small><h2>${guide.title}</h2></div></div><p class="care-equipment">${guide.equipment}</p><details ${i === 0 ? 'open' : ''}><summary>How to take it</summary><ol>${guide.steps.map(step => `<li>${step}</li>`).join('')}</ol></details><div class="care-guide-block"><h3>Why it matters</h3><p>${guide.why}</p></div><div class="care-guide-block"><h3>What to do next</h3><p>${guide.next}</p></div>${HrpLinks.forIndicator(guide.key).length?`<div class="care-guide-block"><h3>NASA risks it helps watch</h3>${hrpQuote(HrpLinks.quoteFor(guide.key))}${hrpRiskList(HrpLinks.forIndicator(guide.key),'action')}</div>`:''}${HrpLinks.csaForIndicator(guide.key).experiments.length?`<div class="care-guide-block"><h3>Canadian experiments that measure it</h3>${csaBlock(HrpLinks.csaForIndicator(guide.key),true)}</div>`:''}<div class="care-guide-source">${careLink(guide.url,guide.source)}</div></article>`).join('')}</div><div class="care-guide-bottom"><button class="button primary" data-action="log">Log measured indicators ${icon('plus')}</button><button class="text-button" data-action="care-plan">Review your individual plan ${icon('arrowright')}</button></div>`;
}
function careInlineGuideMarkup() {
  return `<div class="care-inline-guide" id="log-care-guide" hidden><p>Use the mission and device procedures. Open an indicator for technique and context; your unfinished entry stays in this form.</p>${CARE_MEASUREMENTS.map(guide => `<details><summary>${guide.title}</summary><ol>${guide.steps.map(step => `<li>${step}</li>`).join('')}</ol><strong>Why it matters</strong><p>${guide.why}</p><strong>Next step</strong><p>${guide.next}</p>${HrpLinks.forIndicator(guide.key).length?`<strong>NASA risks it helps watch</strong>${hrpRiskList(HrpLinks.forIndicator(guide.key))}`:''}${careLink(guide.url,guide.source)}</details>`).join('')}</div>`;
}
function careMissionPage() {
  const tasks = careTasks(), env = careEnvironment();
  const hazards = [
    ['Space radiation','Use mission dosimetry and radiation procedures. Routine vital signs cannot estimate a radiation dose.','Radiation procedure and dosimeter review'],
    ['Isolation and confinement','Record sleep, workload, and mood changes, and use private support channels.','Sleep and wellbeing check-in'],
    ['Distance from Earth','Keep procedures and assessment records onboard, and use the approved delayed communication plan.','Local response and handoff readiness'],
    ['Altered gravity','Follow the individual exercise plan and note changes in mobility or tolerance to activity.','Prescribed exercise and symptom record'],
    ['Hostile or closed environment','Review cabin alerts and report shared symptoms. ORBIT entries do not measure cabin air or pressure.','Vehicle environmental and medical procedures']
  ];
  return `<div class="care-mission-grid"><section class="panel care-plan-panel"><div class="care-panel-heading"><span class="eyebrow">TODAY / LOCAL DEVICE TIME</span><h2>Individual task schedule</h2><p>${carePlan().remindersEnabled ? 'In-session reminders are enabled.' : 'Enable in-session reminders in the individual plan.'}</p></div><div class="care-task-list">${tasks.map(task => `<div data-care-task="${task.id}" class="care-task ${task.done ? 'done' : task.due ? 'due' : ''}"><span class="care-task-time">${task.time}</span><div><strong>${task.title}</strong><p>${task.description}</p></div><span class="care-task-state">${task.done ? 'Complete' : task.due ? 'Due' : 'Upcoming'}</span></div>`).join('')}</div><div class="care-plan-footer"><button class="button small" data-action="care-plan">Edit individual plan ${icon('settings')}</button><a class="text-button" href="#routine">Open daily checklist ${icon('arrowright')}</a></div><p class="care-record-note">Reminders work while ORBIT is open and visible. Use the mission scheduling system for dependable background alarms.</p></section>
    <aside class="care-mission-aside"><section class="panel care-environment-panel"><span class="eyebrow">${esc(state.settings.environment).toUpperCase()}</span><h2>${env.gravity}</h2><p>${env.task}</p><button class="text-button" data-action="settings">Change environment ${icon('arrowright')}</button></section><section class="panel care-offline-panel"><span class="eyebrow">ONBOARD AVAILABILITY</span><h2>Keep the tools available.</h2><p id="care-offline-status" role="status">${esc(careOfflineMessage)}</p><button class="button small" data-action="care-offline" ${careOfflineBusy ? 'disabled' : ''}>${careOfflineBusy ? 'Preparing…' : careOfflineReady ? 'Refresh offline package' : 'Prepare offline package'} ${icon('download')}</button><small>About 107 MB, including all supplied anatomy. Medical records stay in browser storage; exported records provide a separate backup.</small></section></aside></div>
    <div class="section-label care-hazard-heading"><h2>Five hazards, practical checks</h2><span>NASA HUMAN RESEARCH PROGRAM</span></div><div class="care-hazard-list">${hazards.map(([title,description,action],i) => `<article class="panel care-hazard-row"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${title}</h3><p>${description}</p></div><small>${action}</small></article>`).join('')}</div><section class="panel care-research"><div><span class="eyebrow">RESEARCH / SOURCE MATERIAL</span><h2>Build on spaceflight science.</h2><p>NASA’s Open Science Data Repository contains space biology research for study and software evaluation. Its experiments are not live crew records or validated diagnostic thresholds.</p></div><div>${careLink('https://www.nasa.gov/hrp/hazards/','NASA Human Research Program')}${careLink('https://science.nasa.gov/biological-physical/data/osdr/','NASA Open Science Data Repository')}${careLink('https://www.youtube.com/watch?v=RERG3gEmdC8','Challenge video')}</div></section>`;
}
function carePlanModal() {
  const plan = carePlan();
  const bands = [['hr','Heart rate','bpm'],['sys','Systolic pressure','mmHg'],['dia','Diastolic pressure','mmHg'],['temp','Temperature','°C'],['glucose','Glucose','mg/dL'],['spo2','Oxygen saturation','%'],['rr','Respiratory rate','breaths/min']];
  modal('Individual care plan', esc(activeCrew().name) + ' · Scheduling and review preferences', `<form id="care-plan-form"><p class="form-help">Copy the schedule and review bands from the individual medical plan. These entries do not verify clinical approval or prescribe treatment.</p><h3 class="care-form-heading">Daily schedule</h3><div class="form-grid">${ROUTINES.map(task => `<label class="field"><span>${task.title}</span><input class="field-input" type="time" name="time-${task.id}" value="${esc(plan.schedule?.[task.id] || task.time)}" required></label>`).join('')}</div><label class="care-enable-reminders"><input type="checkbox" name="reminders" ${plan.remindersEnabled ? 'checked' : ''}>Enable reminders while ORBIT is open and visible</label><h3 class="care-form-heading">Individual review bands <small>Optional</small></h3><p class="form-help">Leave a boundary blank if it is not specified. Glucose bands apply only to the matching meal context. No universal or NASA clinical limits are supplied.</p><div class="care-band-table"><div class="care-band-head"><span>Indicator</span><span>Lower</span><span>Upper</span></div>${bands.map(([key,label,unit]) => `<div class="care-band-row"><span>${label}<small>${unit}</small></span>${['min','max'].map(bound => `<input class="field-input" aria-label="${label} ${bound === 'min' ? 'lower' : 'upper'} review boundary" name="${key}-${bound}" type="number" min="0" step="any" value="${Number.isFinite(plan.limits?.[key]?.[bound]) ? plan.limits[key][bound] : ''}" placeholder="Not set">`).join('')}</div>`).join('')}</div><div class="form-grid"><label class="field full"><span>Glucose band context</span><select class="field-input" name="glucoseContext">${['Fasting','Before meal','After meal'].map(v => `<option ${plan.glucoseContext === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="field full"><span>Onboard procedure or medical channel <small>(optional)</small></span><input class="field-input" name="protocol" maxlength="160" value="${esc(plan.protocol || '')}" placeholder="Procedure reference and approved contact channel"></label></div><h3 class="care-form-heading">Daily plan and care instructions</h3><p class="form-help">Copy targets and instructions from the individual medical plan. These are planning entries, not prescriptions generated by ORBIT.</p><div class="form-grid"><label class="field"><span>Entered fluid target <small>(mL/day, optional)</small></span><input class="field-input" name="fluidTarget" type="number" min="0" max="10000" step="1" value="${Number.isFinite(plan.fluidTarget)?plan.fluidTarget:''}"></label><label class="field"><span>Entered exercise target <small>(min/day, optional)</small></span><input class="field-input" name="exerciseTarget" type="number" min="0" max="1440" step="1" value="${Number.isFinite(plan.exerciseTarget)?plan.exerciseTarget:''}"></label><label class="field full"><span>Instructions from the medical plan <small>(optional)</small></span><textarea class="field-input" name="careInstructions" maxlength="4000" placeholder="Record the medical team’s treatment, restrictions, repeat measurements, and follow-up instructions.">${esc(plan.careInstructions||'')}</textarea></label></div><p class="form-error" id="care-plan-error" role="alert"></p></form>`, `${button('Cancel','close-modal')}<button class="button primary" form="care-plan-form" type="submit">Save individual plan</button>`);
  $('#care-plan-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.target), limits = {}, schedule = {};
    for (const [key,label] of bands) {
      const band = {};
      for (const bound of ['min','max']) if (String(form.get(`${key}-${bound}`)).trim() !== '') band[bound] = Number(form.get(`${key}-${bound}`));
      if (Object.values(band).some(v => !Number.isFinite(v) || v < 0) || (Number.isFinite(band.min) && Number.isFinite(band.max) && band.min >= band.max)) {
        $('#care-plan-error').textContent = `Check the ${label.toLowerCase()} band. The lower boundary must be smaller than the upper boundary.`; return;
      }
      limits[key] = band;
    }
    ROUTINES.forEach(task => { schedule[task.id] = form.get(`time-${task.id}`); });
    activeCrew().carePlan = { ...plan, fluidTarget:form.get('fluidTarget')===''?null:Number(form.get('fluidTarget')), exerciseTarget:form.get('exerciseTarget')===''?null:Number(form.get('exerciseTarget')), careInstructions:String(form.get('careInstructions')||'').trim(), schedule, limits, glucoseContext: form.get('glucoseContext'), protocol: form.get('protocol').trim(), remindersEnabled: form.has('reminders') };
    persist(); announceFormSaved('care-plan-form',event.target); closeModal(); render(); toast('Individual plan saved for ' + activeCrew().name + '.');
  });
}
function careHandoff(check = careReadForm(), show = false) {
  const snapshot = check.snapshot || { readings: careLatestReadings(), conditions: activeCrew().conditions.map(c => ({...c})), protocol: carePlan().protocol || '', mission: {...state.settings}, crew: {name:activeCrew().name,role:activeCrew().role}, workspace:state.mode };
  const text = CareLogic.handoffText({ ...snapshot, check: { ...check, flagLabels: (check.flags || []).map(flag => CARE_FLAGS[flag]).filter(Boolean) } });
  if (show) modal('Saved assessment', careStamp(check.at) + ' · ' + esc(activeCrew().name), `<pre class="care-handoff-preview">${esc(text)}</pre>`, `${button('Close','close-modal')}<button class="button primary" data-care-export="${esc(check.id)}">Download PDF</button>`);
  else { download(`orbit-${state.mode}-crew-handoff-${todayKey()}.pdf`, PdfLogic.fromText(text), 'application/pdf'); toast('Handoff PDF downloaded. It has not been sent.'); }
}
function emergencyResponseModal(suggested = null) {
  modal('Crew medical response', 'Immediate care follows the approved onboard procedure.', `<div class="care-emergency-lead">${icon('alert')}<p><strong>Do not wait for the dashboard or a reply from Earth.</strong> Collapse, abnormal breathing, severe chest discomfort, or other serious symptoms require an immediate crew response.</p></div>${missionChecklistPanel(suggested)}<ol class="care-response-steps"><li><span>01</span><div><h3>Alert and assign</h3><p>Alert the crew medical officer. Activate the onboard emergency procedure and assign a crew member to obtain the medical kit and AED when available.</p></div></li><li><span>02</span><div><h3>Check response and normal breathing</h3><p>Use your trained primary assessment. If the person is unresponsive and is not breathing normally or is only gasping, begin the mission CPR and AED procedure immediately.</p></div></li><li><span>03</span><div><h3>Use the correct onboard method</h3><p>Follow trained care, approved body restraints, and equipment instructions. Use AED prompts when available. Earth positioning techniques may not work in microgravity.</p></div></li><li><span>04</span><div><h3>Coordinate ground support</h3><p>Use the mission emergency communication channel. Continue trained immediate care during delays. Record the onset and actions when another crew member can do so without delaying care.</p></div></li></ol><div class="care-response-reference"><strong>Your entered procedure or channel</strong><p>${esc(carePlan().protocol || 'No reference entered. Use the onboard mission medical plan.')}</p></div><p class="form-help">This is an educational response overview, not a flight medical protocol. ORBIT cannot call for help, assess the person, or provide a validated treatment workflow.</p><div class="care-guide-source">${careLink('https://www.heart.org/en/health-topics/cardiac-arrest/emergency-treatment-of-cardiac-arrest','AHA: cardiac arrest response')}${careLink('https://www.heart.org/health-topics/heart-attack/warning-signs-of-a-heart-attack','AHA: heart attack warning signs')}</div>`, `${button('Close','close-modal')}${button('Flight surgeon report','mission-report','','document')}`);
}
function handleCareControl(target) {
  if (target.dataset.action === 'care-inline-guide') {
    const guide = $('#log-care-guide');
    if (guide) { guide.hidden = !guide.hidden; target.setAttribute('aria-expanded', String(!guide.hidden)); }
    return true;
  }
  if (target.dataset.careTab) { careTab = target.dataset.careTab; render(); $(`.care-rail-item[data-care-tab="${careTab}"]`)?.focus({ preventScroll: true }); const pane = $('#care-pane'); if (pane && pane.getBoundingClientRect().top < 0) pane.scrollIntoView({ block: 'start' }); return true; }
  if (target.dataset.careHistory) { const check = careAssessments().find(a => a.id === target.dataset.careHistory); if (check) careHandoff(check,true); return true; }
  if (target.dataset.careExport) { const check = careAssessments().find(a => a.id === target.dataset.careExport); if (check) careHandoff(check); return true; }
  const actions = { emergency: () => emergencyResponseModal(), 'care-plan': carePlanModal, 'care-handoff': missionReportModal, 'care-guide': () => { closeModal(); careTab = 'measurements'; if (currentPage() === 'care') render(); else location.hash = 'care'; }, 'care-offline': prepareCareOffline };
  if (actions[target.dataset.action]) { actions[target.dataset.action](); return true; }
  return false;
}
function attachCarePage() {
  const rail = $('.care-rail');
  if (rail) rail.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = $$('.care-rail-item'), i = items.indexOf(document.activeElement);
    if (i < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  });
  if(careTab==='inputs')attachHealthInputs();
  if(careTab==='skin')attachSkinPage();
  const form = $('#care-assessment-form');
  if (!form) return;
  form.addEventListener('change', () => { const check=careReadForm(),result = $('#care-result'); result.innerHTML = careResultMarkup(check); hydrateIcons(result);const actions=$('#care-prevention-actions');if(actions)actions.hidden=['emergency','uncertain'].includes(CareLogic.assessSafety(check).level); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const check = { ...careReadForm(), id: crewUID('assessment'), crewId: activeCrewId() };
    check.snapshot = { readings: careLatestReadings(), conditions: activeCrew().conditions.map(c => ({...c})), protocol: carePlan().protocol || '', mission: {...state.settings}, crew: {name:activeCrew().name,role:activeCrew().role}, workspace:state.mode };
    if (!Array.isArray(db().assessments)) db().assessments = [];
    db().assessments.push(check); persist(); announceFormSaved('care-assessment-form',event.target);
    careHandoff(check,true); toast('Assessment saved. No medical message has been sent.');
  });
}
function careTick() {
  if (document.visibilityState !== 'visible') return;
  const tasks = careTasks();
  for (const task of tasks) {
    const row = document.querySelector(`[data-care-task="${task.id}"]`);
    if (!row) continue;
    row.classList.toggle('done', task.done); row.classList.toggle('due', task.due);
    row.querySelector('.care-task-state').textContent = task.done ? 'Complete' : task.due ? 'Due' : 'Upcoming';
  }
  if (!carePlan().remindersEnabled) return;
  const receiptKey = t => `${activeCrewId()}:${todayKey()}:${t.id}`;
  const task = CareLogic.nextReminder(tasks, db().careReminderReceipts, receiptKey);
  if (!task) return;
  if (!db().careReminderReceipts) db().careReminderReceipts = {};
  db().careReminderReceipts[receiptKey(task)] = new Date().toISOString(); persist();
  toast(`${task.title} is due at ${task.time}. Open Daily routine or Health assessment.`);
}
function updateCareOfflineUI() {
  const status = $('#care-offline-status'); if (status) status.textContent = careOfflineMessage;
  const button = $('[data-action="care-offline"]'); if (button) { button.disabled = careOfflineBusy; button.textContent = careOfflineBusy ? 'Preparing…' : careOfflineReady ? 'Refresh offline package' : 'Prepare offline package'; }
}
async function prepareCareOffline() {
  if (careOfflineBusy) return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) { careOfflineMessage = 'Offline preparation needs a browser with service worker support over HTTPS or localhost.'; updateCareOfflineUI(); return; }
  careOfflineBusy = true; careOfflineMessage = 'Preparing the app shell…'; updateCareOfflineUI();
  try {
    await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Offline worker did not activate')), 30000))
    ]);
    const channel = new MessageChannel();
    let timeout;
    const renewTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        careOfflineBusy = false;
        careOfflineMessage = 'Offline preparation stopped responding. Check the connection and storage, then retry.';
        channel.port1.close(); updateCareOfflineUI();
      }, 30000);
    };
    renewTimeout();
    channel.port1.onmessage = event => {
      const data = event.data;
      renewTimeout();
      if (data.type === 'progress') careOfflineMessage = `Saving anatomy and app assets: ${data.done} / ${data.total} files.`;
      if (data.type === 'complete') { careOfflineBusy = false; careOfflineReady = true; careOfflineMessage = 'Offline package ready. The app, measurement guides, and all supplied anatomy files are cached on this device.'; clearTimeout(timeout); channel.port1.close(); }
      if (data.type === 'error') { careOfflineBusy = false; careOfflineMessage = 'Offline preparation did not finish. Check the connection and browser storage, then try again.'; clearTimeout(timeout); channel.port1.close(); }
      updateCareOfflineUI();
    };
    registration.active.postMessage({ type: 'PREPARE_OFFLINE' }, [channel.port2]);
  } catch { careOfflineBusy = false; careOfflineMessage = 'Offline preparation is unavailable in this browser. Keep exported records and approved procedures available separately.'; updateCareOfflineUI(); }
}
async function checkCareOffline() {
  const registration = await navigator.serviceWorker.getRegistration('./').catch(() => null);
  if (!registration?.active) return null;
  const channel = new MessageChannel();
  channel.port1.onmessage = event => { if (event.data.type === 'status') { const wasReady = careOfflineReady; channel.port1.close(); if (careOfflineBusy) return; careOfflineReady = event.data.ready; if (careOfflineReady) careOfflineMessage = 'Offline package ready on this device.'; else if (wasReady) careOfflineMessage = 'A site update replaced part of the offline package. Prepare it again before going offline.'; updateCareOfflineUI(); } };
  registration.active.postMessage({ type: 'OFFLINE_STATUS' }, [channel.port2]);
  return registration;
}
window.addEventListener('load', async () => {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', checkCareOffline);
  const registration = await checkCareOffline();
  registration?.update().catch(() => {});
});
