/* Who can see mood and wellbeing detail on a shared device. Physical records stay open to the whole crew so anyone can help in an emergency.
   Mood, wellbeing scores and check-in notes are shown only to the crew member, the crew leader and the medical officer.
   A check-in reflection is a private journal entry, so only the crew member who wrote it sees it.
   This decides what the screen shows. It is not security: there is no sign-in, so anyone can change who is viewing. */
const AccessLogic = (() => {
  const ROLES = { leader: 'Crew leader', medical: 'Medical officer' };
  const CHECKIN = 'Daily check-in';

  const roleLabel = profile => ROLES[profile?.access] || '';
  const canSeeWellbeing = (viewer, subjectId) => Boolean(viewer) && (viewer.id === subjectId || Boolean(ROLES[viewer.access]));

  /* Returns the entry unchanged when nothing needs hiding, so physical readings keep their identity. */
  function redact(entry) {
    const hidden = [];
    if (entry.mood !== undefined) hidden.push('mood');
    if (entry.wellbeing && Object.keys(entry.wellbeing).length) hidden.push('wellbeing');
    if (entry.source === CHECKIN && entry.notes) hidden.push('notes');
    if (entry.reflection) hidden.push('reflection');
    if (!hidden.length) return entry;
    const copy = { ...entry, hidden };
    delete copy.mood;
    delete copy.wellbeing;
    delete copy.reflection;
    if (hidden.includes('notes')) copy.notes = '';
    return copy;
  }
  /* The crew leader and medical officer see scores and notes, but not reflections. */
  const withoutReflection = entry => { if (!entry.reflection) return entry; const copy = { ...entry, hidden: [...(entry.hidden || []), 'reflection'] }; delete copy.reflection; return copy; };
  const records = (list, viewer, subjectId) => !canSeeWellbeing(viewer, subjectId) ? list.map(redact) : viewer.id === subjectId ? list : list.map(withoutReflection);

  /* Keeps sleep and check-in timing, which crew status already shows, and drops scores and the reasons behind a support prompt. */
  const hideSummary = summary => ({ ...summary, mood: null, reasons: [], hidden: true });

  /* Names the people who can see a crew member's wellbeing detail, for the notice shown to everyone else. */
  function whoCanSee(profiles, subjectId) {
    const subject = profiles.find(p => p.id === subjectId);
    const others = profiles.filter(p => p.id !== subjectId && ROLES[p.access]).map(p => `${p.name} (${ROLES[p.access].toLowerCase()})`);
    return [subject?.name || 'The crew member', ...others];
  }

  return { ROLES, CHECKIN, roleLabel, canSeeWellbeing, redact, records, hideSummary, whoCanSee };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AccessLogic;
