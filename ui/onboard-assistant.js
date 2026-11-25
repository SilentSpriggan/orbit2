/* "Ask the onboard library" panel on the Evidence library page. Talks to the offline assistant that
   scripts/serve.mjs runs with --assistant. Only the typed question is sent, to the computer that serves this page. Loaded before mission.js. */
'use strict';

/* The privacy line must be true wherever the page is opened. On the host computer the question never leaves it;
   through a shared link or a hosted site it travels to the host computer. */
const ONBOARD_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const onboardPrivacy = () => ONBOARD_LOCAL
  ? 'Your question stays on this computer.'
  : 'Your question is sent over the network to the computer that runs the onboard model. It is not sent to an AI company.';
/* Model errors are reported in plain words; the server's own text can be Ollama's raw message. */
const ONBOARD_ERRORS = {
  'model-missing': 'The onboard model is not installed on the host computer.',
  'ollama-offline': 'The onboard model stopped responding.',
  'ollama-error': 'The onboard model ran into a problem on the host computer.'
};
const onboardPassages = n => `${n} library ${n === 1 ? 'passage' : 'passages'}`;

/* Answer layout the reader picks. Remembered in this browser only; if storage is blocked the default is used. */
const ONBOARD_STYLES = [['summary', 'Summary and bullets'], ['paragraphs', 'Paragraphs'], ['bullets', 'Bullets only']];
const ONBOARD_STYLE_KEY = 'orbit-onboard-answer-style';
function onboardSavedStyle() {
  try { const saved = localStorage.getItem(ONBOARD_STYLE_KEY); return ONBOARD_STYLES.some(([id]) => id === saved) ? saved : 'summary'; } catch { return 'summary'; }
}
/* One tap shows a judge or a new crew member what the panel does. Each is covered by the library. */
const ONBOARD_STARTERS = ['Why do astronauts get headaches on the station?', 'What happens to bones in microgravity?', 'How does short sleep affect astronauts?'];
/* expanded is null until the reader opens or closes the panel; until then it opens itself when the model is ready. */
const onboard = { style: onboardSavedStyle(), question: '', answer: '', sources: [], state: 'idle', error: '', status: null, checkedAt: 0, covered: true, clock: null, tick: 0, fieldMsg: '', checking: false, expanded: null, controller: null, restored: false, asked: '', sourcesOpen: false, rewriting: null, openPassages: new Set() };

/* Show the reader's elapsed wait, including the network when the page is shared. */
const onboardSeconds = ms => `${(ms / 1000).toFixed(1)} s`;
function onboardTimingText() {
  const c = onboard.clock; if (!c) return '';
  const now = c.end ?? performance.now(), first = c.first == null ? '' : `First words after ${onboardSeconds(c.first - c.start)} · `;
  if (onboard.state === 'asking') return c.first == null ? `Waiting for the first words · ${onboardSeconds(now - c.start)}` : `${first}writing · ${onboardSeconds(now - c.start)}`;
  /* A request refused at once has no useful duration. */
  if (onboard.state === 'error' || onboard.state === 'stopped') return now - c.start < 500 ? '' : `Stopped after ${onboardSeconds(now - c.start)}`;
  if (!onboard.covered) return 'No library passage matched, so the model was not asked.';
  return `Answered in ${onboardSeconds(now - c.start)} from ${onboardPassages(onboard.sources.length)}`;
}
function onboardTimingRefresh() { const el = $('#onboard-timing'); if (el) el.textContent = onboardTimingText(); }
function onboardClockStop() { clearInterval(onboard.tick); onboard.tick = 0; if (onboard.clock) onboard.clock.end ??= performance.now(); }

function onboardStatusText() {
  const s = onboard.status;
  if (!s) return 'Checking the onboard model…';
  /* A failed answer is not a ready model; say so beside the title until the next question works. */
  if (s.ready && onboard.state === 'error') return 'Last answer failed';
  if (s.ready) return 'Onboard model ready';
  return 'Not available right now';
}
function onboardHelp() {
  const s = onboard.status;
  if (!s || s.ready) return '';
  /* The reader is usually crew or a visitor, so say what still works first. The fix is for whoever runs the host computer. */
  const states = {
    'no-server': ['The onboard assistant is not available on this copy of ORBIT.', 'Start ORBIT with <code>npm run offline-assistant</code> on the computer that has Ollama. Then open ORBIT from that computer or from its shared link.'],
    'ollama-offline': ['The onboard model is not running on the host computer.', 'Start the Ollama app on the host computer, then ask again.'],
    'model-missing': ['The onboard model is not installed on the host computer yet.', `Run <code>ollama pull ${esc(s.model || '')}</code> on the host computer, then ask again.`],
    'ollama-error': ['The onboard model reported a problem on the host computer.', 'Restart the Ollama app on the host computer, then ask again.']
  };
  const [what, setup] = states[s.reason] || states['ollama-error'];
  return `<div class="notice onboard-help">${icon('info')}<div><p>${what} You can still search and read the library.</p><button class="button small" type="button" data-onboard-retry>Check again</button><details><summary>Setup for the host computer</summary><p>${setup}</p></details></div></div>`;
}

