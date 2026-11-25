'use strict';

/* Daily skin checks and wound tracking. Photos use the existing image store. */
let skinEpoch = 0;
const skinPill = (level, text) => missionPill(level, text);
const skinChecks = () => db().skinChecks.filter(c => c.crewId === activeCrewId());
const skinWounds = () => db().wounds.filter(w => w.crewId === activeCrewId());
const skinChips = (name, options, selected = []) => `<div class="mission-chips">${Object.entries(options).map(([id, label]) => `<label class="mission-chip"><input type="checkbox" name="${name}" value="${id}" ${selected.includes(id) ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}</div>`;
function skinFormError(message) { const el = $('#mission-form-error'); if (el) el.textContent = message; }

function skinSeed(w) {
  const ago = (days, hour = 8) => { const d = missionDateOffset(-days); d.setHours(hour, 0, 0, 0); return (d > new Date() ? new Date(Date.now() - 60000) : d).toISOString(); };
  const check = (crewId, days, findings = [], regions = [], severity = null, extra = {}) => w.skinChecks.push({ id: crewUID('skin'), crewId, at: ago(days), findings, regions, severity, afterEva: false, notes: '', sample: true, ...extra });
  const update = (days, length, width, signs = [], notes = '') => ({ id: crewUID('update'), at: ago(days), length, width, signs, notes });
  for (const p of w.crew) {
    for (let days = 6; days >= 0; days--) {
      if (p.id === 'crew-02' && [0, 1, 3, 4].includes(days)) check(p.id, days, ['rash', 'itching'], ['arms'], 2);
      else if (p.id === 'crew-01' && days === 2) check(p.id, days, ['dryness'], ['hands'], 1, { afterEva: true, notes: 'Glove rub after a spacewalk.' });
      else check(p.id, days);
    }
  }
  w.wounds.push({ id: crewUID('wound'), crewId: 'crew-01', type: 'Abrasion', location: 'right knuckle', openedAt: ago(9), closedAt: null, sample: true, updates: [update(9, 14, 9, [], 'Glove rub during a spacewalk.'), update(6, 12, 8), update(3, 10, 7), update(1, 8, 5)] });
  w.wounds.push({ id: crewUID('wound'), crewId: 'crew-03', type: 'Cut', location: 'left forearm', openedAt: ago(6), closedAt: null, sample: true, updates: [update(6, 20, 4, [], 'Sharp edge in the stowage bay.'), update(3, 20, 4), update(1, 22, 5, ['swelling', 'warmth'])] });
}
function skinShiftSamples(w, gap) {
  const shift = at => new Date(Math.min(Date.parse(at) + gap * MissionLogic.DAY, Date.now())).toISOString();
  w.skinChecks.filter(c => c.sample).forEach(c => { c.at = shift(c.at); });
  w.wounds.filter(x => x.sample).forEach(x => { x.openedAt = shift(x.openedAt); x.updates.forEach(u => { u.at = shift(u.at); }); });
}
function initSkinData() {
  for (const mode of ['demo', 'personal']) {
    const w = state.data[mode];
    for (const key of ['skinChecks', 'wounds']) if (!Array.isArray(w[key])) w[key] = [];
    if (!w.skinDataVersion) { if (mode === 'demo') skinSeed(w); w.skinDataVersion = 1; }
  }
}

function skinDailyPanel(s) {
  const panel = !s.checkedToday
    ? `<h2>Any new skin changes today?</h2><p>Rashes, redness, itching, dryness, peeling or nail problems.</p><div class="mission-skin-answers"><button class="button" data-action="skin-clear">${icon('check')}No changes</button><button class="button primary" data-action="skin-check">Yes, add details</button></div>`
    : `<h2>${s.today === 'clear' ? 'Checked today: no changes' : 'Checked today: changes recorded'}</h2><p>Your check for today is saved.</p><div class="mission-skin-answers"><button class="button small" data-action="skin-check">Add a change</button></div>`;
  return `<section class="panel mission-skin-daily"><div>${panel}</div><div class="mission-skin-week" role="img" aria-label="Last 7 days: ${s.days.map(d => d.status === 'none' ? 'not checked' : d.status === 'clear' ? 'no changes' : 'changes').join(', ')}">${s.days.map(d => `<span class="${d.status}"><i>${d.status === 'clear' ? '✓' : d.status === 'change' ? '!' : '–'}</i><small>${new Date(`${d.key}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</small></span>`).join('')}</div></section>`;
}
function skinWoundCard(w) {
  const s = SkinLogic.woundSummary(w), worst = s.flags.find(f => f.level === 'urgent') ? 'urgent' : s.flags.find(f => f.level === 'review') ? 'review' : s.flags.length ? 'due' : 'clear';
  const trend = s.change === null ? 'First measurement' : s.change >= 0 ? `${s.change}% smaller than at the start` : `${-s.change}% larger than at the start`;
  const rows = [...s.updates].reverse().slice(0, 5);
  return `<article class="panel mission-wound ${worst}"><div class="mission-wound-top"><div><h3>${esc(SkinLogic.woundName(w))}</h3><p>Open ${s.daysOpen} ${s.daysOpen === 1 ? 'day' : 'days'} · ${esc(trend)}</p></div>${skinPill(worst, { urgent: 'Urgent', review: 'Needs review', due: 'Update due', clear: 'No flags' }[worst])}</div>
    <div class="mission-wound-size"><strong>${esc(SkinLogic.size(s.last))}</strong><small>Started at ${esc(SkinLogic.size(s.first))}</small></div>
    ${s.flags.length ? `<ul class="mission-reasons">${s.flags.map(f => `<li>${esc(f.text)}</li>`).join('')}</ul>` : ''}
    ${s.signs.includes('bleeding') ? `<button class="button care-response-button" data-action="mission-run-start" data-id="bleeding">Start bleeding checklist</button>` : s.flags.some(f => f.level === 'review') ? '<p class="mission-clear-note">Tell your crew medical officer about these changes.</p>' : ''}
    <div class="mission-photo-row" data-skin-photos="wound:${esc(w.id)}"></div>
    <div class="table-wrap" tabindex="0" aria-label="Wound updates"><table class="data-table"><thead><tr><th>DATE</th><th>SIZE</th><th>SIGNS</th><th>NOTES</th></tr></thead><tbody>${rows.map(u => `<tr><td>${dayLabel(u.at)}</td><td>${esc(SkinLogic.size(u))}</td><td>${(u.signs || []).map(x => esc(SkinLogic.WOUND_SIGNS[x] || x)).join(', ') || '—'}</td><td class="log-note">${esc(u.notes) || '—'}</td></tr>`).join('')}</tbody></table></div>
    <div class="mission-wound-actions"><button class="button small primary" data-action="skin-wound-update" data-id="${esc(w.id)}">Add update</button><button class="button small" data-action="skin-wound-photo" data-id="${esc(w.id)}">Add photo</button><button class="text-button" data-action="skin-wound-close" data-id="${esc(w.id)}">Mark healed</button></div></article>`;
}
function skinPage(embedded = false) {
  const checks = skinChecks(), wounds = skinWounds(), s = SkinLogic.skinSummary(checks), active = wounds.filter(w => !w.closedAt), healed = wounds.filter(w => w.closedAt);
  const recent = [...checks].filter(c => c.findings.length).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 6);
  skinEpoch++;
  return `${sectionHeading(embedded, 'Skin & wounds', 'A quick daily skin check, with wounds tracked until they heal.', button('After spacewalk check', 'skin-eva') + button('Add wound', 'skin-wound-add', 'primary', 'plus'))}
    ${s.persistent.length ? `<section class="mission-priority review">${icon('alert')}<div><span class="eyebrow">PERSISTENT SYMPTOMS</span><strong>${esc(s.persistent.map(f => `${f.label} on ${f.days} of the last 7 days`).join('. '))}.</strong><p>Ask your crew medical officer to take a look.</p></div></section>` : ''}
    ${skinDailyPanel(s)}
    <div class="section-label"><h2>Active wounds</h2><span>${active.length} ACTIVE</span></div>${active.length ? `<div class="mission-wound-grid">${active.map(skinWoundCard).join('')}</div>` : '<p class="mission-clear-note">No active wounds. Add one to track its size and warning signs until it heals.</p>'}
    ${recent.length ? `<section class="panel mission-panel"><div class="panel-head"><div><h2>Recent skin changes</h2><p>${esc(activeCrew().name)} · Most recent first</p></div></div><div class="table-wrap" tabindex="0" aria-label="Recent skin changes"><table class="data-table"><thead><tr><th>DATE</th><th>CHANGE</th><th>AREA</th><th>SEVERITY</th><th>NOTES</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${recent.map(c => `<tr><td>${dayLabel(c.at)}${c.afterEva ? '<span class="small-sub">After spacewalk</span>' : ''}</td><td>${c.findings.map(f => esc(SkinLogic.FINDINGS[f] || f)).join(', ')}</td><td>${c.regions.map(r => esc(SkinLogic.REGIONS[r] || r)).join(', ') || '—'}</td><td>${esc(SkinLogic.SEVERITY[c.severity] || '—')}</td><td class="log-note">${esc(c.notes) || '—'}<div class="mission-photo-row" data-skin-photos="skin:${esc(c.id)}"></div></td><td class="mission-row-actions"><button class="text-button" data-action="skin-check-photo" data-id="${esc(c.id)}">Add photo</button><button class="table-delete" data-action="skin-check-delete" data-id="${esc(c.id)}" aria-label="Delete skin record from ${dayLabel(c.at)}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}
    ${healed.length ? `<section class="panel mission-panel"><div class="panel-head"><div><h2>Healed wounds</h2><p>Kept in the crew record</p></div></div><ul class="mission-reasons">${healed.map(w => `<li>${esc(SkinLogic.woundName(w))}: healed ${dayLabel(w.closedAt)}, after ${SkinLogic.woundSummary(w).daysOpen} days <button class="text-button" data-action="skin-wound-delete" data-id="${esc(w.id)}">Delete</button></li>`).join('')}</ul></section>` : ''}
    <div class="notice">${icon('info')}<p>These checks do not diagnose skin conditions or infections. Flags use simple rules: a symptom on 3 of 7 days, a wound growing by more than 10%, a wound no smaller after 7 days, or a recorded warning sign. They are not clinical limits, so a wound with no flags can still need care. <a href="#research?topic=immune">See the research</a>.</p></div>`;
}
async function attachSkinPage() {
  const token = skinEpoch, workspace = state.mode, crewId = activeCrewId(), slots = $$('[data-skin-photos]');
  if (!slots.length) return;
  try {
    const images = await ObservationStore.list(workspace, crewId);
    if (token !== skinEpoch) return;
    for (const slot of slots) {
      const [type, id] = slot.dataset.skinPhotos.split(':');
      slot.innerHTML = images.filter(r => r.link?.type === type && r.link?.id === id).map(r => { const url = URL.createObjectURL(r.blob); inputURLs.push(url); return `<button data-input-view="${esc(r.id)}" aria-label="Open photo from ${dayLabel(r.at)}"><img src="${url}" alt="${esc(r.title)}"><small>${dayLabel(r.at)}</small></button>`; }).join('');
    }
  } catch { /* Records still work when image storage is unavailable. */ }
}

function skinCheckModal(afterEva = false) {
  modal(afterEva ? 'After spacewalk check' : 'Skin changes', `${esc(activeCrew().name)} · Select what you noticed.`, `<form id="skin-check-form"><div class="form-grid"><div class="field full"><span>What changed?</span>${skinChips('findings', SkinLogic.FINDINGS)}</div><div class="field full"><span>Where?</span>${skinChips('regions', SkinLogic.REGIONS, afterEva ? ['hands'] : [])}</div><label class="field full"><span>How bad is it?</span><select class="field-input" name="severity">${Object.entries(SkinLogic.SEVERITY).map(([n, label]) => `<option value="${n}">${label}</option>`).join('')}</select></label><label class="field full"><span>Notes <small>(optional)</small></span><textarea class="field-input" name="notes" maxlength="1000" placeholder="${afterEva ? 'Glove fit, suit contact points, or nail pain.' : 'When it started, and anything that makes it better or worse.'}"></textarea></label></div><p class="form-error" id="mission-form-error" role="alert"></p></form>`, `${button('Cancel', 'close-modal')}<button class="button primary" type="submit" form="skin-check-form">Save check</button>`);
  $('#skin-check-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target), findings = f.getAll('findings');
    if (!findings.length) return skinFormError('Select at least one change.');
    db().skinChecks.push({ id: crewUID('skin'), crewId: activeCrewId(), at: new Date().toISOString(), findings, regions: f.getAll('regions'), severity: Number(f.get('severity')), afterEva, notes: f.get('notes').trim() });
    missionSave('Skin check saved.');
  });
}
function skinClear() {
  db().skinChecks.push({ id: crewUID('skin'), crewId: activeCrewId(), at: new Date().toISOString(), findings: [], regions: [], severity: null, afterEva: false, notes: '' });
  persist(); render(); toast('Skin check saved.');
}
function skinSignsField() { return `<div class="field full"><span>Any warning signs? <small>(select all that apply)</small></span>${skinChips('signs', SkinLogic.WOUND_SIGNS)}</div>`; }
function skinSizeFields() { return `${missionField('Length', 'length', 'type="number" inputmode="decimal" min="0.1" max="1000" step="0.1"', 'mm')}${missionField('Width', 'width', 'type="number" inputmode="decimal" min="0.1" max="1000" step="0.1"', 'mm')}`; }
function skinReadUpdate(f, at) {
  const length = missionNumber(f.get('length')), width = missionNumber(f.get('width'));
  if ((length === null) !== (width === null)) { skinFormError('Enter both length and width, or leave both blank.'); return null; }
  return { id: crewUID('update'), at, length, width, signs: f.getAll('signs'), notes: f.get('notes').trim() };
}
function skinWoundModal() {
  modal('Add a wound', `${esc(activeCrew().name)} · Track it until it heals.`, `<form id="skin-wound-form"><div class="form-grid"><label class="field"><span>Type</span><select class="field-input" name="type">${SkinLogic.WOUND_TYPES.map(t => `<option>${t}</option>`).join('')}</select></label>${missionField('Location', 'location', 'maxlength="60" required placeholder="e.g. left forearm"')}${missionField('When it happened', 'at', `type="datetime-local" required value="${localInput()}" max="${localInput()}"`)}<span></span>${skinSizeFields()}${skinSignsField()}<label class="field full"><span>Notes <small>(optional)</small></span><textarea class="field-input" name="notes" maxlength="1000" placeholder="How it happened and how it was cleaned or dressed."></textarea></label></div><p class="form-error" id="mission-form-error" role="alert"></p></form><p class="form-help">For severe bleeding, start care first using Medical response. You can record it here later.</p>`, `${button('Cancel', 'close-modal')}<button class="button primary" type="submit" form="skin-wound-form">Save wound</button>`);
  $('#skin-wound-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target), at = new Date(f.get('at')).toISOString(), location = f.get('location').trim();
    if (!location) return skinFormError('Enter where the wound is.');
    if (Date.parse(at) > Date.now() + 60000) return skinFormError('Choose the current time or an earlier time.');
    const update = skinReadUpdate(f, at); if (!update) return;
    db().wounds.push({ id: crewUID('wound'), crewId: activeCrewId(), type: f.get('type'), location, openedAt: at, closedAt: null, updates: [update] });
    missionSave('Wound added.');
  });
}
function skinWoundUpdateModal(id) {
  const wound = db().wounds.find(w => w.id === id); if (!wound) return;
  modal('Update wound', esc(SkinLogic.woundName(wound)), `<form id="skin-update-form"><div class="form-grid">${skinSizeFields()}${skinSignsField()}<label class="field full"><span>Notes <small>(optional)</small></span><textarea class="field-input" name="notes" maxlength="1000" placeholder="Dressing changes and how it looks."></textarea></label></div><p class="form-error" id="mission-form-error" role="alert"></p></form><p class="form-help">Measure the longest length and the widest width the same way each time.</p>`, `${button('Cancel', 'close-modal')}<button class="button primary" type="submit" form="skin-update-form">Save update</button>`);
  $('#skin-update-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target), update = skinReadUpdate(f, new Date().toISOString()); if (!update) return;
    if (update.length === null && !update.signs.length && !update.notes) return skinFormError('Add a measurement, a warning sign or a note.');
    wound.updates.push(update);
    missionSave('Wound updated.');
  });
}
function handleSkinControl(t) {
  const a = t.dataset.action, id = t.dataset.id;
  if (!a || !a.startsWith('skin-')) return false;
  const wound = () => db().wounds.find(w => w.id === id);
  const actions = {
    'skin-clear': skinClear, 'skin-check': () => skinCheckModal(), 'skin-eva': () => skinCheckModal(true),
    'skin-check-photo': () => inputPhotoModal({ title: 'Skin observation', link: { type: 'skin', id } }),
    'skin-check-delete': () => missionConfirm('Delete this skin record?', 'This removes the record from this browser. Any photo stays in the image gallery.', 'skin-check-confirm', id, 'Delete record'),
    'skin-check-confirm': () => { db().skinChecks = db().skinChecks.filter(c => c.id !== id); missionSave('Skin record deleted.'); },
    'skin-wound-add': skinWoundModal, 'skin-wound-update': () => skinWoundUpdateModal(id),
    'skin-wound-photo': () => { const w = wound(); if (w) inputPhotoModal({ title: `Wound: ${SkinLogic.woundName(w)}`, link: { type: 'wound', id } }); },
    'skin-wound-close': () => missionConfirm('Mark this wound as healed?', 'It moves to Healed wounds and stops raising flags.', 'skin-wound-close-confirm', id, 'Mark healed'),
    'skin-wound-close-confirm': () => { const w = wound(); if (w) w.closedAt = new Date().toISOString(); missionSave('Wound marked as healed.'); },
    'skin-wound-delete': () => missionConfirm('Delete this wound record?', 'This removes the wound and its updates from this browser. Any photos stay in the image gallery.', 'skin-wound-delete-confirm', id, 'Delete wound'),
    'skin-wound-delete-confirm': () => { db().wounds = db().wounds.filter(w => w.id !== id); missionSave('Wound record deleted.'); }
  };
  actions[a]?.();
  return Boolean(actions[a]);
}
