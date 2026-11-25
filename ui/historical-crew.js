'use strict';

/*
 * Historical crew profiles for the demo workspace: Mercury-Atlas 7 (Scott Carpenter, 1962)
 * and Mercury-Atlas 9 (Gordon Cooper, 1963).
 *
 * Every value comes from the Evidence library's historical records
 * (assets/ALL_NUMERIC_METRICS_LONG.csv, record ids NASA-VITAL-001 to 013); a test checks
 * they match. That transcription was supplied by a user and was not verified against the
 * original NASA PDFs. The sources give mission phases, not clock times, so each reading is
 * placed at an approximate time in that phase, on the real mission date (UTC).
 *
 * These are reference records of past missions, not current crew. Crew status shows them
 * as "Historical record", never as overdue or needing review.
 */
const HistoricalCrew = (() => {
  const SOURCE = 'Historical mission record';
  const CAVEAT = 'Historical NASA record (user-supplied transcription, not verified against the original PDF). Time is approximate; the source gives the mission phase only.';

  // value: mean or reported value. range: [min, max] and n: sample count, where the source gives them.
  const PROFILES = [
    {
      profile: { id: 'hist-ma7', name: 'Scott Carpenter', role: 'Mercury-Atlas 7 pilot · 1962', mission: 'Mercury-Atlas 7', missionDate: '1962-05-24' },
      records: [
        { record: 'NASA-VITAL-008', phase: 'All preflight data', at: '1962-05-23T12:00:00Z', source: '19770026836.pdf', aggregate: true,
          hr: { value: 57, range: [42, 84], n: 408 }, rr: { value: 15, range: [5, 32], n: 354 }, tempF: { value: 99.3, c: 37.39, range: [98.3, 101.5], n: 128 },
          note: 'Mean of all preflight data, not one reading. Placed the day before launch.' },
        { record: 'NASA-VITAL-013', phase: 'Preflight transfer van', at: '1962-05-24T11:30:00Z', aggregate: true,
          hr: { value: 65, range: [56, 70] }, rr: { value: 14, range: [8, 20] },
          note: 'About 50 minutes in the transfer van on launch day. No blood pressure or body temperature recorded.' },
        { record: 'NASA-VITAL-009', phase: 'Countdown', at: '1962-05-24T12:15:00Z', aggregate: true,
          hr: { value: 62, range: [50, 84], n: 92 }, rr: { value: 15, range: [6, 26], n: 75 }, tempF: { value: 97.8, c: 36.56, range: [96.8, 98.2], n: 57 } },
        { record: 'NASA-VITAL-010', phase: 'Launch', at: '1962-05-24T12:45:00Z', aggregate: true,
          hr: { value: 87, range: [82, 96], n: 7 }, rr: { value: 16, range: [10, 20], n: 5 }, tempF: { value: 98, c: 36.67, range: [98, 98], n: 4 } },
        { record: 'NASA-VITAL-011', phase: 'Orbital', at: '1962-05-24T15:00:00Z', aggregate: true,
          hr: { value: 70, range: [60, 94], n: 94 }, rr: { value: 14, range: [10, 18], n: 83 }, tempF: { value: 99.9, c: 37.72, range: [98, 100.6], n: 60 },
          note: 'Respiratory rate estimated from ECG R-wave variation; approximate only.' },
        { record: 'NASA-VITAL-012', phase: 'Reentry', at: '1962-05-24T17:30:00Z', aggregate: true,
          hr: { value: 84, range: [72, 104], n: 15 }, rr: { value: 19, range: [16, 24], n: 9 }, tempF: { value: 100.4, c: 38.0, range: [100.2, 100.5], n: 15 },
          note: 'Respiratory rate estimated from ECG R-wave variation; approximate only.' },
      ],
    },
    {
      profile: { id: 'hist-ma9', name: 'Gordon Cooper', role: 'Mercury-Atlas 9 pilot · 1963', mission: 'Mercury-Atlas 9', missionDate: '1963-05-15' },
      records: [
        { record: 'NASA-VITAL-001', phase: 'Prelaunch', at: '1963-05-15T12:00:00Z',
          hr: { value: 72 }, sys: 113, dia: 79, rr: { value: 19 } },
        { record: 'NASA-VITAL-002', phase: 'Orbital', at: '1963-05-16T06:00:00Z',
          hr: { value: 89 }, sys: 119, dia: 81, rr: { value: 15 } },
        { record: 'NASA-VITAL-003', phase: 'Postflight, supine, 1–7 hours after landing', at: '1963-05-17T03:00:00Z',
          hr: { value: 83 }, sys: 89, dia: 64 },
        { record: 'NASA-VITAL-004', phase: 'Postflight, standing, 1–7 hours after landing', at: '1963-05-17T03:05:00Z',
          hr: { value: 123 }, sys: 90, dia: 73 },
        { record: 'NASA-VITAL-007', phase: 'Postflight', at: '1963-05-17T03:10:00Z',
          tempF: { value: 99.4, c: 37.44 },
          note: 'Oral temperature; the source reports 310.6 K (99.4 °F). Postflight timing unspecified.' },
        { record: 'NASA-VITAL-005', phase: 'Postflight, supine, 18 hours after landing', at: '1963-05-17T17:24:00Z',
          hr: { value: 58 }, sys: 98, dia: 61 },
        { record: 'NASA-VITAL-006', phase: 'Postflight, standing, 18 hours after landing', at: '1963-05-17T17:29:00Z',
          hr: { value: 80 }, sys: 94, dia: 68 },
      ],
    },
  ];

  const range = (m, unit) => (m?.range ? `${m.range[0]}–${m.range[1]} ${unit}` : '') + (m?.n ? `, ${m.n} samples` : '');
  function notes(r) {
    const detail = [
      r.hr && (r.hr.range || r.hr.n) && `heart rate ${range(r.hr, 'bpm')}`,
      r.rr && (r.rr.range || r.rr.n) && `respiratory rate ${range(r.rr, 'breaths/min')}`,
      r.tempF && (r.tempF.range || r.tempF.n) && `temperature ${range(r.tempF, '°F')}`,
    ].filter(Boolean);
    return [
      `${r.record} · ${r.phase}.`,
      r.aggregate ? `Values are phase means${detail.length ? ` (range ${detail.join('; ')})` : ''}.` : '',
      r.note || '',
      `Source: 19770026836.pdf, page 420, Table 40-III. ${CAVEAT}`,
    ].filter(Boolean).join(' ');
  }

  function entry(profileId, r) {
    const e = { id: `${profileId}-${r.record}`, crewId: profileId, at: r.at, source: SOURCE, historical: true, notes: notes(r) };
    if (r.hr) e.hr = r.hr.value;
    if (Number.isFinite(r.sys)) { e.sys = r.sys; e.dia = r.dia; }
    if (r.rr) e.rr = r.rr.value;
    if (r.tempF) e.temp = r.tempF.c;
    return e;
  }

  /** Adds the historical profiles to a demo workspace once. Later edits or deletions are kept. */
  function addTo(workspace) {
    if (workspace.historicalCrewVersion) return;
    for (const { profile, records } of PROFILES) {
      if (workspace.crew.some(p => p.id === profile.id)) continue;
      workspace.crew.push({ ...profile, conditions: [], notes: CAVEAT, sample: true, historical: true });
      workspace.entries.push(...records.map(r => entry(profile.id, r)));
    }
    workspace.historicalCrewVersion = 1;
  }

  return { PROFILES, SOURCE, addTo, entry };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = HistoricalCrew;