/* Escapes the model's text, then turns [2] or [1, 3] into buttons for sources that exist.
   Runs of "- " lines become a list and other lines a paragraph, so a summary line followed by bullets works with or without a blank line. */
function onboardFormat(text) {
  const known = new Set(onboard.sources.map(s => s.n));
  const cite = safe => safe.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (whole, list) => {
    /* A number with no matching passage is marked, so an unsupported claim never looks sourced. */
    return list.split(',').map(n => Number(n.trim())).map(n => known.has(n)
      ? `<button type="button" class="onboard-cite" data-onboard-cite="${n}" aria-label="Source ${n}">${n}</button>`
      : `<span class="onboard-cite-missing">[source ${n} not found]</span>`).join(' ');
  });
  const bullet = /^(?:[-*•]|\d+[.)])\s+/;
  return text.trim().split(/\n\s*\n/).map(block => {
    const runs = [];
    /* A line holding only citations, such as "[1] [3]", says nothing on its own, so it is left out. */
    for (const line of block.split('\n').map(l => l.trim()).filter(l => l && !/^(?:\[\d+(?:\s*,\s*\d+)*\][\s.,;]*)+$/.test(l))) {
      const isItem = bullet.test(line), last = runs.at(-1);
      if (last && last.list === isItem) last.lines.push(line); else runs.push({ list: isItem, lines: [line] });
    }
    return runs.map(run => run.list
      ? `<ul>${run.lines.map(l => `<li>${cite(esc(l.replace(bullet, '')))}</li>`).join('')}</ul>`
      : `<p>${cite(esc(run.lines.join(' ')))}</p>`).join('');
  }).join('');
}
function onboardSourceList() {
  if (!onboard.sources.length) return '';
  /* Collapsed by default so the answer stays short; a citation opens it at its passage. */
  return `<details class="onboard-sources-box" id="onboard-sources-box"${onboard.sourcesOpen ? ' open' : ''}><summary>Library passages behind this answer (${onboard.sources.length})</summary><ol class="onboard-sources">${onboard.sources.map(s => `<li id="onboard-source-${s.n}" tabindex="-1"><span class="onboard-source-n">${s.n}</span><div><strong>${esc(s.title)}</strong><small>${esc(s.section)} · ${esc(s.evidence)}</small>${s.text ? `<details class="onboard-passage" data-onboard-passage="${s.n}"${onboard.openPassages.has(s.n) ? ' open' : ''}><summary>Read the passage</summary><p>${esc(s.text)}</p></details>` : ''}${s.sources.map(src => `<a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(src.cite)} ${icon('external')}<span class="sr-only"> (opens in a new tab)</span></a>`).join('')}</div></li>`).join('')}</ol></details>`;
}
function onboardErrorHtml() {
  const kept = onboard.restored ? ' Your previous answer is below.' : onboard.answer ? ' The partial answer is below.' : '';
  const q = onboard.asked.length > 50 ? `${onboard.asked.slice(0, 47).trimEnd()}…` : onboard.asked;
  /* The evidence entries still work without the model, so offer them as the way forward too. */
  return `<div class="notice onboard-error" role="alert">${icon('alert')}<div><p>${esc(onboard.error)}${kept} You can still search the evidence entries.</p><div class="onboard-error-actions"><button class="button small" type="button" data-onboard-again>Try again</button>${q ? `<button class="button small" type="button" data-onboard-search>Search the library for “${esc(q)}”</button>` : ''}</div></div></div>`;
}
/* Not covered still leads somewhere: the same words in the library search, and the examples. */
function onboardNotCoveredHtml() {
  const q = onboard.asked.length > 60 ? `${onboard.asked.slice(0, 57).trimEnd()}…` : onboard.asked;
  return `<div class="onboard-next"><button class="button small" type="button" data-onboard-search>Search the library for “${esc(q)}”</button></div>`;
}
/* Layout is chosen after seeing an answer, and choosing another one rewrites that answer. */
function onboardShowAsHtml() {
  return `<div class="onboard-style"><span id="onboard-style-label">Rewrite as</span><div class="segmented" role="group" aria-labelledby="onboard-style-label">${ONBOARD_STYLES.map(([id, label]) => `<button type="button" class="${id === onboard.style ? 'active' : ''}" aria-pressed="${id === onboard.style}" data-onboard-style="${id}">${label}</button>`).join('')}</div></div>`;
}
function onboardAnswerHtml() {
  if (onboard.state === 'idle') return '';
  if (onboard.state === 'error') return onboardErrorHtml() + (onboard.answer ? `<div class="onboard-text">${onboardFormat(onboard.answer)}</div>${onboard.covered ? onboardSourceList() : ''}` : '');
  if (onboard.state === 'done' && !onboard.covered) return `<div class="onboard-text">${onboardFormat(onboard.answer)}</div>${onboardNotCoveredHtml()}`;
  /* While a rewrite starts, the earlier answer stays readable until the new text arrives. */
  if (onboard.state === 'asking' && !onboard.answer && onboard.rewriting) return `<p class="onboard-thinking">Rewriting as ${esc(ONBOARD_STYLES.find(([id]) => id === onboard.style)[1].toLowerCase())}…</p><div class="onboard-text onboard-stale">${onboardFormat(onboard.rewriting.answer)}</div>`;
  const body = onboard.answer ? onboardFormat(onboard.answer) : `<p class="onboard-thinking">${onboard.state === 'stopped' ? 'Answer stopped before any text arrived.' : 'Searching the library and writing an answer…'}</p>`;
  return `<div class="onboard-text">${body}</div>${onboard.state === 'done' && onboard.answer ? onboardShowAsHtml() : ''}${onboard.covered ? onboardSourceList() : ''}`;
}

