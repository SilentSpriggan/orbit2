'use strict';

const CareLogic = (() => {
  const urgentFlags = ['chest', 'breathing', 'stroke', 'bleeding', 'safety'];
  function assessSafety(check = {}) {
    const flags = Array.isArray(check.flags) ? check.flags : [];
    const arrest = check.response === 'no' && check.breathing === 'abnormal';
    if (arrest) return { level: 'emergency', title: 'Activate the onboard emergency response', arrest: true };
    if (check.response === 'no' || check.breathing === 'abnormal' || flags.some(f => urgentFlags.includes(f))) {
      return { level: 'emergency', title: 'Urgent symptoms need an immediate crew response', arrest: false };
    }
    if (!['yes', 'no', 'unsure'].includes(check.response) || !['normal', 'abnormal', 'unsure'].includes(check.breathing)) {
      return { level: 'incomplete', title: 'Check responsiveness and breathing first', arrest: false };
    }
    if (check.response === 'unsure' || check.breathing === 'unsure') {
      return { level: 'uncertain', title: 'Get a crew member to help assess immediately', arrest: false };
    }
    return { level: 'review', title: 'Continue with symptoms and recorded indicators', arrest: false };
  }
  function reviewBand(value, band) {
    if (!Number.isFinite(value)) return 'missing';
    if (!band || (!Number.isFinite(band.min) && !Number.isFinite(band.max))) return 'unset';
    if (Number.isFinite(band.min) && Number.isFinite(band.max) && band.min >= band.max) return 'unset';
    return (Number.isFinite(band.min) && value < band.min) || (Number.isFinite(band.max) && value > band.max) ? 'outside' : 'within';
  }
  function dailyTasks(routines, schedule = {}, completed = [], now = new Date()) {
    const minutes = now.getHours() * 60 + now.getMinutes();
    return routines.map(task => {
      const time = /^\d{2}:\d{2}$/.test(schedule[task.id] || '') ? schedule[task.id] : task.time;
      const [h, m] = time.split(':').map(Number);
      const done = completed.includes(task.id);
      return { ...task, time, done, due: !done && minutes >= h * 60 + m };
    }).sort((a, b) => a.time.localeCompare(b.time));
  }
  function handoffText({ crew, mission, workspace, check, readings = [], conditions = [], protocol = '' }) {
    const safety = assessSafety(check);
    const lines = [
      'ORBIT | CREW MEDICAL HANDOFF',
      `Prepared: ${new Date(check.at).toISOString()}`,
      `Workspace: ${workspace === 'demo' ? 'SYNTHETIC TRAINING DATA' : 'Browser-local crew record'}`,
      `Crew: ${crew.name} / ${crew.role}`,
      `Mission: ${mission.mission} / ${mission.environment}`,
      '', 'SITUATION', safety.title,
      `Responsiveness: ${check.response || 'Not assessed'}`,
      `Breathing: ${check.breathing || 'Not assessed'}`,
      `Reported concerns: ${(check.flagLabels || []).join('; ') || 'No listed urgent symptoms selected'}`,
      `Symptom onset: ${check.onset || 'Not recorded'}`,
      `Observation: ${check.notes || 'Not recorded'}`,
      '', 'BACKGROUND',
      ...conditions.map(c => `${c.title} [${c.status}] / ${c.source || 'Source not recorded'}: ${c.notes || 'No further notes'}`),
      ...(conditions.length ? [] : ['No condition notes recorded. This does not establish absence of disease.']),
      '', 'LAST RECORDED INDICATORS',
      ...readings.map(r => `${r.label}: ${r.value} ${r.unit} / recorded ${r.at || 'time unknown'}${r.context ? ` / context: ${r.context}` : ''}`),
      ...(readings.length ? [] : ['No measured indicators recorded.']),
      '', 'NEXT CREW ACTION',
      safety.level === 'emergency' || safety.level === 'uncertain'
        ? 'Activate the mission emergency procedure and alert the crew medical officer. Do not delay trained immediate care for ground communications or additional measurements.'
        : 'Review symptoms, measurement technique, and the individual medical plan with the crew medical officer. No diagnosis or medical clearance is provided.',
      `Onboard procedure / channel: ${protocol || 'Use the mission medical plan; no channel entered in ORBIT.'}`,
      '', 'This report has not been sent. Use the approved mission medical communication channel.',
      'ORBIT is a research prototype. Recorded values and symptom selections do not rule out an emergency.'
    ];
    return lines.join('\n');
  }
  function nextReminder(tasks, receipts, receiptKey) {
    return tasks.find(task => task.due && !receipts?.[receiptKey(task)]);
  }
  return { assessSafety, reviewBand, dailyTasks, handoffText, nextReminder };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CareLogic;
