/* Rules for reading saved records. Loaded before app.js. */
'use strict';

const StateLogic = (() => {
  const validState = s => s?.version === 1
    && Array.isArray(s?.data?.demo?.entries) && Array.isArray(s?.data?.personal?.entries)
    && Boolean(s.settings) && ['demo', 'personal'].includes(s.mode);
  /* damaged means a saved value exists but cannot be used, so it must not be overwritten unseen. */
  function readStored(raw) {
    if (raw === null || raw === undefined) return { state: null, damaged: false };
    try {
      const state = JSON.parse(raw);
      return validState(state) ? { state, damaged: false } : { state: null, damaged: true };
    } catch { return { state: null, damaged: true }; }
  }
  /* Records come from the newer tab. The workspace and crew stay as this tab selected them, so a new reading cannot land on another person. */
  function adoptState(current, next) {
    next.mode = current.mode;
    for (const mode of ['demo', 'personal']) {
      const crewId = current.data[mode].activeCrewId;
      if (crewId && next.data[mode].crew?.some(c => c.id === crewId)) next.data[mode].activeCrewId = crewId;
    }
    return next;
  }
  return { validState, readStored, adoptState };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = StateLogic;