const onboardUnavailable = () => !!onboard.status && !onboard.status.ready;
const localVoiceHoldsModel = () => document.body?.dataset?.localVoice === 'true';
const LOCAL_VOICE_HOLD = 'The offline crew assistant is using the onboard model. Ask it from the side panel so this computer does not run a second answer.';
const onboardShowStarters = () => !!onboard.status?.ready && !onboard.checking && (onboard.state === 'idle' || (onboard.state === 'done' && !onboard.covered));
/* With no summary on screen, only the emergency sentence of the caveat applies. */
const onboardNoSummary = () => onboardUnavailable() || (onboard.state === 'done' && !onboard.covered) || (onboard.state === 'error' && !onboard.answer);
function onboardAskPanel() {
  const busy = onboard.state === 'asking' || onboard.checking;
  const held = localVoiceHoldsModel();
  return `<details class="panel onboard-ask" id="onboard-panel" ${onboard.expanded ? 'open' : ''}>
    <summary aria-labelledby="onboard-ask-title" aria-describedby="onboard-status"><h2 id="onboard-ask-title">Ask the onboard library</h2><span class="onboard-status" id="onboard-status">${esc(onboardStatusText())}</span></summary>
    <div class="onboard-body"><p class="onboard-intro">Answers use only this library and the MedlinePlus topics stored on board. ${onboardPrivacy()} The separate Crew assistant uses an internet connection.</p>
    <form id="onboard-ask-form" class="onboard-form"><label for="onboard-question">Question for the onboard library</label><div><input id="onboard-question" class="field-input" maxlength="500" autocomplete="off" aria-describedby="onboard-field-msg onboard-help" placeholder="For example: why do astronauts get headaches?" value="${esc(onboard.question)}" ${onboardUnavailable() || held ? 'disabled' : ''}><button class="button primary" type="submit" ${busy || onboardUnavailable() || held ? 'disabled' : ''}>${busy ? 'Answering…' : 'Ask'}</button><button class="button" id="onboard-stop" type="button" aria-keyshortcuts="Escape" ${busy ? '' : 'hidden'}>Stop</button></div></form>
    <p class="onboard-field-msg" id="onboard-field-msg" role="alert">${esc(held && !onboard.fieldMsg ? LOCAL_VOICE_HOLD : onboard.fieldMsg)}</p>
    <div class="onboard-starters" id="onboard-starters" ${onboardShowStarters() ? '' : 'hidden'}><span id="onboard-starters-label">Ask an example</span><div role="group" aria-labelledby="onboard-starters-label">${ONBOARD_STARTERS.map(q => `<button class="button small" type="button" data-onboard-starter>${esc(q)}</button>`).join('')}</div></div>
    <div id="onboard-help">${onboardHelp()}</div>
    <div class="onboard-answer" id="onboard-answer" aria-busy="${busy}">${onboardAnswerHtml()}</div>
    <p class="onboard-limit onboard-timing" id="onboard-timing">${esc(onboardTimingText())}</p>
    <p class="onboard-limit" id="onboard-caveat"><span id="onboard-caveat-summary" ${onboardNoSummary() ? 'hidden' : ''}>Summaries can be wrong, so check the cited source before acting. This is not a diagnosis. </span>In an emergency, open <button type="button" class="text-button onboard-response" data-action="emergency">Medical response</button>.</p>
    <p class="sr-only" id="onboard-done" role="status"></p>
    </div>
  </details>`;
}

