/* Rules for daily skin checks and wound tracking. These are product rules for review, not clinical thresholds. Loaded before skin.js. */
'use strict';

const SkinLogic = (() => {
  const DAY = 86400000, WEEK = 7, PERSISTENT_DAYS = 3, OVERDUE_DAYS = 2, UPDATE_DAYS = 3, HEALING_DAYS = 7, GROWTH = 1.1;
  const FINDINGS = { rash: 'Rash', redness: 'Redness', itching: 'Itching', dryness: 'Dryness', cracking: 'Cracking', peeling: 'Peeling or callus shedding', nail: 'Fingernail pain or separation', other: 'Other change' };
  const REGIONS = { head: 'Face and scalp', torso: 'Neck and torso', arms: 'Arms', hands: 'Hands and nails', back: 'Back', legs: 'Legs', feet: 'Feet' };
  const SEVERITY = { 1: 'Mild', 2: 'Moderate', 3: 'Severe' };
  const WOUND_TYPES = ['Cut', 'Abrasion', 'Burn', 'Blister', 'Other'];
  const WOUND_SIGNS = { spreading: 'Spreading redness', swelling: 'More swelling', warmth: 'Warmth', discharge: 'Pus or discharge', smell: 'Bad smell', pain: 'More pain', fever: 'Fever', reopened: 'Reopened', bleeding: 'Heavy bleeding' };
  const time = d => Date.parse(d);
  const dayKey = d => new Date(d).toLocaleDateString('en-CA');
  const byTime = (a, b) => time(a.at) - time(b.at);
  const area = u => Number.isFinite(u?.length) && Number.isFinite(u?.width) ? u.length * u.width : null;
  const round = n => Number(n.toFixed(0));

  function skinSummary(checks, { now = Date.now() } = {}) {
    const days = Array.from({ length: WEEK }, (_, i) => {
      const date = new Date(now); date.setDate(date.getDate() - (WEEK - 1 - i));
      const key = dayKey(date), rows = checks.filter(c => dayKey(c.at) === key), findings = [...new Set(rows.flatMap(c => c.findings || []))];
      return { key, checked: rows.length > 0, findings, status: !rows.length ? 'none' : findings.length ? 'change' : 'clear' };
    });
    const persistent = Object.keys(FINDINGS).map(key => ({ key, label: FINDINGS[key], days: days.filter(d => d.findings.includes(key)).length })).filter(f => f.days >= PERSISTENT_DAYS).sort((a, b) => b.days - a.days);
    const sorted = [...checks].sort(byTime), latest = sorted.at(-1) || null;
    return {
      days, persistent, latest, checkedToday: days.at(-1).checked, today: days.at(-1).status,
      overdue: !latest || now - time(latest.at) > OVERDUE_DAYS * DAY,
      checkedDays: days.filter(d => d.checked).length, changeDays: days.filter(d => d.status === 'change').length,
      severe: Boolean(latest?.findings?.length && latest.severity === 3 && now - time(latest.at) <= DAY)
    };
  }

  function woundSummary(wound, { now = Date.now() } = {}) {
    const updates = [...(wound.updates || [])].sort(byTime), measured = updates.filter(u => area(u) !== null);
    const first = measured[0] || null, last = measured.at(-1) || null, previous = measured.at(-2) || null, latest = updates.at(-1) || null;
    const firstArea = area(first), lastArea = area(last);
    const change = first && first !== last && firstArea > 0 ? round((firstArea - lastArea) / firstArea * 100) : null;
    const signs = latest?.signs || [], flags = [], open = !wound.closedAt;
    if (open) {
      if (signs.includes('bleeding')) flags.push({ level: 'urgent', text: 'Heavy bleeding recorded' });
      const warning = signs.filter(s => s !== 'bleeding');
      if (warning.length) flags.push({ level: 'review', text: `Warning signs recorded: ${warning.map(s => (WOUND_SIGNS[s] || s).toLowerCase()).join(', ')}` });
      if (previous && lastArea > area(previous) * GROWTH) flags.push({ level: 'review', text: 'Larger than at the last measurement' });
      if (first && first !== last && time(last.at) - time(first.at) >= HEALING_DAYS * DAY && lastArea >= firstArea) flags.push({ level: 'review', text: `Not smaller after ${HEALING_DAYS} days` });
      if (latest && now - time(latest.at) > UPDATE_DAYS * DAY) flags.push({ level: 'due', text: `No update in ${UPDATE_DAYS} days` });
    }
    return { open, updates, first, last, latest, signs, change, flags, daysOpen: Math.max(0, Math.floor(((wound.closedAt ? time(wound.closedAt) : now) - time(wound.openedAt)) / DAY)) };
  }
  const woundName = w => `${w.type} on ${w.location}`;
  const size = u => u && area(u) !== null ? `${u.length} × ${u.width} mm` : 'not measured';

  /* Reasons for the crew-wide status. */
  function crewReasons(checks, wounds, { now = Date.now() } = {}) {
    const skin = skinSummary(checks, { now }), reasons = [];
    if (skin.severe) reasons.push({ level: 'review', text: 'Severe skin change reported in the last 24 hours' });
    skin.persistent.forEach(f => reasons.push({ level: 'review', text: `${f.label} reported on ${f.days} of the last ${WEEK} days` }));
    wounds.filter(w => !w.closedAt).forEach(w => woundSummary(w, { now }).flags.forEach(f => reasons.push({ level: f.level, text: `${woundName(w)}: ${f.text}` })));
    return reasons;
  }
  function reportLines(checks, wounds, { now = Date.now() } = {}) {
    const skin = skinSummary(checks, { now }), lines = [`Skin checked on ${skin.checkedDays} of the last ${WEEK} days, with changes on ${skin.changeDays}.`];
    skin.persistent.forEach(f => lines.push(`Persistent: ${f.label} on ${f.days} of ${WEEK} days.`));
    const latest = skin.latest;
    if (latest?.findings?.length) lines.push(`Latest change: ${latest.findings.map(f => FINDINGS[f] || f).join(', ')} (${SEVERITY[latest.severity] || 'severity not recorded'}) on ${(latest.regions || []).map(r => REGIONS[r] || r).join(', ') || 'unspecified area'}.`);
    const open = wounds.filter(w => !w.closedAt);
    if (!open.length) lines.push('No active wounds.');
    open.forEach(w => {
      const s = woundSummary(w, { now }), trend = s.change === null ? '' : s.change >= 0 ? ` ${s.change}% smaller than at the start.` : ` ${-s.change}% larger than at the start.`;
      lines.push(`${woundName(w)}: open ${s.daysOpen} days, now ${size(s.last)}.${trend}${s.signs.length ? ` Latest signs: ${s.signs.map(x => WOUND_SIGNS[x] || x).join(', ')}.` : ''}`);
    });
    return lines;
  }
  return { FINDINGS, REGIONS, SEVERITY, WOUND_TYPES, WOUND_SIGNS, skinSummary, woundSummary, woundName, size, crewReasons, reportLines };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SkinLogic;
