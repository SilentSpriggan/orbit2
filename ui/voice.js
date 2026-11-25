/* Crew voice AI assistant tab.
   The local voice workspace (React + Pipecat, built to /voice/) is embedded here so it
   shares this site's sidebar, top bar and page heading like every other tab. It runs
   in "embed" mode: no navigation of its own, and its links open this site's tabs. */
const VOICE_WORKSPACE_SRC = '/voice/assistant?embed=1';
function voicePage(){
  const heading = pageHeading('Crew voice AI assistant','Talk to ORBIT, review the conversation, and choose what to share. Runs on this network.');
  const note = '<p class="voice-frame-note">Voice and text use the local server (<span class="mono">npm run server</span>). If this area stays empty, build the voice workspace once with <span class="mono">npm run build</span>.</p>';
  if (document.body?.dataset?.localVoice === 'true') return `${heading}<div class="voice-workspace"><p class="voice-frame-note">The offline assistant is open on the right. It stays connected while you change pages.</p></div>`;
  const frame = document.getElementById('voice-frame');
  const main = document.getElementById('main');
  if (frame && main && !main.contains(frame)) return `${heading}<div class="voice-workspace" id="voice-slot"></div>${note}`;
  return `${heading}<div class="voice-workspace"><iframe class="voice-frame" id="voice-frame" src="${VOICE_WORKSPACE_SRC}" title="Crew voice AI assistant workspace" allow="microphone; autoplay"></iframe></div>${note}`;
}
