'use strict';

/* Pages and forms for crew status, health risks, wellbeing, exercise, emergency checklists and the flight surgeon report. */
const MISSION_STORES = { riskRecords: [], workouts: [], emergencyRuns: [] };

const MISSION_SAMPLE_ENTRY = /(^|-)sample-\d+$/;
const MISSION_WORKOUTS = ['Aerobic', 'Resistance', 'Mobility'];
const MISSION_NASA_RADIATION = 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf';
const MISSION_NASA_BONE = 'https://nasa.gov/wp-content/uploads/2023/03/bone-loss-technical-brief-ochmo-1.pdf';
const missionEmptyPlan = { start: '', days: 0, radiationLimit: 600, boneLimit: null, muscleLimit: null };

function missionDateOffset(days) { const d = new Date(); d.setDate(d.getDate() + days); return d; }
function missionSeedRisk(w) {
  const profiles = { 'crew-01': { prior: 40, dose: .6, bone: 1.04, boneLoss: .015, muscle: 128, muscleLoss: .02 }, 'crew-02': { prior: 120, dose: .6, bone: 1.01, boneLoss: .022, muscle: 136, muscleLoss: .04 }, 'crew-03': { prior: 430, dose: .65, bone: .98, boneLoss: .012, muscle: 104, muscleLoss: .02 }, 'crew-04': { prior: 0, dose: .55, bone: 1.08, boneLoss: .011, muscle: 142, muscleLoss: .02 } };
  for (const p of w.crew) {
    const s = profiles[p.id]; if (!s) continue;
    p.priorDose = s.prior;
    [42, 28, 14, 1].forEach((back, i) => {
      const elapsed = 42 - back, at = missionDateOffset(-back).toISOString(), add = (kind, value, source) => w.riskRecords.push({ id: crewUID('risk'), crewId: p.id, at, kind, value, source, sample: true });
      add('radiation', Number((elapsed * s.dose).toFixed(1)), 'Sample dosimeter reading');
      if (i !== 3) add('bone', Number((s.bone * (1 - s.boneLoss * elapsed / 30.44)).toFixed(3)), 'Sample scan');
      if (i !== 3) add('muscle', Math.round(s.muscle * (1 - s.muscleLoss * elapsed / 30.44)), 'Sample strength test');
    });
  }
}

function missionSeedExercise(w) {
  const skipDays = { 'crew-02': [1, 3, 4, 6], 'crew-03': [2] };
  for (const p of w.crew) {
    p.carePlan = { schedule: {}, limits: {}, remindersEnabled: false, protocol: '', ...p.carePlan, exerciseTarget: p.carePlan?.exerciseTarget ?? 120 };
    for (let back = 13; back >= 0; back--) {
      if (skipDays[p.id]?.includes(back)) continue;
      const day = missionDateOffset(-back), at = hours => { const d = new Date(day); d.setHours(hours, 0, 0, 0); return (d > new Date() ? new Date(Date.now() - 60000) : d).toISOString(); };
      const aerobic = 45 + back % 3 * 10, resistance = 60 + back % 2 * 15;
      w.workouts.push({ id: crewUID('workout'), crewId: p.id, at: at(9), type: 'Aerobic', minutes: aerobic, effort: 6, notes: '', sample: true }, { id: crewUID('workout'), crewId: p.id, at: at(10), type: 'Resistance', minutes: resistance, effort: 7, notes: '', sample: true });
      const entry = w.entries.find(e => (e.crewId || 'crew-01') === p.id && MISSION_SAMPLE_ENTRY.test(e.id) && MissionLogic.dayKey(e.at) === MissionLogic.dayKey(day));
      if (entry) entry.exercise = aerobic + resistance;
    }
  }
}
function missionSeedWellbeing(w) {
  const strained = { 'crew-01': true };
  const recent = w.entries.filter(e => MISSION_SAMPLE_ENTRY.test(e.id)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  for (const p of w.crew) {
    recent.filter(e => (e.crewId || 'crew-01') === p.id).slice(0, 14).forEach((e, back) => {
      const worse = strained[p.id] ? Math.max(0, 7 - back) : 0;
      e.wellbeing = { sleepQuality: Math.max(1, 4 - Math.round(worse / 3)), fatigue: Math.min(5, 2 + Math.round(worse / 3)), stress: Math.min(5, 2 + Math.round(worse / 3)), connection: 4 };
    });
  }
}
/* Crew 03's resting heart rate climbs across the last week so the demo shows a trend alert. */
function missionSeedTrend(w) {
  w.entries.filter(e => e.crewId === 'crew-03' && MISSION_SAMPLE_ENTRY.test(e.id)).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-7).forEach((e, i) => { e.hr += Math.round((i + 1) * 1.6); });
}
function missionKeepSampleCurrent(w) {
  const samples = w.entries.filter(e => MISSION_SAMPLE_ENTRY.test(e.id));
  if (!samples.length) return;
  const newest = Math.max(...samples.map(e => Date.parse(e.at))), gap = Math.floor((Date.parse(`${todayKey()}T00:00:00`) - Date.parse(`${MissionLogic.dayKey(newest)}T00:00:00`)) / MissionLogic.DAY);
  if (gap < 1) return;
  const shift = at => new Date(Math.min(Date.parse(at) + gap * MissionLogic.DAY, Date.now())).toISOString();
  samples.forEach(e => { e.at = shift(e.at); });
  for (const list of [w.riskRecords, w.workouts]) list.filter(r => r.sample).forEach(r => { r.at = shift(r.at); });
  skinShiftSamples(w, gap);
  if (w.mission.start) w.mission.start = new Date(Date.parse(`${w.mission.start}T00:00:00`) + gap * MissionLogic.DAY).toLocaleDateString('en-CA');
}
function initMissionData() {
  for (const mode of ['demo', 'personal']) {
    const w = state.data[mode];
    for (const key of Object.keys(MISSION_STORES)) if (!Array.isArray(w[key])) w[key] = [];
    if (!w.mission) w.mission = { ...missionEmptyPlan };
    if (!w.missionDataVersion) {
      if (mode === 'demo') {
        w.mission = { start: missionDateOffset(-42).toLocaleDateString('en-CA'), days: 180, radiationLimit: 600, boneLimit: 10, muscleLimit: 15 };
        missionSeedRisk(w); missionSeedExercise(w); missionSeedWellbeing(w); missionSeedTrend(w);
      }
      w.missionDataVersion = 1;
    }
  }
  missionReseedRestoredCrew(state.data.demo);
  initSkinData();
  missionKeepSampleCurrent(state.data.demo);
}
/* Sample crew restored by initCrewData (ui/crew.js) after a workspace was saved without them get the
   mission data a fresh demo gives them: wellbeing check-ins and the heart-rate trend on their
   restored entries, an exercise target, and workouts and risk records only where none survived. */
function missionReseedRestoredCrew(w) {
  const ids = new Set(w.restoredSampleCrew || []);
  delete w.restoredSampleCrew;
  if (!ids.size) return;
  for (const p of w.crew.filter(c => ids.has(c.id))) {
    const view = { crew: [p], entries: w.entries.filter(e => e.crewId === p.id), workouts: [], riskRecords: [] };
    missionSeedWellbeing(view); missionSeedTrend(view);
    if (!w.workouts.some(r => r.crewId === p.id)) { missionSeedExercise(view); w.workouts.push(...view.workouts); }
    else p.carePlan = { schedule: {}, limits: {}, remindersEnabled: false, protocol: '', ...p.carePlan, exerciseTarget: p.carePlan?.exerciseTarget ?? 120 };
    if (!w.riskRecords.some(r => r.crewId === p.id)) { missionSeedRisk(view); w.riskRecords.push(...view.riskRecords); }
  }
}
function missionEmptyStores() { return { riskRecords: [], workouts: [], emergencyRuns: [], skinChecks: [], wounds: [], mission: { ...missionEmptyPlan } }; }