function onboardRefresh() {
  const answer = $('#onboard-answer'); if (!answer) return;
  answer.innerHTML = onboardAnswerHtml(); answer.setAttribute('aria-busy', onboard.state === 'asking'); hydrateIcons(answer);
  $('#onboard-status').textContent = onboardStatusText();
  /* Rewritten only when it changes, so an open setup note stays open. */
  const help = $('#onboard-help'), helpHtml = onboardHelp();
  if (help.dataset.shown !== helpHtml) { help.innerHTML = helpHtml; help.dataset.shown = helpHtml; hydrateIcons(help); }
  const msg = $('#onboard-field-msg'); if (msg.textContent !== onboard.fieldMsg) msg.textContent = onboard.fieldMsg;
  onboardTimingRefresh();
  const busy = onboard.state === 'asking' || onboard.checking;
  const held = localVoiceHoldsModel();
  document.documentElement.toggleAttribute('data-onboard-ready', !!onboard.status?.ready);
  $('#onboard-starters').hidden = !onboardShowStarters();
  $('#onboard-caveat-summary').hidden = onboardNoSummary();
  const submit = $('#onboard-ask-form button[type="submit"]'); submit.disabled = busy || onboardUnavailable() || held; $('#onboard-question').disabled = onboardUnavailable() || held; submit.textContent = onboard.state === 'asking' ? 'Answering…' : onboard.checking ? 'Checking…' : 'Ask';
  $('#onboard-stop').hidden = !onboard.controller;
  const retry = $('[data-onboard-retry]'); if (retry) retry.disabled = busy;
}
async function onboardCheck(force = false, signal) {
  if (!force && onboard.status && Date.now() - onboard.checkedAt < 30000) return onboard.status;
  try {
    const response = await fetch('api/assistant/status', { cache: 'no-store', signal });
    onboard.status = response.ok && /json/.test(response.headers.get('content-type') || '') ? await response.json() : { ready: false, reason: 'no-server' };
  } catch (error) { if (signal?.aborted) throw error; onboard.status = { ready: false, reason: 'no-server' }; }
  onboard.checkedAt = Date.now();
  if (onboard.expanded === null && onboard.status.ready) { onboard.expanded = true; const panel = $('#onboard-panel'); if (panel) panel.open = true; }
  onboardRefresh(); return onboard.status;
}

