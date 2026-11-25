/* Rules behind crew status, trends, health risks, wellbeing, exercise and the flight surgeon report. Loaded before mission.js. */
'use strict';

const MissionLogic = (() => {
  const DAY = 86400000, MONTH_DAYS = 30.44;
  const round = (n, d = 1) => Number(n.toFixed(d));
  const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
  const spread = v => { const m = mean(v); return Math.sqrt(mean(v.map(x => (x - m) ** 2))); };
  const dayKey = d => new Date(d).toLocaleDateString('en-CA');
  const time = d => Date.parse(d);
  const byTime = (a, b) => time(a.at) - time(b.at);
  const missionEnd = mission => mission?.start && mission?.days > 0 ? Date.parse(`${mission.start}T00:00:00`) + mission.days * DAY : null;
  function missionDay(mission, now = Date.now()) {
    const end = missionEnd(mission);
    if (!end) return null;
    const start = Date.parse(`${mission.start}T00:00:00`);
    return { day: Math.max(1, Math.floor((now - start) / DAY) + 1), total: mission.days, left: Math.max(0, Math.ceil((end - now) / DAY)), started: now >= start };
  }

  /* Product rules for a sustained change, not clinical thresholds. minChange stops a very steady baseline flagging tiny movements. */
  const TRENDS = {
    hr: { label: 'Resting heart rate', unit: 'bpm', digits: 0, direction: 'up', minChange: 5 },
    sys: { label: 'Systolic blood pressure', unit: 'mmHg', digits: 0, direction: 'up', minChange: 8 },
    temp: { label: 'Body temperature', unit: '°C', digits: 1, direction: 'up', minChange: 0.4 },
    rr: { label: 'Respiratory rate', unit: 'breaths/min', digits: 0, direction: 'up', minChange: 3 },
    spo2: { label: 'Oxygen saturation', unit: '%', digits: 0, direction: 'down', minChange: 2 },
    sleep: { label: 'Sleep duration', unit: 'hrs', digits: 1, direction: 'down', minChange: 0.5 },
    mood: { label: 'Mood', unit: '/ 5', digits: 1, direction: 'down', minChange: 0.7, private: true }
  };
  const RECENT_DAYS = 7, BASELINE_DAYS = 21, MIN_RECENT = 3, MIN_BASELINE = 5;
  function trendAlerts(records, { now = Date.now() } = {}) {
    const alerts = [];
    for (const [key, rule] of Object.entries(TRENDS)) {
      const values = records.filter(r => Number.isFinite(r[key]) && Number.isFinite(time(r.at)) && time(r.at) <= now);
      const age = r => (now - time(r.at)) / DAY;
      const recent = values.filter(r => age(r) <= RECENT_DAYS).map(r => r[key]);
      const baseline = values.filter(r => age(r) > RECENT_DAYS && age(r) <= RECENT_DAYS + BASELINE_DAYS).map(r => r[key]);
      if (recent.length < MIN_RECENT || baseline.length < MIN_BASELINE) continue;
      const before = mean(baseline), after = mean(recent), change = rule.direction === 'up' ? after - before : before - after;
      const threshold = Math.max(rule.minChange, 2 * spread(baseline));
      if (change < threshold) continue;
      const verb = rule.direction === 'up' ? 'risen' : 'fallen';
      alerts.push({
        key, label: rule.label, unit: rule.unit, direction: rule.direction, private: Boolean(rule.private),
        severity: change >= 1.5 * threshold ? 'review' : 'watch',
        before: round(before, rule.digits), after: round(after, rule.digits), change: round(change, rule.digits),
        message: `${rule.label} has ${verb} over the past ${RECENT_DAYS} days: average ${round(after, rule.digits)} ${rule.unit}, compared with ${round(before, rule.digits)} ${rule.unit} in the previous ${BASELINE_DAYS} days.`
      });
    }
    return alerts.sort((a, b) => (a.severity === 'review' ? 0 : 1) - (b.severity === 'review' ? 0 : 1));
  }

  const STATUS = {
    urgent: { rank: 0, label: 'Urgent' }, review: { rank: 1, label: 'Needs review' },
    due: { rank: 2, label: 'Check overdue' }, clear: { rank: 3, label: 'No flags' },
    historical: { rank: 4, label: 'Historical record' }
  };
  const OVERDUE_HOURS = 36, URGENT_HOURS = 24, VITALS = ['hr', 'sys', 'temp', 'spo2', 'rr'];
  /* Private wellbeing detail stays out of this crew-wide view: only a neutral support prompt is listed. */
  function crewStatus({ records = [], alerts = [], assessments = [], openRuns = [], riskFlags = [], extraReasons = [], supportSuggested = false, historical = null, now = Date.now() }) {
    /* A past mission's reference record: decades-old readings are neither overdue nor a current concern. */
    if (historical) {
      const lastVitals = records.filter(r => VITALS.some(k => Number.isFinite(r[k]))).sort(byTime).at(-1)?.at || null;
      return { level: 'historical', label: STATUS.historical.label, rank: STATUS.historical.rank, reasons: [{ level: 'historical', text: `Reference readings from ${historical}. Not a current crew member.` }], lastVitals, overdue: false };
    }
    const reasons = [];
    openRuns.forEach(run => reasons.push({ level: 'urgent', text: `Emergency checklist in progress: ${run.title}` }));
    const recentUrgent = assessments.filter(a => a.level === 'emergency' && now - time(a.at) <= URGENT_HOURS * 3600000).sort(byTime).at(-1);
    if (recentUrgent) reasons.push({ level: 'urgent', text: 'Urgent signs recorded in the last 24 hours' });
    alerts.forEach(a => reasons.push({ level: 'review', text: a.private ? 'Support check-in suggested' : a.message }));
    riskFlags.forEach(text => reasons.push({ level: 'review', text }));
    reasons.push(...extraReasons);
    if (supportSuggested && !reasons.some(r => r.text === 'Support check-in suggested')) reasons.push({ level: 'review', text: 'Support check-in suggested' });
    const lastVitals = records.filter(r => VITALS.some(k => Number.isFinite(r[k]))).sort(byTime).at(-1)?.at || null;
    const overdue = !lastVitals || now - time(lastVitals) > OVERDUE_HOURS * 3600000;
    if (overdue) reasons.push({ level: 'due', text: lastVitals ? 'No vital signs in the last 36 hours' : 'No vital signs recorded yet' });
    const level = reasons.reduce((worst, r) => STATUS[r.level].rank < STATUS[worst].rank ? r.level : worst, 'clear');
    return { level, label: STATUS[level].label, rank: STATUS[level].rank, reasons, lastVitals, overdue };
  }

  const RISK_KINDS = {
    radiation: { label: 'Radiation dose', unit: 'mSv', digits: 1, input: 'Mission dose so far', help: 'The total for this mission shown on the crew member’s dosimeter.' },
    bone: { label: 'Bone density', unit: 'g/cm²', digits: 3, input: 'Hip bone density scan', help: 'Use the same scan site and equipment each time.' },
    muscle: { label: 'Muscle strength', unit: 'kg', digits: 0, input: 'Leg strength test', help: 'Use the same exercise and protocol each time.' }
  };
  const APPROACHING = 0.8;
  function riskSummary(kind, records, { limit = null, prior = 0, mission = null, now = Date.now() } = {}) {
    const series = records.filter(r => r.kind === kind && Number.isFinite(r.value) && Number.isFinite(time(r.at))).sort(byTime);
    if (!series.length) return { kind, status: 'none', count: 0 };
    const first = series[0], last = series.at(-1), span = (time(last.at) - time(first.at)) / DAY, end = missionEnd(mission);
    const daysLeft = end ? Math.max(0, (end - time(last.at)) / DAY) : null;
    const canProject = series.length >= 2 && span > 0 && daysLeft !== null;
    let current, projected = null, rate = null;
    if (kind === 'radiation') {
      current = prior + last.value;
      if (span > 0) rate = (last.value - first.value) / span;
      if (canProject) projected = current + rate * daysLeft;
    } else {
      if (!(first.value > 0)) return { kind, status: 'none', count: series.length };
      current = (first.value - last.value) / first.value * 100;
      if (span > 0) rate = current / span * MONTH_DAYS;
      if (canProject) projected = current + current / span * daysLeft;
    }
    const hasLimit = Number.isFinite(limit) && limit > 0;
    const worst = Math.max(current, projected ?? current);
    const status = !hasLimit ? 'unset' : current >= limit ? 'over' : worst >= limit ? 'projected' : worst >= limit * APPROACHING ? 'approaching' : 'ok';
    return { kind, status, count: series.length, lastAt: last.at, latest: last.value, baseline: first.value, current: round(current, 1), projected: projected === null ? null : round(projected, 1), rate: rate === null ? null : round(rate, 2), limit: hasLimit ? limit : null, percent: hasLimit ? round(current / limit * 100, 0) : null, projectedPercent: hasLimit && projected !== null ? round(projected / limit * 100, 0) : null };
  }
  function riskFlags(summaries) {
    const name = { radiation: 'Radiation dose', bone: 'Bone density loss', muscle: 'Muscle strength loss' };
    return summaries.flatMap(s => s.status === 'over' ? [`${name[s.kind]} is past the entered limit`] : s.status === 'projected' ? [`${name[s.kind]} is projected to pass the entered limit`] : []);
  }




  function exerciseSummary(workouts, { target = null, now = Date.now(), days = 7 } = {}) {
    const hasTarget = Number.isFinite(target) && target > 0;
    const daily = Array.from({ length: days }, (_, i) => {
      const date = new Date(now); date.setDate(date.getDate() - (days - 1 - i));
      const key = dayKey(date), sessions = workouts.filter(w => dayKey(w.at) === key);
      return { key, minutes: sessions.reduce((n, w) => n + w.minutes, 0), sessions: sessions.length };
    });
    const keys = new Set(daily.map(d => d.key)), inWindow = workouts.filter(w => keys.has(dayKey(w.at)));
    const byType = {};
    inWindow.forEach(w => { byType[w.type] = (byType[w.type] || 0) + w.minutes; });
    const metDays = hasTarget ? daily.filter(d => d.minutes >= target).length : null;
    return { daily, byType, today: daily.at(-1).minutes, total: daily.reduce((n, d) => n + d.minutes, 0), activeDays: daily.filter(d => d.minutes > 0).length, metDays, target: hasTarget ? target : null, sessions: inWindow.length };
  }

  const WELLBEING_SCALES = {
    sleepQuality: { label: 'Sleep quality', low: 'Very poor', high: 'Very good' },
    fatigue: { label: 'Fatigue', low: 'None', high: 'Exhausted' },
    stress: { label: 'Stress', low: 'None', high: 'Very high' },
    connection: { label: 'Crew connection', low: 'Isolated', high: 'Very connected' }
  };
  const CHECKIN_OVERDUE_HOURS = 48;
  /* A prompt for a private conversation with the crew medical officer. It is not a validated mental health screen. */
  function wellbeingSummary(records, { now = Date.now(), sleepTarget = 8 } = {}) {
    const week = records.filter(r => now - time(r.at) <= 7 * DAY && time(r.at) <= now);
    const sleeps = week.filter(r => Number.isFinite(r.sleep)).map(r => r.sleep);
    const checkins = records.filter(r => r.wellbeing).sort(byTime), recent = checkins.slice(-3);
    const average = key => { const v = recent.map(r => r.wellbeing[key]).filter(Number.isFinite); return v.length ? mean(v) : null; };
    const mood = records.filter(r => Number.isFinite(r.mood)).sort(byTime).at(-1)?.mood ?? null;
    const reasons = [];
    if (mood !== null && mood <= 2) reasons.push('Latest mood entry is low');
    if ((average('fatigue') ?? 0) >= 4) reasons.push('Fatigue has been high across recent check-ins');
    if ((average('stress') ?? 0) >= 4) reasons.push('Stress has been high across recent check-ins');
    if (recent.length >= 2 && (average('connection') ?? 5) <= 2) reasons.push('Crew connection has been low across recent check-ins');
    const lastCheckIn = checkins.at(-1)?.at || null;
    return {
      sleepAverage: sleeps.length ? round(mean(sleeps), 1) : null, sleepNights: sleeps.length,
      sleepDebt: round(sleeps.reduce((n, s) => n + Math.max(0, sleepTarget - s), 0), 1),
      checkins: checkins.filter(r => now - time(r.at) <= 7 * DAY).length, lastCheckIn, mood,
      overdue: !lastCheckIn || now - time(lastCheckIn) > CHECKIN_OVERDUE_HOURS * 3600000,
      supportSuggested: reasons.length > 0, reasons
    };
  }

  /* Generic first aid prompts for rehearsal. Mission procedures and the crew medical officer always take priority. */
  const ALERT = 'Alert the crew medical officer and activate the onboard emergency procedure.';
  const CHECKLISTS = {
    arrest: { title: 'Unresponsive, not breathing normally', short: 'Cardiac arrest', steps: [ALERT, 'Send a crew member for the AED and medical kit.', 'Secure the patient and rescuer using the approved restraint method.', 'Start chest compressions: centre of the chest, at least 5 cm deep, 100 to 120 per minute.', 'Attach the AED as soon as it arrives and follow its prompts.', 'Keep going until the patient responds or a trained crew member takes over. Swap rescuers to avoid fatigue.', 'Contact ground medical support on the emergency channel. Do not pause care to wait for a reply.', 'Record what happened and when, once a crew member is free to do so.'] },
    chest: { title: 'Chest pain or discomfort', short: 'Chest pain', steps: [ALERT, 'Stop all activity and secure the patient at rest.', 'Bring the medical kit and AED to the patient.', 'Note when it started and what the patient was doing.', 'Give only the medication listed in the medical plan, as directed by the crew medical officer.', 'Record heart rate, blood pressure and oxygen saturation if this does not delay care.', 'Watch breathing and responsiveness. If they become unresponsive, switch to the cardiac arrest checklist.', 'Contact ground medical support on the emergency channel.'] },
    breathing: { title: 'Severe difficulty breathing', short: 'Breathing', steps: [ALERT, 'Check the cabin alarms. If the air may be unsafe, follow the vehicle procedure first.', 'Help the patient into the position that makes breathing easiest and secure them.', 'Give oxygen only as set out in the medical plan.', 'Record oxygen saturation and breathing rate if this does not delay care.', 'Stay with the patient. If they become unresponsive, switch to the cardiac arrest checklist.', 'Contact ground medical support on the emergency channel.'] },
    stroke: { title: 'Sudden face, arm, speech or vision change', short: 'Stroke signs', steps: [ALERT, 'Record the time the patient was last known to be well.', 'Check the face for drooping, both arms for weakness, and speech for slurring.', 'Check for sudden vision loss or balance problems.', 'Give nothing by mouth unless the crew medical officer directs it.', 'Secure the patient and stay with them. Watch breathing and responsiveness.', 'Contact ground medical support on the emergency channel and report the time last known well.'] },
    bleeding: { title: 'Severe or uncontrolled bleeding', short: 'Bleeding', steps: [ALERT, 'Put on gloves and bring the medical kit.', 'Press firmly and directly on the wound with a sterile dressing.', 'If blood soaks through, add more dressing on top. Do not remove the first dressing.', 'If a limb is still bleeding heavily, use the tourniquet procedure if you are trained to. Record the time applied.', 'Contain loose blood as the mission procedure directs.', 'Watch for pale, cold or clammy skin, confusion or fast breathing.', 'Contact ground medical support on the emergency channel.'] },
    fracture: { title: 'Suspected broken bone', short: 'Broken bone', steps: [ALERT, 'Treat any severe bleeding first, using the bleeding checklist if needed.', 'Keep the injured area still. Do not try to straighten it or push a bone back in.', 'If the skin is broken, cover the wound with a sterile dressing.', 'Check beyond the injury for colour, warmth, feeling and pulse. Record what you find.', 'Splint the area in the position found, including the joints above and below.', 'Recheck colour, warmth, feeling and pulse after splinting.', 'Give pain relief only as listed in the medical plan.', 'Contact ground medical support on the emergency channel.'] },
    safety: { title: 'Immediate threat to personal or crew safety', short: 'Safety threat', steps: [ALERT, 'Make the area safe and secure anything that could cause harm, as the mission procedure directs.', 'If a crew member may harm themselves, stay with them. Do not leave them alone.', 'Listen calmly and speak privately where it is safe to.', 'Contact ground medical support on the private medical channel.', 'Agree who stays with the crew member and when that person will be relieved.'] }
  };
  function checklistFor(check = {}) {
    const flags = Array.isArray(check.flags) ? check.flags : [];
    if (check.response === 'no') return 'arrest';
    for (const flag of ['bleeding', 'breathing', 'chest', 'stroke', 'safety']) if (flags.includes(flag)) return flag;
    return check.breathing === 'abnormal' ? 'breathing' : null;
  }
  function checklistForReport(report) {
    const s = String(report || '').toLowerCase();
    const rules = [[/\b(?:unconscious|unresponsive|collapsed)\b/, 'arrest'], [/\bbleed/, 'bleeding'], [/\b(?:fractur\w*|broken|broke)\b/, 'fracture'], [/\bstroke\b/, 'stroke'], [/\b(?:breath\w*)\b/, 'breathing'], [/\b(?:chest|heart attack|myocardial)\b/, 'chest']];
    return rules.find(([pattern]) => pattern.test(s))?.[1] || null;
  }
  function runProgress(run) {
    const list = CHECKLISTS[run.checklist], done = Object.keys(run.steps || {}).filter(i => list?.steps[i]).length;
    return { done, total: list?.steps.length || 0 };
  }








  function reportSections(d) {
    const stamp = at => at ? new Date(at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'time not recorded';
    const none = (lines, text) => lines.length ? lines : [text];
    const w = d.wellbeing, x = d.exercise;
    return [
      { title: 'Priority concerns', lines: none(d.priorities, 'No flags raised by ORBIT. This does not establish that the crew member is well.') },
      { title: 'Current assessment', lines: d.assessment ? [`Recorded ${stamp(d.assessment.at)}: ${d.assessment.title}`, `Responsive: ${d.assessment.response || 'not assessed'}. Breathing: ${d.assessment.breathing || 'not assessed'}.`, `Reported concerns: ${d.assessment.flagLabels?.join('; ') || 'none selected'}`, ...(d.assessment.onset ? [`Symptom onset: ${stamp(d.assessment.onset)}`] : []), ...(d.assessment.notes ? [`Observations: ${d.assessment.notes}`] : [])] : ['No guided assessment recorded.'] },
      { title: 'Emergency checklists', lines: none(d.runs.flatMap(run => [`${run.title}: started ${stamp(run.startedAt)}, ${run.closedAt ? `finished ${stamp(run.closedAt)}` : 'still in progress'}`, ...run.steps.map(step => `  ${step.at ? stamp(step.at) : 'Not marked done'}: ${step.text}`)]), 'No emergency checklist in the past 7 days.') },
      { title: 'Latest vital signs and indicators', lines: none(d.readings.map(r => `${r.label}: ${r.value} ${r.unit} (${stamp(r.at)})${r.context ? `, ${r.context}` : ''}`), 'No measurements recorded.') },
      { title: 'Trend alerts', lines: none(d.alerts.map(a => `${a.severity === 'review' ? 'Review' : 'Watch'}: ${a.message}`), 'No sustained changes detected.') },
      { title: 'Recent symptoms and notes', lines: none(d.notes.map(n => `${stamp(n.at)}: ${n.text}`), 'No notes in the past 7 days.') },
      { title: 'Condition notes', lines: none(d.conditions.map(c => `${c.title} [${c.status}]: ${c.notes || 'no further notes'}`), 'No condition notes recorded. This does not establish absence of disease.') },
      { title: 'Medication and care instructions', lines: [...none(d.medications.map(m => `${m.name}: ${m.amount} ${m.unit} used in the past 7 days (last ${stamp(m.last)})`), 'No medication use logged in the past 7 days.'), ...(d.instructions ? [`Entered instructions: ${d.instructions}`] : [])] },
      { title: 'Sleep and wellbeing', lines: [`Sleep: ${w.sleepAverage ?? 'not recorded'}${w.sleepAverage === null ? '' : ' hrs average'} over ${w.sleepNights} nights. ${w.sleepDebt} hrs below target this week.`, ...(w.hidden ? [`Check-ins this week: ${w.checkins}.`, ...(w.supportSuggested ? ['Support check-in suggested.'] : []), 'Mood and wellbeing scores left out. Only the crew member, the crew leader or the medical officer can include them.'] : [`Check-ins this week: ${w.checkins}. Latest mood: ${w.mood === null ? 'not recorded' : w.mood + ' / 5'}.`, ...w.reasons.map(r => `Support prompt: ${r}.`)])] },
      { title: 'Exercise, past 7 days', lines: [`${x.total} minutes across ${x.sessions} sessions on ${x.activeDays} of 7 days.`, x.target ? `Daily target of ${x.target} minutes met on ${x.metDays} of 7 days.` : 'No daily exercise target entered.', ...Object.entries(x.byType).map(([type, minutes]) => `${type}: ${minutes} minutes`)] },
      { title: 'Mission health risks', lines: d.risks.map(r => r.count ? `${r.label}: ${r.text}` : `${r.label}: no measurements recorded.`) },
      { title: 'Skin and wounds', lines: none(d.skin || [], 'No skin or wound records.') },
    ];
  }
  function reportText(d) {
    const header = ['ORBIT | FLIGHT SURGEON REPORT', d.workspace === 'demo' ? 'SYNTHETIC TRAINING DATA' : 'Browser-local crew record', `Crew: ${d.crew.name} / ${d.crew.role}`, `Mission: ${d.mission.mission} / ${d.mission.environment}${d.day ? ` / Day ${d.day.day} of ${d.day.total}` : ''}`, `Prepared: ${new Date(d.generatedAt).toISOString()}`];
    const body = reportSections(d).flatMap(s => ['', s.title.toUpperCase(), ...s.lines]);
    return [...header, ...body, '', 'NOT SENT. Use the approved mission medical communication channel.', 'ORBIT is a research prototype. Recorded values are self-reported and do not establish a diagnosis or fitness for duty.'].join('\n');
  }

  /* Reflection prompts for the daily check-in. NASA encourages astronauts to keep a regular journal (Risk of Behavioral
     Conditions and Psychiatric Disorders), and the CSA's C-STARS experiment studies coping, meaningful work, gratitude,
     compassion and awe in spaceflight. The wording is ORBIT's. Everyone gets the same prompt on a given day. */
  const REFLECTION_PROMPTS = [
    'What helped you cope with stress today?',
    'What part of today’s work felt meaningful?',
    'Who on the crew are you grateful for today, and why?',
    'What did you see or feel today that filled you with awe?',
    'How did you support a crewmate today, or how did they support you?',
    'What is one thing you want to remember about today?',
    'What would make tomorrow a little easier?'
  ];
  function reflectionPrompt(date = new Date(), offset = 0) {
    const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY), n = REFLECTION_PROMPTS.length;
    return REFLECTION_PROMPTS[(((day + offset) % n) + n) % n];
  }

  /* Exercise check: heart rate, blood pressure and breathing rate before and after a session, as the CSA's
     CARDIOBREATH experiment tracks around a set exercise session. Limits only catch typing errors; they are not clinical ranges. */
  const CHECK_FIELDS = { hr: { label: 'heart rate', min: 20, max: 250 }, sys: { label: 'systolic pressure', min: 50, max: 260 }, dia: { label: 'diastolic pressure', min: 30, max: 160 }, rr: { label: 'breathing rate', min: 4, max: 60 } };
  function exerciseCheck(values) {
    const check = {};
    for (const when of ['before', 'after']) {
      const part = {};
      for (const [key, field] of Object.entries(CHECK_FIELDS)) {
        const raw = values[`${when}_${key}`];
        if (raw === undefined || raw === null || String(raw).trim() === '') continue;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < field.min || n > field.max) return { error: `Check the ${when} ${field.label}: enter ${field.min} to ${field.max}.` };
        part[key] = n;
      }
      if ((part.sys === undefined) !== (part.dia === undefined)) return { error: `Enter both ${when} blood pressure numbers, or leave both blank.` };
      if (part.sys !== undefined && part.sys <= part.dia) return { error: `The ${when} systolic pressure must be higher than the diastolic.` };
      if (Object.keys(part).length) check[when] = part;
    }
    return { check: Object.keys(check).length ? check : null };
  }
  function formatExerciseCheck(check) {
    if (!check) return '';
    const pair = (read, label) => { const b = read(check.before), a = read(check.after); return b || a ? `${label} ${b || '—'} → ${a || '—'}` : ''; };
    return [pair(p => p?.hr, 'HR'), pair(p => p?.sys ? `${p.sys}/${p.dia}` : '', 'BP'), pair(p => p?.rr, 'Breaths')].filter(Boolean).join(' · ');
  }

  /* Daily tasks a crew member has completed on every day so far. checks is keyed by date for crew-01 and by
     "crewId:date" for everyone else (crewCheckKey in crew.js). Each completed task unlocks one NASA fact. */
  function tasksCompleted(checks, crewId) {
    let n = 0;
    for (const [key, done] of Object.entries(checks || {})) {
      const own = crewId === 'crew-01' ? /^\d{4}-\d{2}-\d{2}$/.test(key) : key.startsWith(`${crewId}:`);
      if (own && Array.isArray(done)) n += new Set(done).size;
    }
    return n;
  }

  return { tasksCompleted, REFLECTION_PROMPTS, reflectionPrompt, CHECK_FIELDS, exerciseCheck, formatExerciseCheck, DAY, TRENDS, STATUS, RISK_KINDS, WELLBEING_SCALES, CHECKLISTS, dayKey, missionEnd, missionDay, trendAlerts, crewStatus, riskSummary, riskFlags, exerciseSummary, wellbeingSummary, checklistFor, checklistForReport, runProgress, reportSections, reportText };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MissionLogic;
