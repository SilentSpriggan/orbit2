"""Preserve every supplied CSV field, including blanks and provenance, as text."""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "src/modules/evidence/data"
with (root / "ALL_NUMERIC_METRICS_LONG.csv").open(encoding="utf-8-sig", newline="") as source:
    rows = list(csv.DictReader(source))
(root / "historical.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
print(f"Preserved {len(rows)} metric rows across {len({r['record_id'] for r in rows})} records.")
