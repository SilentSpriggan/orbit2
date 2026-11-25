"""Build searchable historical evidence entries, preserving supplied provenance."""
import csv, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
source = root / 'src/modules/evidence/data/ALL_NUMERIC_METRICS_LONG.csv'
with source.open(encoding='utf-8-sig', newline='') as f:
    rows = list(csv.DictReader(f))
groups = {}
for row in rows:
    groups.setdefault(row['record_id'], []).append(row)
# Missions with a historical crew profile in ORBIT (ui/historical-crew.js): their cards link to
# that profile's health log. Other missions have no profile, so they stay untracked.
PROFILES = {'Mercury-Atlas 7': ('hist-ma7', 'Scott Carpenter'), 'Mercury-Atlas 9': ('hist-ma9', 'Gordon Cooper')}
items = []
for record_id, metrics in groups.items():
    r = metrics[0]
    context = '; '.join(f'{label}: {r[key]}' for key, label in [('mission','Mission'),('subject','Subject'),('crew_role','Crew role'),('mission_phase','Mission phase'),('exercise_state','Exercise state'),('posture','Posture'),('relative_time','Relative time'),('record_type','Record type')] if r[key])
    measurements = '; '.join(f"{m['metric'].replace('_',' ')}: {m['value']} {m['unit']} ({m['field_name']})" for m in metrics)
    refs = '; '.join(dict.fromkeys(f"{m['source_pdf']}, page {m['source_pdf_page'] or 'unspecified'}, {m['source_table'] or 'table unspecified'}" for m in metrics))
    notes = '; '.join(dict.fromkeys(m['quality_notes'] for m in metrics if m['quality_notes'])) or 'No quality note supplied.'
    items.append(dict(title=f"{record_id}: {r['mission']} — {r['mission_phase']}", evidence='historical', sources=['historicalCsv'], text=f'{context}. Measurements: {measurements}. Source reference: {refs}. Quality notes: {notes} Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.', watch='Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.', track=[f'log?crew={PROFILES[r["mission"]][0]}', f'View in {PROFILES[r["mission"]][1]}’s health log'] if r['mission'] in PROFILES else None))
p = root / 'ui/research-library.js'
s = p.read_text()
start = '  // BEGIN GENERATED HISTORICAL EVIDENCE\n'
end = '  // END GENERATED HISTORICAL EVIDENCE\n'
if start in s:
    a=s.index(start); b=s.index(end,a)+len(end); s=s[:a]+s[b:]
block = start + "  EVIDENCE.historical = 'Historical mission data (supplied transcription)';\n" + "  SOURCES.historicalCsv = " + json.dumps(dict(cite='User-supplied historical metrics CSV',title='ALL_NUMERIC_METRICS_LONG.csv — PDF/page/table references retained in each entry',journal='Original PDFs not supplied; transcription unverified',url='./assets/ALL_NUMERIC_METRICS_LONG.csv')) + ';\n  TOPICS.historical = ' + json.dumps(dict(title='Historical mission measurements',items=items),ensure_ascii=False,indent=2) + ';\n' + end
s=s.replace('  const allItems =', block+'  const allItems =')
p.write_text(s)
(root/'ui/assets/ALL_NUMERIC_METRICS_LONG.csv').write_bytes(source.read_bytes())
print(f'Imported {len(items)} evidence entries with {len(rows)} metric rows.')