const missionPlan = () => db().mission;
const missionStamp = at => `${dayLabel(at)} · ${new Date(at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
const missionTile = (label, value, sub) => `<div class="stat-box"><span class="eyebrow">${label}</span><strong>${value}</strong><small>${sub}</small></div>`;
const missionPill = (level, text) => `<span class="mission-pill ${level}">${icon({ urgent: 'alert', review: 'info', due: 'clock', clear: 'check', historical: 'document' }[level])}${esc(text)}</span>`;
const missionField = (label, name, attrs = '', help = '') => `<label class="field"><span>${label}${help ? ` <small>(${help})</small>` : ''}</span><input class="field-input" name="${name}" ${attrs}></label>`;
const missionNumber = value => String(value ?? '').trim() === '' ? null : Number(value);
function missionFormError(message) { const el = $('#mission-form-error'); if (el) el.textContent = message; }
function missionSave(message) { persist(); closeModal(); render(); toast(storageAvailable ? message : 'Saved for this session only. Export it before closing the page.'); }
function missionConfirm(title, text, action, id, label) { modal(title, '', `<p class="form-help">${text}</p>`, `${button('Keep it', 'close-modal')}<button class="button danger" data-action="${action}" data-id="${esc(id)}">${label}</button>`); }

function missionRiskSummaries(profile) {
  const plan = missionPlan(), records = db().riskRecords.filter(r => r.crewId === profile.id);
  return [['radiation', plan.radiationLimit], ['bone', plan.boneLimit], ['muscle', plan.muscleLimit]].map(([kind, limit]) => MissionLogic.riskSummary(kind, records, { limit, prior: Number.isFinite(profile.priorDose) ? profile.priorDose : 0, mission: plan }));
}
function missionCrewView(profile) {
  /* Status is worked out from the full record so a neutral support prompt still reaches the crew; the detail behind it is only shown to people allowed to see it. */
  const raw = crewRecords(profile.id, { raw: true }), records = crewRecords(profile.id), open = canSeeWellbeing(profile.id);
  const allAlerts = MissionLogic.trendAlerts(raw), alerts = open ? allAlerts : allAlerts.filter(a => !a.private);
  const assessments = (db().assessments || []).filter(a => a.crewId === profile.id).map(a => ({ at: a.at, level: CareLogic.assessSafety(a).level }));
  const openRuns = db().emergencyRuns.filter(r => r.crewId === profile.id && !r.closedAt).map(r => ({ ...r, title: MissionLogic.CHECKLISTS[r.checklist]?.short || 'Emergency' }));
  const risks = missionRiskSummaries(profile), fullWellbeing = MissionLogic.wellbeingSummary(raw, { sleepTarget: state.settings.sleepTarget });
  const wellbeing = open ? fullWellbeing : AccessLogic.hideSummary(fullWellbeing);
  const status = MissionLogic.crewStatus({ records: raw, alerts: allAlerts, assessments, openRuns, riskFlags: MissionLogic.riskFlags(risks), extraReasons: SkinLogic.crewReasons(db().skinChecks.filter(c => c.crewId === profile.id), db().wounds.filter(w => w.crewId === profile.id)), supportSuggested: fullWellbeing.supportSuggested, historical: profile.historical ? profile.mission || 'a past mission' : null });
  const exercise = MissionLogic.exerciseSummary(db().workouts.filter(w => w.crewId === profile.id), { target: profile.carePlan?.exerciseTarget });
  return { profile, records, alerts, openRuns, risks, wellbeing, status, exercise };
}



/* Crew status */
function missionCrewCard(view) {
  const { profile: p, status, wellbeing, exercise } = view, hr = crewLatest(p.id, 'hr'), bp = crewLatest(p.id, 'sys');
  const reasons = status.reasons.slice(0, 3);
  return `<article class="panel mission-crew-card ${status.level}"><div class="mission-crew-top"><span class="roster-avatar">${esc(crewInitial(p))}</span><div><h3>${esc(p.name)}</h3><p>${esc(p.role)}</p></div>${missionPill(status.level, status.label)}</div>
    <div class="mission-crew-values"><span>HR<b>${hr ? formatNum(hr.hr) : '—'}</b></span><span>BP<b>${bp ? `${formatNum(bp.sys)}/${formatNum(bp.dia)}` : '—'}</b></span><span>Exercise<b>${p.historical ? '—' : exercise.metDays === null ? `${exercise.activeDays}/7` : `${exercise.metDays}/7`}</b><small>${p.historical ? 'not recorded' : exercise.metDays === null ? 'days' : 'days on target'}</small></span></div>
    ${reasons.length ? `<ul class="mission-reasons">${reasons.map(r => `<li>${esc(r.text)}</li>`).join('')}</ul>${status.reasons.length > 3 ? `<p class="mission-more">${status.reasons.length - 3} more in the report</p>` : ''}` : '<p class="mission-clear-note">Nothing flagged from the saved records.</p>'}
    <div class="mission-crew-foot"><small>${p.historical ? `${esc(p.mission || 'Past mission')} · ${esc((p.missionDate || '').slice(0, 4))}` : `${status.lastVitals ? `Vitals ${missionStamp(status.lastVitals)}` : 'No vitals yet'} · Check-in ${wellbeing.overdue ? 'overdue' : 'current'}`}</small><div><button class="text-button" data-action="mission-crew-report" data-id="${esc(p.id)}">Report</button><button class="text-button" data-action="mission-crew-open" data-id="${esc(p.id)}">Open record ${icon('arrowright')}</button></div></div></article>`;
}
function missionStatusPage() {
  const views = crewProfiles().map(missionCrewView).sort((a, b) => a.status.rank - b.status.rank);
  const attention = views.filter(v => v.status.rank < MissionLogic.STATUS.due.rank), overdue = views.filter(v => v.status.overdue);
  const top = views[0];
  const topReason = top?.status.reasons[0];
  return `${pageHeading('Crew status', 'Who needs attention first, across the whole crew.', button('<span class="export-label">Flight surgeon report</span>', 'mission-report', '', 'document'))}${demoNotice()}
    ${topReason && top.status.rank <= MissionLogic.STATUS.review.rank ? `<section class="mission-priority ${top.status.level}">${icon('alert')}<div><span class="eyebrow">MOST URGENT</span><strong>${esc(top.profile.name)}: ${esc(topReason.text)}</strong></div><button class="button small" data-action="mission-crew-open" data-id="${esc(top.profile.id)}">Open record</button></section>` : ''}
    <div class="stat-strip mission-tiles">${missionTile('NEED ATTENTION', attention.length, `of ${views.filter(v => !v.profile.historical).length} crew members`)}${missionTile('CHECKS OVERDUE', overdue.length, 'no vitals in 36 hours')}${missionTile('CREW TRACKED', views.length, 'local crew profiles')}</div>
    <div class="section-label"><h2>Crew, most urgent first</h2></div>
    <div class="mission-crew-grid">${views.map(missionCrewCard).join('')}</div>
    <div class="notice">${icon('lock')}<p>Status comes from records saved in this browser, not live telemetry. “No flags” does not mean a crew member is well. Wellbeing scores stay out of this shared view; only a neutral prompt appears.</p></div>`;
}

/* Trend alerts */
function missionAlertRows(alerts) {
  return alerts.map(a => `<li class="mission-alert ${a.severity}">${missionPill(a.severity === 'review' ? 'review' : 'due', a.severity === 'review' ? 'Review' : 'Watch')}<p>${esc(a.message)}</p></li>`).join('');
}
function missionTrendPanel() {
  const alerts = MissionLogic.trendAlerts(entries());
  return `<section class="panel mission-panel"><div class="panel-head"><div><h2>Trend alerts</h2><p>${esc(activeCrew().name)} · Last 7 days compared with the 21 days before</p></div></div>${alerts.length ? `<ul class="mission-alerts">${missionAlertRows(alerts)}</ul>` : '<p class="mission-clear-note">No sustained changes in the saved readings. At least 3 recent and 5 earlier readings are needed for each indicator.</p>'}</section>`;
}
function missionAlertStrip() {
  const alerts = MissionLogic.trendAlerts(entries());
  if (!alerts.length) return '';
  return `<section class="care-overview-strip mission-strip"><div class="care-strip-icon">${icon('chart')}</div><div><strong>${alerts.length === 1 ? 'Trend alert' : `${alerts.length} trend alerts`}</strong><p>${esc(alerts[0].message)}</p></div><a class="button small" href="#trends">Review trends ${icon('arrowright')}</a></section>`;
}

/* Mission health risks */
const missionRiskPills = { over: ['urgent', 'Past limit'], projected: ['review', 'Projected past limit'], approaching: ['review', 'Approaching limit'], ok: ['clear', 'Within limit'], unset: ['due', 'Limit not set'], none: ['due', 'No readings'] };
function missionRiskText(s) {
  const unit = s.kind === 'radiation' ? ' mSv' : '%', noun = s.kind === 'radiation' ? 'career dose' : 'loss';
  if (!s.count) return 'No readings yet.';
  const pace = s.rate === null ? '' : s.kind === 'radiation' ? ` Rate ${s.rate} mSv/day.` : ` Rate ${s.rate}% per month.`;
  return `${s.current}${unit} ${noun}${s.limit ? ` against a limit of ${s.limit}${unit}` : ''}.${pace}${s.projected === null ? '' : ` Projected ${s.projected}${unit} at mission end.`}`;
}
function missionRiskCard(s) {
  const kind = MissionLogic.RISK_KINDS[s.kind], [level, label] = missionRiskPills[s.status], unit = s.kind === 'radiation' ? 'mSv' : '%';
  const percent = Math.min(100, s.percent ?? 0), projected = Math.min(100, s.projectedPercent ?? 0);
  return `<article class="panel mission-risk"><div class="mission-risk-top"><h3>${{ radiation: 'Radiation dose', bone: 'Bone density loss', muscle: 'Muscle strength loss' }[s.kind]}</h3>${missionPill(level, label)}</div>
    <div class="mission-risk-value">${s.count ? s.current : '—'}<small>${s.count ? unit : ''}${s.limit ? ` of ${s.limit}` : ''}</small></div>
    ${s.limit ? `<div class="mission-meter" role="img" aria-label="${percent} percent of the limit now${s.projectedPercent !== null ? `, ${s.projectedPercent} percent projected at mission end` : ''}"><span class="projected" style="width:${projected}%"></span><span class="now" style="width:${percent}%"></span></div><div class="mission-meter-key"><span>Now ${s.percent ?? 0}%</span>${s.projectedPercent !== null ? `<span>Mission end ${s.projectedPercent}%</span>` : ''}</div>` : ''}
    <p>${esc(missionRiskText(s))}</p><small>${s.count ? `${s.count} ${s.count === 1 ? 'reading' : 'readings'} · latest ${s.latest} ${kind.unit} on ${dayLabel(s.lastAt)}` : kind.help}</small></article>`;
}
function missionRisksPage() {
  const p = activeCrew(), day = MissionLogic.missionDay(missionPlan()), summaries = missionRiskSummaries(p);
  const records = db().riskRecords.filter(r => r.crewId === p.id).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8);
  return `${pageHeading('Mission health risks', 'Long-term exposure and body changes across the mission.', button('Mission plan', 'mission-plan', '', 'settings') + button('Add reading', 'mission-risk-add', 'primary', 'plus'))}${demoNotice()}
    ${!day ? `<div class="mission-setup">${icon('info')}<p>Enter the mission start date and length to see projections and supply forecasts.</p><button class="button small" data-action="mission-plan">Set mission plan</button></div>` : ''}
    <div class="section-label"><h2>${esc(p.name)}</h2></div>
    <div class="mission-risk-grid">${summaries.map(missionRiskCard).join('')}</div>
    <section class="panel mission-panel"><div class="panel-head"><div><h2>All crew</h2><p>Latest position against the entered limits</p></div></div><div class="table-wrap" tabindex="0" aria-label="Mission risks by crew member"><table class="data-table"><thead><tr><th>CREW</th><th>RADIATION</th><th>BONE LOSS</th><th>STRENGTH LOSS</th></tr></thead><tbody>${crewProfiles().map(c => { const s = missionRiskSummaries(c); return `<tr><td>${esc(c.name)}</td>${s.map(x => `<td>${x.count ? `${x.current}${x.kind === 'radiation' ? ' mSv' : '%'}` : '—'}<span class="small-sub">${missionRiskPills[x.status][1]}</span></td>`).join('')}</tr>`; }).join('')}</tbody></table></div></section>
    <section class="panel mission-panel"><div class="panel-head"><div><h2>Readings</h2><p>${esc(p.name)} · Entered by hand from mission equipment</p></div></div>${records.length ? `<div class="table-wrap" tabindex="0" aria-label="Risk readings"><table class="data-table"><thead><tr><th>DATE</th><th>MEASURE</th><th>VALUE</th><th>SOURCE</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${records.map(r => `<tr><td>${dayLabel(r.at)}</td><td>${MissionLogic.RISK_KINDS[r.kind].label}</td><td>${r.value} ${MissionLogic.RISK_KINDS[r.kind].unit}</td><td>${esc(r.source || '—')}</td><td><button class="table-delete" data-action="mission-risk-delete" data-id="${esc(r.id)}" aria-label="Delete reading from ${dayLabel(r.at)}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="mission-clear-note">No readings yet. Add the first dosimeter reading, scan or strength test.</p>'}</section>
    <div class="notice">${icon('info')}<p>ORBIT cannot measure radiation, bone or muscle; it only tracks results you enter. Projections are straight lines from the readings so far, not medical predictions. The 600 mSv default is <a href="${MISSION_NASA_RADIATION}" target="_blank" rel="noopener noreferrer">NASA’s career radiation limit</a>. Crews have typically lost about 1 to 2% of bone density a month in space (<a href="${MISSION_NASA_BONE}" target="_blank" rel="noopener noreferrer">NASA bone loss brief</a>). Bone and strength limits are entered by your team; none are supplied for real missions. <a href="#research?topic=radiation">See the research</a>.</p></div>`;
}
function missionPlanModal() {
  const plan = missionPlan(), p = activeCrew();
  modal('Mission plan', 'Used for projections and supply forecasts.', `<form id="mission-plan-form"><div class="form-grid">${missionField('Mission start', 'start', `type="date" value="${esc(plan.start)}"`)}${missionField('Mission length', 'days', `type="number" min="1" max="3000" step="1" value="${plan.days || ''}"`, 'days')}${missionField('Radiation limit', 'radiationLimit', `type="number" min="1" step="any" value="${plan.radiationLimit ?? ''}"`, 'mSv, career')}${missionField(`${esc(p.name)} earlier career dose`, 'priorDose', `type="number" min="0" step="any" value="${p.priorDose ?? ''}"`, 'mSv')}${missionField('Bone density loss limit', 'boneLimit', `type="number" min="0.1" max="100" step="any" value="${plan.boneLimit ?? ''}"`, '%, from medical team')}${missionField('Muscle strength loss limit', 'muscleLimit', `type="number" min="0.1" max="100" step="any" value="${plan.muscleLimit ?? ''}"`, '%, from medical team')}</div><p class="form-error" id="mission-form-error" role="alert"></p></form>`, `${button('Cancel', 'close-modal')}<button class="button primary" type="submit" form="mission-plan-form">Save mission plan</button>`);
  $('#mission-plan-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target), start = f.get('start'), days = missionNumber(f.get('days'));
    if (Boolean(start) !== Boolean(days)) return missionFormError('Enter both the start date and the mission length, or leave both blank.');
    db().mission = { start, days: days || 0, radiationLimit: missionNumber(f.get('radiationLimit')), boneLimit: missionNumber(f.get('boneLimit')), muscleLimit: missionNumber(f.get('muscleLimit')) };
    p.priorDose = missionNumber(f.get('priorDose')) ?? undefined;
    missionSave('Mission plan saved.');
  });
}
function missionRiskModal() {
  modal('Add a reading', `${esc(activeCrew().name)} · Enter the result from mission equipment.`, `<form id="mission-risk-form"><div class="form-grid"><label class="field full"><span>Measure</span><select class="field-input" name="kind">${Object.entries(MissionLogic.RISK_KINDS).map(([k, v]) => `<option value="${k}">${v.input} (${v.unit})</option>`).join('')}</select></label>${missionField('Result', 'value', 'type="number" min="0" step="any" required')}${missionField('Date', 'at', `type="date" required max="${todayKey()}" value="${todayKey()}"`)}<label class="field full"><span>Source <small>(optional)</small></span><input class="field-input" name="source" maxlength="80" placeholder="Equipment or procedure"></label></div><p class="form-help" style="margin-top:12px">Your first bone and strength results become the baseline. Use one site and method throughout. For radiation, enter the running total for this mission.</p></form>`, `${button('Cancel', 'close-modal')}<button class="button primary" type="submit" form="mission-risk-form">Save reading</button>`);
  $('#mission-risk-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    db().riskRecords.push({ id: crewUID('risk'), crewId: activeCrewId(), at: new Date(`${f.get('at')}T12:00:00`).toISOString(), kind: f.get('kind'), value: Number(f.get('value')), source: f.get('source').trim() });
    missionSave('Reading saved.');
  });
}





/* Sleep and wellbeing */
function missionSpark(title, values, min, max, note) {
  const points = values.filter(v => Number.isFinite(v.value)), last = points.at(-1);
  if (points.length < 2) return `<article class="panel mission-spark"><h3>${title}</h3><p class="mission-clear-note">Needs at least two check-ins.</p></article>`;
  const w = 280, h = 76, x = i => 6 + i * (w - 12) / (points.length - 1), low = Math.min(min, ...points.map(p => p.value)), high = Math.max(max, ...points.map(p => p.value)), y = v => 6 + (1 - (v - low) / (high - low)) * (h - 12);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  return `<article class="panel mission-spark"><div><h3>${title}</h3><strong>${last.value}<small>${note}</small></strong></div><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}: ${points.length} readings, latest ${last.value} ${note}"><path d="${line}"/>${points.map((p, i) => `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="${i === points.length - 1 ? 4 : 0}"/><circle class="hit" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="10"><title>${dayLabel(p.at)}: ${p.value} ${note}</title></circle>`).join('')}</svg></article>`;
}
function missionWellbeingPage(embedded = false) {
  const records = entries(), w = missionCrewView(activeCrew()).wellbeing, since = Date.now() - 14 * MissionLogic.DAY;
  const recent = records.filter(e => Date.parse(e.at) >= since), series = read => recent.map(e => ({ at: e.at, value: read(e) }));
  const sparks = w.hidden ? missionSpark('Sleep', series(e => e.sleep), 5, 9, 'hrs') : `${missionSpark('Sleep', series(e => e.sleep), 5, 9, 'hrs')}${missionSpark('Sleep quality', series(e => e.wellbeing?.sleepQuality), 1, 5, '/ 5')}${missionSpark('Fatigue', series(e => e.wellbeing?.fatigue), 1, 5, '/ 5')}${missionSpark('Stress', series(e => e.wellbeing?.stress), 1, 5, '/ 5')}${missionSpark('Mood', series(e => e.mood), 1, 5, '/ 5')}${missionSpark('Crew connection', series(e => e.wellbeing?.connection), 1, 5, '/ 5')}`;
  return `${sectionHeading(embedded, 'Sleep & wellbeing', 'A short daily check-in on rest, stress and connection.', button('Daily check-in', 'mission-checkin', 'primary', 'plus'))}
    ${w.hidden ? missionWellbeingHidden(w) : ''}${!w.hidden && w.supportSuggested ? `<section class="mission-priority review">${icon('brain')}<div><span class="eyebrow">SUPPORT CHECK-IN SUGGESTED</span><strong>${esc(w.reasons.join('. '))}.</strong><p>A private talk with your crew medical officer may help. If you feel unable to keep yourself or others safe, tell a crew member now.</p></div><button class="button small" data-action="mood-guide">Wellbeing guidance</button></section>` : ''}
    <div class="stat-strip mission-tiles">${missionTile('SLEEP, 7 DAYS', w.sleepAverage ?? '—', w.sleepAverage === null ? 'no sleep entries' : `hrs average, target ${state.settings.sleepTarget}`)}${missionTile('SLEEP SHORTFALL', w.sleepDebt, 'hrs below target this week')}${missionTile('CHECK-INS', w.checkins, 'in the past 7 days')}${missionTile('LAST CHECK-IN', w.lastCheckIn ? dayLabel(w.lastCheckIn) : '—', w.overdue ? 'A new check-in is due' : 'Up to date')}</div>
    <div class="section-label"><h2>Past 14 days</h2><span>HOVER A POINT FOR ITS VALUE</span></div>
    <div class="mission-spark-grid">${sparks}</div>
    ${missionReflections(records)}
    <div class="notice">${icon('lock')}<p>Check-ins stay in this browser and are not a mental health screen. The crew member, the crew leader and the medical officer can see the scores, and they appear in the flight surgeon report. The rest of the crew, and Crew status, show only a neutral support prompt. Fatigue, stress and connection scores are never sent to the Crew assistant; mood, sleep and notes reach it only if you share records with it. <a href="#research?topic=behavior">See the research</a>.</p></div>`;
}
/* The crew member's own reflections. The list reaches the page only for them (AccessLogic.records). */
function missionReflections(records) {
  if (!missionIsSelf()) return '';
  const list = records.filter(e => e.reflection).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), week = list.filter(e => Date.parse(e.at) >= Date.now() - 7 * MissionLogic.DAY).length;
  const quote = HrpLinks.quoteFor('mood');
  return `<section class="panel mission-panel mission-reflections"><div class="panel-head"><div><h2>Your reflections</h2><p>${list.length ? `${week} in the past 7 days · ` : ''}Shown only when you are the one viewing</p></div>${button('Write one', 'mission-checkin', 'small', 'plus')}</div>${list.length ? `<ol class="mission-reflect-list">${list.slice(0, 7).map(e => `<li><span>${dayLabel(e.at)}</span><b>${esc(e.reflection.prompt)}</b><p>${esc(e.reflection.text)}</p></li>`).join('')}</ol>` : '<p class="mission-clear-note">No reflections yet. The daily check-in offers a short prompt.</p>'}<div class="mission-reflect-why">${hrpQuote(quote)}<p>The prompts draw on what the Canadian Space Agency’s <a href="https://www.asc-csa.gc.ca/eng/sciences/cstars.asp" target="_blank" rel="noopener noreferrer">C-STARS</a> experiment studies: coping, meaningful work, gratitude, compassion and awe. The wording is ORBIT’s. This is a journal, not a mental health screen. It stays in this browser, is never sent to the Crew assistant or included in reports, and is hidden from the crew leader and medical officer. There is no sign-in, so this decides what the screen shows; it is not security.</p></div></section>`;
}
/* What the rest of the crew sees instead of someone's scores. */
function missionWellbeingHidden(w) {
  const p = activeCrew(), who = AccessLogic.whoCanSee(crewProfiles(), p.id), viewer = viewerProfile();
  return `<section class="mission-setup wellbeing-hidden">${icon('lock')}<div><strong>${esc(p.name)}'s mood and wellbeing scores are hidden</strong><p>Only ${esc(who.length > 1 ? `${who.slice(0, -1).join(', ')} and ${who.at(-1)}` : who[0])} can see them. ${viewer ? `You are viewing as ${esc(viewer.name)}.` : 'Nobody has chosen who is using ORBIT.'} Sleep and check-in timing stay visible.${w.supportSuggested ? ' <b>A support check-in is suggested.</b>' : ''}</p></div><button class="button small" data-action="viewer-select">${viewer ? 'Change who is viewing' : 'Choose who is viewing'}</button></section>`;
}
function missionScale(name, label, low, high) {
  return `<div class="field full"><span>${label}</span><div class="mood-picker" role="group" aria-label="${label}">${[1, 2, 3, 4, 5].map(n => `<label class="mood-option"><input type="radio" name="${name}" value="${n}"><span>${n}<small>${n === 1 ? low : n === 5 ? high : ''}</small></span></label>`).join('')}</div></div>`;
}
/* A private reflection, offered only when the person viewing is the crew member: nobody else can read it back. */
const missionIsSelf = () => viewerProfile()?.id === activeCrewId();
function missionReflectionField() {
  if (!missionIsSelf()) return `<p class="field full form-help mission-reflect-note">${icon('lock')}Reflections are private journal entries, shown only to the crew member who wrote them. To write one, choose “${esc(activeCrew().name)}” as who is viewing.</p>`;
  const prompt = MissionLogic.reflectionPrompt();
  return `<div class="field full mission-reflect"><span id="reflect-label">Reflection <small>(optional, shown only when you are the one viewing)</small></span><p class="mission-reflect-prompt"><span id="reflect-prompt">${esc(prompt)}</span> <button type="button" class="text-button" data-reflect-next="1">Different prompt</button></p><input type="hidden" name="reflectionPrompt" value="${esc(prompt)}"><textarea class="field-input" name="reflection" maxlength="1000" aria-labelledby="reflect-label reflect-prompt" placeholder="A sentence or two is enough."></textarea></div>`;
}
function missionCheckinModal() {
  const scales = MissionLogic.WELLBEING_SCALES;
  modal('Daily check-in', `${esc(activeCrew().name)} · About one minute. Answer what you can.`, `<form id="mission-checkin-form"><div class="form-grid"><label class="field full"><span>Hours slept</span><div class="input-with-unit"><input class="field-input" name="sleep" type="number" inputmode="decimal" min="0" max="24" step="0.1" placeholder="—"><em>hrs</em></div></label>${missionScale('sleepQuality', scales.sleepQuality.label, scales.sleepQuality.low, scales.sleepQuality.high)}${missionScale('fatigue', scales.fatigue.label, scales.fatigue.low, scales.fatigue.high)}${missionScale('stress', scales.stress.label, scales.stress.low, scales.stress.high)}${missionScale('mood', 'Mood', 'Very low', 'Very good')}${missionScale('connection', scales.connection.label, scales.connection.low, scales.connection.high)}${missionReflectionField()}<label class="field full"><span>Anything else? <small>(optional)</small></span><textarea class="field-input" name="notes" maxlength="2000" placeholder="Schedule changes, noise, workload, or how you are feeling."></textarea></label></div><p class="form-error" id="mission-form-error" role="alert"></p></form><div class="notice" style="margin-top:18px">${icon('info')}<p>If you feel unable to keep yourself or others safe, tell a crew member and activate your onboard emergency procedure.</p></div>`, `${button('Cancel', 'close-modal')}<button class="button primary" type="submit" form="mission-checkin-form">Save check-in</button>`);
  $('#mission-checkin-form').addEventListener('click', e => {
    const next = e.target.closest('[data-reflect-next]'); if (!next) return;
    const n = Number(next.dataset.reflectNext), prompt = MissionLogic.reflectionPrompt(new Date(), n);
    next.dataset.reflectNext = String(n + 1); $('#reflect-prompt').textContent = prompt; e.currentTarget.elements.reflectionPrompt.value = prompt;
  });
  $('#mission-checkin-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target), wellbeing = {}, record = { id: crewUID('entry'), crewId: activeCrewId(), at: new Date().toISOString(), source: 'Daily check-in', notes: f.get('notes').trim() };
    for (const key of Object.keys(scales)) if (f.get(key)) wellbeing[key] = Number(f.get(key));
    if (f.get('sleep')) record.sleep = Number(f.get('sleep'));
    if (f.get('mood')) record.mood = Number(f.get('mood'));
    const reflection = String(f.get('reflection') || '').trim();
    if (reflection && missionIsSelf()) record.reflection = { prompt: String(f.get('reflectionPrompt') || ''), text: reflection.slice(0, 1000) };
    if (!Object.keys(wellbeing).length && record.sleep === undefined && record.mood === undefined && !record.reflection) return missionFormError('Answer at least one question.');
    record.wellbeing = wellbeing;
    db().entries.push(record);
    if (record.mood) { const done = new Set(checks()); done.add('mood'); db().checks[crewCheckKey()] = [...done]; }
    missionSave('Check-in saved.');
  });
}