async function onboardAsk(question, rewrite = null) {
  if (localVoiceHoldsModel()) { onboard.fieldMsg = LOCAL_VOICE_HOLD; onboardRefresh(); return; }
  /* Check the model first. If it is not available, say the question was not sent and keep the last answer on screen. */
  const startedAt = performance.now();
  const controller = new AbortController(); onboard.controller = controller;
  /* The last complete answer, kept in case this one fails before any text arrives. A partial answer from a failed try is not kept. */
  const previous = onboard.answer && (onboard.state !== 'error' || onboard.restored) && onboard.state !== 'stopped' ? { answer: onboard.answer, sources: onboard.sources, covered: onboard.covered } : null;
  onboard.question = question; onboard.asked = question; onboard.fieldMsg = ''; onboard.checking = true; onboard.rewriting = rewrite;
  /* Ask, an example, a card or Rewrite may be the focused control and is about to be disabled or redrawn. Keep focus in the field. */
  const field = $('#onboard-question'); if (field && document.activeElement !== field) field.focus({ preventScroll: true });
  onboardRefresh();
  try {
    const status = await onboardCheck(true, controller.signal);
    onboard.checking = false;
    /* The notice below already explains why; this line only confirms nothing was sent. */
    if (!status.ready) { onboard.fieldMsg = 'Not sent. The onboard model is still not available.'; return; }
    onboard.answer = ''; onboard.sources = []; onboard.openPassages.clear(); onboard.sourcesOpen = false; onboard.error = ''; onboard.covered = true; onboard.state = 'asking';
    onboard.clock = { start: startedAt, first: null, end: null };
    clearInterval(onboard.tick); onboard.tick = setInterval(onboardTimingRefresh, 100);
    const announcement = $('#onboard-done'); if (announcement) announcement.textContent = 'Searching the library and writing an answer.';
    onboardRefresh();
    const response = await fetch('api/assistant/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, style: onboard.style }), signal: controller.signal });
    /* Busy and request errors from ORBIT's own server are already plain; anything else gets a plain fallback. */
    if (!response.ok) throw new Error(response.status < 500 ? (await response.json().catch(() => ({}))).error || 'The onboard assistant could not answer.' : 'The onboard assistant could not answer.');
    const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '';
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1); if (!line) continue;
        const part = JSON.parse(line);
        if (part.type === 'sources') onboard.sources = part.sources;
        else if (part.type === 'text') { onboard.answer += part.text; onboard.rewriting = null; onboard.clock.first ??= performance.now(); }
        else if (part.type === 'error') { if (part.reason === 'model-missing' || part.reason === 'ollama-offline') onboard.status = { ...onboard.status, ready: false, reason: part.reason }; throw new Error(ONBOARD_ERRORS[part.reason] || ONBOARD_ERRORS['ollama-error']); }
        else if (part.type === 'done') onboard.covered = part.covered !== false;
        onboardRefresh();
      }
    }
    onboardClockStop(); onboard.state = 'done';
    const took = onboardSeconds(onboard.clock.end - onboard.clock.start);
    const done = $('#onboard-done'); if (done) done.textContent = onboard.covered ? `Answer ready in ${took}, from ${onboardPassages(onboard.sources.length)}.` : 'The onboard library does not cover this question.';
  } catch (error) {
    if (controller.signal.aborted && !onboard.answer && onboard.rewriting) {
      /* A rewrite stopped before any text: keep the earlier answer and its layout. */
      Object.assign(onboard, { answer: onboard.rewriting.answer, sources: onboard.rewriting.sources, covered: onboard.rewriting.covered, style: onboard.rewriting.style, state: 'done' });
      onboard.fieldMsg = 'Rewrite stopped. The earlier answer is shown.';
    } else if (controller.signal.aborted) {
      if (onboard.state === 'asking') { onboard.state = 'stopped'; onboard.fieldMsg = 'Answer stopped. Check any partial summary against the cited sources.'; }
      else onboard.fieldMsg = 'Request stopped. Your question was not sent.';
    } else {
      onboard.state = 'error'; onboard.error = error.message;
      /* Nothing new arrived, so put the last good answer back under the error instead of losing it. */
      onboard.restored = !onboard.answer && !!previous;
      if (onboard.restored) { Object.assign(onboard, previous); onboard.openPassages.clear(); if (onboard.rewriting) onboard.style = onboard.rewriting.style; }
    }
    const done = $('#onboard-done'); if (done) done.textContent = '';
  } finally {
    onboardClockStop(); onboard.checking = false; onboard.controller = null; onboard.rewriting = null; onboardRefresh();
  }
}