/* Exercise */
function missionExerciseChart(summary) {
  const w = 560, h = 190, pad = { l: 34, r: 8, t: 14, b: 26 }, target = summary.target || 0;
  const top = Math.max(60, target * 1.2, ...summary.daily.map(d => d.minutes)), y = v => pad.t + (1 - v / top) * (h - pad.t - pad.b), base = y(0);
  const step = (w - pad.l - pad.r) / summary.daily.length, bar = Math.min(36, step - 12);
  const bars = summary.daily.map((d, i) => {
    const x = pad.l + i * step + (step - bar) / 2, label = new Date(`${d.key}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }), yy = y(d.minutes), r = Math.min(4, base - yy);
    const mark = d.minutes ? `<path class="bar" d="M${x},${base}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + bar - r}Q${x + bar},${yy} ${x + bar},${yy + r}V${base}Z"/>` : '';
    return `${mark}<text x="${x + bar / 2}" y="${h - 8}" text-anchor="middle">${label}</text><rect class="hit" x="${pad.l + i * step}" y="${pad.t}" width="${step}" height="${h - pad.t - pad.b}"><title>${label}: ${d.minutes} minutes, ${d.sessions} ${d.sessions === 1 ? 'session' : 'sessions'}</title></rect>`;
  }).join('');
  const line = target ? `<line class="target" x1="${pad.l}" x2="${w - pad.r}" y1="${y(target)}" y2="${y(target)}"/><text x="${pad.l - 6}" y="${y(target) + 3}" text-anchor="end">${target}</text>` : '';
  return `<svg class="mission-bars" viewBox="0 0 ${w} ${h}" role="img" aria-label="Exercise minutes per day: ${summary.daily.map(d => d.minutes).join(', ')}"><line class="axis" x1="${pad.l}" x2="${w - pad.r}" y1="${base}" y2="${base}"/><text x="${pad.l - 6}" y="${base + 3}" text-anchor="end">0</text>${bars}${line}</svg>`;
}
function missionExercisePage(embedded = false) {
  const target = carePlan().exerciseTarget, list = db().workouts.filter(w => w.crewId === activeCrewId()), s = MissionLogic.exerciseSummary(list, { target });
  const recent = [...list].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 10), types = Object.entries(s.byType);
  return `${sectionHeading(embedded, 'Exercise', 'Sessions that help protect bone and muscle in low gravity.', button('Set target', 'care-plan', '', 'settings') + button('Log workout', 'mission-workout', 'primary', 'plus'))}
    <div class="stat-strip mission-tiles">${missionTile('TODAY', s.today, s.target ? `of ${s.target} minutes` : 'minutes, no target set')}${missionTile('DAYS ON TARGET', s.target ? `${s.metDays}/7` : '—', s.target ? 'in the past 7 days' : 'set a target to track this')}${missionTile('THIS WEEK', s.total, `minutes in ${s.sessions} ${s.sessions === 1 ? 'session' : 'sessions'}`)}${missionTile('BY TYPE', types.length ? types.map(([t, m]) => `${m}`).join(' / ') : '—', types.length ? types.map(([t]) => t).join(' / ') + ' minutes' : 'no sessions this week')}</div>
    <section class="panel mission-panel"><div class="panel-head"><div><h2>Past 7 days</h2><p>${esc(activeCrew().name)} · Minutes per day${s.target ? ', dashed line is the daily target' : ''}</p></div></div>${missionExerciseChart(s)}</section>
    <section class="panel mission-panel"><div class="panel-head"><div><h2>Sessions</h2><p>Most recent first</p></div></div>${recent.length ? `<div class="table-wrap" tabindex="0" aria-label="Exercise sessions"><table class="data-table"><thead><tr><th>WHEN</th><th>TYPE</th><th>MINUTES</th><th>EFFORT</th><th>CHECK</th><th>NOTES</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${recent.map(w => `<tr><td>${missionStamp(w.at)}</td><td>${esc(w.type)}</td><td>${w.minutes}</td><td>${w.effort ? `${w.effort} / 10` : '—'}</td><td class="mission-check-cell">${MissionLogic.formatExerciseCheck(w.check).split(' · ').filter(Boolean).map(esc).join('<br>') || '—'}</td><td class="log-note">${esc(w.notes) || '—'}</td><td><button class="table-delete" data-action="mission-workout-delete" data-id="${esc(w.id)}" aria-label="Delete ${esc(w.type)} session">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="mission-clear-note">No sessions yet. Log the first workout to start tracking.</p>'}</section>
    <div class="notice">${icon('info')}<p>Follow the individual exercise prescription. Sessions are self-reported and do not show that a bone or muscle plan is working; use the scans and tests on Mission health risks for that. <a href="#research?topic=gravity">See the research</a>.</p></div>`;
}
/* Keeps the existing daily exercise reading, used by Health assessment, equal to the sum of the day's sessions. */
function missionSyncExercise(crewId, day) {
  const minutes = db().workouts.filter(w => w.crewId === crewId && MissionLogic.dayKey(w.at) === day).reduce((n, w) => n + w.minutes, 0), id = `exercise-${crewId}-${day}`;
  const entry = db().entries.find(e => e.id === id);
  if (!minutes) { if (entry) db().entries = db().entries.filter(e => e !== entry); return; }
  if (entry) entry.exercise = minutes;
  else db().entries.push({ id, crewId, at: new Date(Math.min(Date.parse(`${day}T23:59:00`), Date.now())).toISOString(), exercise: minutes, source: 'Exercise log', notes: '' });
}
/* Optional readings around a session, like the CSA's CARDIOBREATH experiment. They stay with the workout and never
   become resting readings, because a heart rate taken after exercise is not a resting heart rate. */
function missionCheckFields() {
  const cell = (when, key, label, unit) => `<label class="field"><span>${label}</span><div class="input-with-unit"><input class="field-input" name="${when}_${key}" type="number" inputmode="numeric" min="${MissionLogic.CHECK_FIELDS[key].min}" max="${MissionLogic.CHECK_FIELDS[key].max}" step="1" placeholder="—"><em>${unit}</em></div></label>`;
  const side = when => `<fieldset class="mission-check-side"><legend>${when === 'before' ? 'Before, at rest' : 'After, as you stop'}</legend>${cell(when, 'hr', 'Heart rate', 'bpm')}<div class="field"><span>Blood pressure</span><div class="bp-pair"><input class="field-input" name="${when}_sys" type="number" inputmode="numeric" min="50" max="260" placeholder="Systolic" aria-label="${when === 'before' ? 'Before' : 'After'}: systolic blood pressure"><b>/</b><input class="field-input" name="${when}_dia" type="number" inputmode="numeric" min="30" max="160" placeholder="Diastolic" aria-label="${when === 'before' ? 'Before' : 'After'}: diastolic blood pressure"></div></div>${cell(when, 'rr', 'Breathing rate', '/min')}</fieldset>`;
  return `<details class="field full mission-check"><summary>Add an exercise check <small>(optional)</small></summary><p class="form-help">Heart rate, blood pressure and breathing rate before and after the session, as the Canadian Space Agency’s <a href="https://www.asc-csa.gc.ca/eng/sciences/cardiobreath.asp" target="_blank" rel="noopener noreferrer">CARDIOBREATH</a> experiment measures around a set exercise session. Use your approved equipment. These readings stay with this workout and are not added to your resting readings.</p><div class="mission-check-grid">${side('before')}${side('after')}</div></details>`;
}
function missionWorkoutModal() {
  modal('Log a workout', `${esc(activeCrew().name)} · Record what you completed.`, `<form id="mission-workout-form"><div class="form-grid"><label class="field"><span>Type</span><select class="field-input" name="type">${MISSION_WORKOUTS.map(t => `<option>${t}</option>`).join('')}</select></label>${missionField('Minutes', 'minutes', 'type="number" min="1" max="600" step="1" required')}${missionField('When', 'at', `type="datetime-local" required value="${localInput()}" max="${localInput()}"`)}${missionField('Effort', 'effort', 'type="number" min="1" max="10" step="1"', '1 to 10, optional')}<label class="field full"><span>Notes <small>(optional)</small></span><textarea class="field-input" name="notes" maxlength="500" placeholder="Load, equipment, pain, or anything that changed."></textarea></label>${missionCheckFields()}</div><p class="form-error" id="mission-form-error" role="alert"></p></form>`, `${button('Cancel', 'close-modal')}<button class="button primary" type="submit" form="mission-workout-form">Save workout</button>`);
  $('#mission-workout-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target), at = new Date(f.get('at')).toISOString(), crewId = activeCrewId(), day = MissionLogic.dayKey(at);
    if (Date.parse(at) > Date.now() + 60000) return missionFormError('Choose the current time or an earlier time.');
    const { check, error } = MissionLogic.exerciseCheck(Object.fromEntries(f));
    if (error) return missionFormError(error);
    db().workouts.push({ id: crewUID('workout'), crewId, at, type: f.get('type'), minutes: Number(f.get('minutes')), effort: missionNumber(f.get('effort')), notes: f.get('notes').trim(), ...(check ? { check } : {}) });
    missionSyncExercise(crewId, day);
    const target = carePlan().exerciseTarget, total = db().workouts.filter(w => w.crewId === crewId && MissionLogic.dayKey(w.at) === day).reduce((n, w) => n + w.minutes, 0);
    if (day === todayKey() && (!Number.isFinite(target) || total >= target)) { const done = new Set(checks()); done.add('exercise'); db().checks[crewCheckKey()] = [...done]; }
    missionSave('Workout saved.');
  });
}

/* Emergency checklists */
function missionOpenRuns() { return db().emergencyRuns.filter(r => !r.closedAt); }
function missionChecklistPanel(suggested) {
  const ids = Object.keys(MissionLogic.CHECKLISTS), order = suggested ? [suggested, ...ids.filter(id => id !== suggested)] : ids, open = missionOpenRuns();
  return `<section class="mission-checklists"><h3>Guided checklists</h3>${open.map(run => `<button class="mission-resume" data-action="mission-run-open" data-id="${esc(run.id)}">${icon('alert')}Resume ${esc(MissionLogic.CHECKLISTS[run.checklist]?.short)} for ${esc(crewProfiles().find(c => c.id === run.crewId)?.name || 'crew member')}</button>`).join('')}<label class="field"><span>Crew member needing care</span><select class="field-input" id="mission-patient">${crewProfiles().map(p => `<option value="${esc(p.id)}" ${p.id === activeCrewId() ? 'selected' : ''}>${esc(p.name)} · ${esc(p.role)}</option>`).join('')}</select></label><div class="mission-checklist-grid">${order.map(id => `<button class="${id === suggested ? 'suggested' : ''}" data-action="mission-run-start" data-id="${id}">${esc(MissionLogic.CHECKLISTS[id].short)}${id === suggested ? '<small>Matches this report</small>' : ''}</button>`).join('')}</div></section>`;
}
function missionOfferChecklist(report) { emergencyResponseModal(MissionLogic.checklistForReport(report)); }
function missionRunStart(id) {
  const crewId = $('#mission-patient')?.value || activeCrewId();
  if (!crewProfiles().some(p => p.id === crewId)) return;
  if (crewId !== activeCrewId()) selectCrew(crewId);
  let run = db().emergencyRuns.find(r => r.crewId === crewId && r.checklist === id && !r.closedAt);
  if (!run) { run = { id: crewUID('run'), crewId, checklist: id, startedAt: new Date().toISOString(), closedAt: null, steps: {} }; db().emergencyRuns.push(run); persist(); render(); }
  missionRunModal(run.id);
}
function missionRunModal(id) {
  const run = db().emergencyRuns.find(r => r.id === id), list = MissionLogic.CHECKLISTS[run?.checklist]; if (!list) return;
  const name = crewProfiles().find(c => c.id === run.crewId)?.name || 'Crew member';
  modal(esc(list.title), `${esc(name)} · Started ${new Date(run.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, `<div class="care-emergency-lead">${icon('alert')}<p><strong>Your approved onboard procedure comes first.</strong> Tap each step when it is done. The time is saved to ${esc(name)}’s record.</p></div><ol class="mission-steps">${list.steps.map((step, i) => `<li><button class="${run.steps[i] ? 'done' : ''}" data-action="mission-step" data-id="${esc(run.id)}" data-step="${i}" role="checkbox" aria-checked="${Boolean(run.steps[i])}"><span class="mission-step-box">${icon('check')}</span><span class="mission-step-text">${esc(step)}</span><small>${run.steps[i] ? new Date(run.steps[i]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</small></button></li>`).join('')}</ol><p class="form-help">Educational prompts, not a flight medical protocol. ORBIT cannot call for help or assess the patient.</p>`, `${button('Back to response guide', 'emergency')}${button('Prepare report', 'mission-report', '', 'document')}<button class="button primary" data-action="mission-run-finish" data-id="${esc(run.id)}">Finish checklist</button>`);
}
function missionStepToggle(target) {
  const run = db().emergencyRuns.find(r => r.id === target.dataset.id), step = target.dataset.step; if (!run) return;
  if (run.steps[step]) delete run.steps[step]; else run.steps[step] = new Date().toISOString();
  persist();
  target.classList.toggle('done', Boolean(run.steps[step])); target.setAttribute('aria-checked', String(Boolean(run.steps[step])));
  $('small', target).textContent = run.steps[step] ? new Date(run.steps[step]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
}

/* Earth link simulator */
const missionLinkKey = () => missionLinkDelay || MissionLogic.linkDelayFor(state.settings.environment);







/* Evidence library */
let missionResearchQuery = '';
/* Full APA 7 references for sources that have one. Escaped, then only the <i> italics are restored. */
function missionApaReferences(item) {
  const refs = item.sources.map(id => ResearchLibrary.SOURCES[id].apa).filter(Boolean);
  if (!refs.length) return '';
  const italic = ref => esc(ref).replace(/&lt;i&gt;/g, '<i>').replace(/&lt;\/i&gt;/g, '</i>');
  return `<details class="mission-evidence-apa"><summary>APA reference${refs.length > 1 ? 's' : ''}</summary>${refs.map(ref => `<p>${italic(ref)}</p>`).join('')}</details>`;
}
function missionResearchCard(item, showTopic) {
  const R = ResearchLibrary;
  return `<article class="panel mission-evidence"><div class="mission-evidence-top"><h3>${esc(item.title)}</h3><span class="mission-pill due">${esc(R.EVIDENCE[item.evidence])}</span></div>${showTopic ? `<p class="mission-evidence-topic">${esc(item.topicTitle)}</p>` : ''}<p>${esc(item.text)}</p><p class="mission-evidence-watch"><strong>Tracking guidance:</strong> ${esc(item.watch)}</p>${missionApaReferences(item)}<button class="text-button mission-ask-about" type="button" data-onboard-about="${esc(item.title)}" aria-label="Ask the onboard library about ${esc(item.title)}">Ask about this ${icon('arrowright')}</button><div class="mission-evidence-foot"><div>${item.sources.map(id => `<a href="${esc(R.SOURCES[id].url)}" target="_blank" rel="noopener noreferrer" title="${esc(R.SOURCES[id].title)}">${esc(R.SOURCES[id].cite)} ${icon('external')}<span class="sr-only"> (opens in a new tab)</span></a>`).join('')}</div>${item.track ? `<a class="text-button" href="#${item.track[0]}">${esc(item.track[1])} ${icon('arrowright')}</a>` : '<small>Not tracked in ORBIT yet</small>'}</div></article>`;
}
/* Search stays inside the chosen topic, so say when other topics also match instead of showing a silent zero. */
function missionResearchElsewhere(topic) {
  const query = missionResearchQuery.trim();
  return !query || topic === 'all' ? 0 : ResearchLibrary.search(query, 'all').length - ResearchLibrary.search(query, topic).length;
}
function missionResearchMore(topic) {
  const n = missionResearchElsewhere(topic);
  return n ? `<a class="text-button" href="#research?topic=all">Show ${n} more ${n === 1 ? 'match' : 'matches'} in other topics ${icon('arrowright')}</a>` : '';
}
function missionResearchResults(topic) {
  const list = ResearchLibrary.search(missionResearchQuery.trim(), topic), elsewhere = missionResearchElsewhere(topic);
  const hint = topic === 'all' ? 'Try a different condition, author or paper title.' : elsewhere ? `Nothing in ${esc(ResearchLibrary.TOPICS[topic].title)} matches, but other topics do. Use the link above to see them.` : 'Try a different condition, author or paper title, or choose All topics to broaden your search.';
  return list.length ? list.map(item => missionResearchCard(item, topic === 'all')).join('') : `<div class="mission-clear-note"><h3>No matching entries</h3><p>${hint}</p></div>`;
}
function missionResearchStatus(topic) {
  const query = missionResearchQuery.trim(), count = ResearchLibrary.search(query, topic).length;
  const area = topic === 'all' ? 'All topics' : ResearchLibrary.TOPICS[topic].title;
  return `${count} ${count === 1 ? 'entry' : 'entries'}${query ? ` matching “${query}”` : ''} · ${area}`;
}
function missionResearchRefresh() {
  const topic = missionResearchTopic(), list = $('#research-results');
  if (!list) return;
  list.innerHTML = missionResearchResults(topic); hydrateIcons(list);
  $('#research-status').textContent = missionResearchStatus(topic);
  const more = $('#research-more'); more.innerHTML = missionResearchMore(topic); hydrateIcons(more);
  $('#research-clear').hidden = !missionResearchQuery;
  $('#research-ask').hidden = !missionResearchQuery.trim();
}
/* Voice assistant citations link here as #research?doc=<topic>&chunk=<entry id>
   (scripts/export-research.mjs). Show that entry once per link, then leave the search to the person. */
let missionResearchLinked = '';
function missionResearchApplyLink() {
  const params = new URLSearchParams(location.hash.split('?')[1] || ''), chunk = params.get('chunk');
  if (!chunk || location.hash === missionResearchLinked) return;
  missionResearchLinked = location.hash;
  const slug = title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const item = ResearchLibrary.allItems().find(i => i.topic === params.get('doc') && slug(i.title) === chunk);
  if (item) missionResearchQuery = item.title;
}
function missionResearchTopic() {
  const params = new URLSearchParams(location.hash.split('?')[1] || ''), topic = params.get('topic') || params.get('doc');
  return topic === 'all' || Object.hasOwn(ResearchLibrary.TOPICS, topic) ? topic : 'behavior';
}
function missionResearchPage() {
  missionResearchApplyLink();
  const R = ResearchLibrary, topic = missionResearchTopic(), count = Object.keys(R.SOURCES).length;
  return `${pageHeading('Evidence library', `The research behind ORBIT, from ${count} published sources.`)}
    <section class="panel care-offline-panel"><h2>Offline evidence and anatomy</h2><p>The evidence entries below are bundled with ORBIT and searchable without an internet connection. Prepare this device before going offline.</p><p id="care-offline-status" role="status">${esc(careOfflineMessage)}</p><button class="button small" data-action="care-offline" ${careOfflineBusy ? 'disabled' : ''}>${careOfflineBusy ? 'Preparing…' : careOfflineReady ? 'Refresh offline package' : 'Prepare offline package'} ${icon('download')}</button></section>
    ${onboardAskPanel()}
    <h2 class="mission-research-heading" id="research-heading">Evidence entries</h2>
    <div class="mission-research-context"><p>Study labels show the type of evidence. Full papers need internet access.</p><details><summary>About the evidence & limits</summary><p>Researched by the ORBIT team and checked against each published paper. Each label shows the kind of evidence behind an entry. Many studies are small, on the ground or in animals, so findings may not apply to an individual astronaut. This library does not diagnose conditions or set clinical limits. Tracking guidance connects the research to what you can record in ORBIT.</p></details></div>
    <div class="mission-research-tools"><div class="mission-research-search"><label for="research-search">Search ${topic === 'all' ? 'all topics' : esc(R.TOPICS[topic].title)}</label><div><input id="research-search" class="field-input" type="search" aria-describedby="research-status" placeholder="Condition, author or paper title" value="${esc(missionResearchQuery)}"><button id="research-clear" class="button" type="button" ${missionResearchQuery ? '' : 'hidden'}>Clear search</button></div><button id="research-ask" class="text-button mission-ask-search" type="button" ${missionResearchQuery.trim() ? '' : 'hidden'}>Ask the onboard library instead ${icon('arrowright')}</button></div><nav class="mission-research-tabs" aria-label="Filter evidence by topic">${Object.entries({ all: { title: 'All topics' }, ...R.TOPICS }).map(([id, t]) => `<a href="#research?topic=${id}" class="${id === topic ? 'active' : ''}" ${id === topic ? 'aria-current="true"' : ''}>${esc(t.title)}</a>`).join('')}</nav></div>
    <p class="mission-research-status" id="research-status" role="status" aria-live="polite" aria-atomic="true">${esc(missionResearchStatus(topic))}</p>
    <p class="mission-research-more" id="research-more">${missionResearchMore(topic)}</p>
    <section class="mission-research-list" id="research-results" aria-labelledby="research-heading">${missionResearchResults(topic)}</section>`;
}

/* Flight surgeon report */
function missionReportData() {
  const p = activeCrew(), view = missionCrewView(p), now = Date.now(), week = now - 7 * MissionLogic.DAY, form = careReadForm();
  const saved = careAssessments().at(-1), check = form.response || form.breathing || form.flags.length ? form : saved;
  const runs = db().emergencyRuns.filter(r => r.crewId === p.id && (!r.closedAt || Date.parse(r.startedAt) >= week)).map(r => { const list = MissionLogic.CHECKLISTS[r.checklist]; return { title: list?.title || 'Emergency', startedAt: r.startedAt, closedAt: r.closedAt, steps: (list?.steps || []).map((text, i) => ({ text, at: r.steps[i] || null })) }; });
  const notes = view.records.filter(e => e.notes && Date.parse(e.at) >= week && !/^Routine morning check|^Synthetic routine check/.test(e.notes)).slice(-6).map(e => ({ at: e.at, text: e.notes }));
  return {
    crew: { name: p.name, role: p.role }, mission: { ...state.settings }, workspace: state.mode, generatedAt: now, day: MissionLogic.missionDay(missionPlan()),
    priorities: view.status.reasons.map(r => r.text), alerts: view.alerts, readings: careLatestReadings(), notes, runs,
    assessment: check ? { ...check, title: CareLogic.assessSafety(check).title, flagLabels: (check.flags || []).map(f => CARE_FLAGS[f]).filter(Boolean) } : null,
    conditions: p.conditions, medications: [], instructions: carePlan().careInstructions || '', wellbeing: view.wellbeing, exercise: view.exercise,
    risks: view.risks.map(r => ({ label: { radiation: 'Radiation', bone: 'Bone density', muscle: 'Muscle strength' }[r.kind], count: r.count, text: missionRiskText(r) })),
    skin: SkinLogic.reportLines(db().skinChecks.filter(c => c.crewId === p.id), db().wounds.filter(w => w.crewId === p.id)),

  };
}
function missionReportModal() {
  const d = missionReportData();
  modal('Flight surgeon report', `${esc(d.crew.name)} · ${esc(d.crew.role)}`, `<article class="flight-report"><header><strong>ORBIT flight surgeon report</strong><span>${d.workspace === 'demo' ? 'SYNTHETIC TRAINING DATA' : 'Browser-local crew record'}</span><span>${esc(d.crew.name)}, ${esc(d.crew.role)} · ${esc(d.mission.mission)}, ${esc(d.mission.environment)}${d.day ? ` · Day ${d.day.day} of ${d.day.total}` : ''}</span><span>Prepared ${new Date(d.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span></header>${MissionLogic.reportSections(d).map(s => `<section><h3>${esc(s.title)}</h3><ul>${s.lines.map(line => `<li>${esc(line)}</li>`).join('')}</ul></section>`).join('')}<footer>Not sent. Use the approved mission medical communication channel. ORBIT is a research prototype; recorded values are self-reported and do not establish a diagnosis or fitness for duty.</footer></article>`, `${button('Close', 'close-modal')}${button('Download PDF', 'mission-report-download', '', 'download')}${button('Print', 'mission-report-print', 'primary', 'document')}`);
}
function missionReportDownload() {
  const d = missionReportData();
  download(`orbit-${state.mode}-flight-surgeon-report-${todayKey()}.pdf`, PdfLogic.fromText(MissionLogic.reportText(d)), 'application/pdf');
  toast('Report PDF downloaded. Nothing has been sent.');
}

function handleMissionControl(t) {
  const id = t.dataset.id, a = t.dataset.action;
  if (!a || !a.startsWith('mission-')) return false;
  const actions = {
    'mission-report': missionReportModal, 'mission-report-print': () => window.print(), 'mission-report-download': missionReportDownload,
    'mission-crew-open': () => { selectCrew(id); location.hash = 'crew'; }, 'mission-crew-report': () => { selectCrew(id); missionReportModal(); },
    'mission-plan': missionPlanModal, 'mission-risk-add': missionRiskModal,
    'mission-risk-delete': () => missionConfirm('Delete this reading?', 'This removes the reading from this browser and changes the results built on it.', 'mission-risk-confirm', id, 'Delete reading'),
    'mission-risk-confirm': () => { db().riskRecords = db().riskRecords.filter(r => r.id !== id); missionSave('Reading deleted.'); },
    'mission-checkin': missionCheckinModal, 'mission-workout': missionWorkoutModal,
    'mission-workout-delete': () => missionConfirm('Delete this workout?', 'This removes the session and updates the day’s exercise total.', 'mission-workout-confirm', id, 'Delete workout'),
    'mission-workout-confirm': () => { const w = db().workouts.find(x => x.id === id); db().workouts = db().workouts.filter(x => x.id !== id); if (w) missionSyncExercise(w.crewId, MissionLogic.dayKey(w.at)); missionSave('Workout deleted.'); },
    'mission-run-start': () => missionRunStart(id), 'mission-run-open': () => missionRunModal(id), 'mission-step': () => missionStepToggle(t),
    'mission-run-finish': () => { const run = db().emergencyRuns.find(r => r.id === id); if (run) run.closedAt = new Date().toISOString(); missionSave('Checklist finished and saved to the crew record.'); }
  };
  actions[a]?.();
  return Boolean(actions[a]);
}
document.addEventListener('input', e => { if (e.target.id !== 'research-search') return; missionResearchQuery = e.target.value; missionResearchRefresh(); });
document.addEventListener('click', e => {
  if (!e.target.closest('#research-clear')) return;
  missionResearchQuery = ''; $('#research-search').value = ''; missionResearchRefresh(); $('#research-search').focus();
});