function attachOnboardAssistant() {
  const form = $('#onboard-ask-form'); if (!form) return;
  $('#onboard-panel').addEventListener('toggle', e => { onboard.expanded = e.target.open; });
  $('#onboard-stop').addEventListener('click', () => { onboard.controller?.abort(); $('#onboard-question').focus(); });
  $('#onboard-help').addEventListener('click', async e => {
    if (!e.target.closest('[data-onboard-retry]') || onboard.checking || onboard.state === 'asking') return;
    onboard.checking = true; onboardRefresh();
    try { const status = await onboardCheck(true); if (status.ready) onboard.fieldMsg = 'Onboard model ready. Ask your question when you’re ready.'; }
    finally { onboard.checking = false; onboardRefresh(); }
  });
  $('#onboard-answer').addEventListener('click', e => {
    if (e.target.closest('[data-onboard-again]')) { if (onboard.asked && !onboard.controller) onboardAsk(onboard.asked); return; }
    if (!e.target.closest('[data-onboard-search]')) return;
    /* Hand the question to the evidence search across all topics, then put the reader on the results. */
    missionResearchQuery = onboard.asked;
    const show = () => { const field = $('#research-search'); if (!field) return; field.value = missionResearchQuery; missionResearchRefresh(); $('#research-status').scrollIntoView({ block: 'start' }); field.focus({ preventScroll: true }); };
    if (location.hash === '#research?topic=all') show();
    else { location.hash = '#research?topic=all'; setTimeout(show, 0); }
  });
  $('#onboard-starters').addEventListener('click', e => {
    const button = e.target.closest('[data-onboard-starter]'); if (!button || onboard.state === 'asking' || onboard.checking) return;
    $('#onboard-question').value = button.textContent; onboardAsk(button.textContent);
  });
  form.addEventListener('submit', e => {
    e.preventDefault(); if (onboard.state === 'asking' || onboard.checking) return;
    const field = $('#onboard-question'), question = field.value.replace(/\s+/g, ' ').trim();
    /* An empty submit leaves the last answer alone and says what is missing beside the field. */
    if (!question) { onboard.fieldMsg = 'Type a question first.'; field.setAttribute('aria-invalid', 'true'); onboardRefresh(); field.focus(); return; }
    onboardAsk(question);
  });
  $('#onboard-question').addEventListener('input', e => {
    onboard.question = e.target.value;
    e.target.removeAttribute('aria-invalid');
    if (onboard.fieldMsg) { onboard.fieldMsg = ''; onboardRefresh(); }
  });
  $('#onboard-answer').addEventListener('click', e => {
    const button = e.target.closest('[data-onboard-style]'); if (!button || button.dataset.onboardStyle === onboard.style || onboard.controller) return;
    const earlier = { answer: onboard.answer, sources: onboard.sources, covered: onboard.covered, style: onboard.style };
    onboard.style = button.dataset.onboardStyle;
    try { localStorage.setItem(ONBOARD_STYLE_KEY, onboard.style); } catch {}
    $('#onboard-question').value = onboard.asked; onboardAsk(onboard.asked, earlier);
  });
  /* The answer is redrawn as it streams, so remember which passages the reader opened. Toggle events do not bubble. */
  $('#onboard-answer').addEventListener('toggle', e => {
    if (e.target.id === 'onboard-sources-box') { onboard.sourcesOpen = e.target.open; return; }
    const n = Number(e.target.dataset?.onboardPassage); if (!n) return;
    if (e.target.open) onboard.openPassages.add(n); else onboard.openPassages.delete(n);
  }, true);
  $('#onboard-answer').addEventListener('click', e => {
    const n = e.target.closest('[data-onboard-cite]')?.dataset.onboardCite; if (!n) return;
    const item = $(`#onboard-source-${n}`); if (!item) return;
    const box = $('#onboard-sources-box'); if (box && !box.open) { box.open = true; onboard.sourcesOpen = true; }
    item.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); item.focus({ preventScroll: true });
  });
  onboardCheck();
}

/* Other parts of the Evidence library can hand a question to the panel. */
function onboardAskFrom(question) {
  const panel = $('#onboard-panel'), field = $('#onboard-question');
  if (!panel || !question || onboardUnavailable()) return;
  panel.open = true; onboard.expanded = true; field.value = question;
  panel.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (!onboard.controller && onboard.state !== 'asking') onboardAsk(question);
}
document.addEventListener('click', e => {
  const about = e.target.closest('[data-onboard-about]');
  if (about) { onboardAskFrom(`What does the library say about ${about.dataset.onboardAbout.toLowerCase()}?`); return; }
  if (e.target.closest('#research-ask')) onboardAskFrom(missionResearchQuery.trim());
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !onboard.controller || document.querySelector('dialog[open]')) return;
  onboard.controller.abort(); $('#onboard-question')?.focus();
});
window.addEventListener('orbit:local-voice', () => {
  if (!localVoiceHoldsModel()) { if (onboard.fieldMsg === LOCAL_VOICE_HOLD) onboard.fieldMsg = ''; onboardRefresh(); return; }
  onboard.controller?.abort();
  onboard.fieldMsg = LOCAL_VOICE_HOLD;
  onboardRefresh();
});
