"""Run with python3 tests/test_historical_retrieval.py; no model dependencies needed."""
import ast
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'server/orbit_server/store.py').read_text()
tree = ast.parse(source)
store_class = next(n for n in tree.body if isinstance(n, ast.ClassDef))
search = next(n for n in store_class.body if isinstance(n, ast.FunctionDef) and n.name == 'search_evidence')
stem = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == '_stem')
namespace = {'re': re, '_WORD': re.compile(r'[a-z0-9]+'), 'Any': object}
missions = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == '_missions')
exec(compile(ast.fix_missing_locations(ast.Module(body=[stem, missions, search], type_ignores=[])), '<actual store search>', 'exec'), namespace)

class HistoricalRetrieval(unittest.TestCase):
    def setUp(self):
        self.store = type('Fixture', (), {})()
        self.store.evidence = json.loads((ROOT / 'server/data/research-library.json').read_text())['passages']

    def test_exact_record_with_natural_question(self):
        hits = namespace['search_evidence'](self.store, 'What was the heart rate for NASA-VITAL-001?', 4)
        self.assertIn('NASA-VITAL-001:', hits[0]['title'])
        for value in ['72 bpm', 'Prelaunch', 'Gordon Cooper', 'page 420']:
            self.assertIn(value, hits[0]['excerpt'])

    def test_subject_and_phase(self):
        hits = namespace['search_evidence'](self.store, 'Gordon Cooper prelaunch heart rate', 4)
        self.assertIn('NASA-VITAL-001:', hits[0]['title'])

    def test_pilot_is_not_scientist_pilot(self):
        hits = namespace['search_evidence'](self.store, "How did the Skylab 4 pilot's resting heart rate change from preflight to in-flight?", 4)
        titles = [h['title'] for h in hits]
        self.assertTrue(all(t.startswith('SKYLAB4-PILOT-') for t in titles), titles)
        self.assertTrue(any(t.startswith('SKYLAB4-PILOT-REST-PREFLIGHT:') for t in titles))
        self.assertTrue(any(t.startswith('SKYLAB4-PILOT-REST-IN-FLIGHT:') for t in titles))
        hits = namespace['search_evidence'](self.store, 'Skylab 4 scientist pilot resting heart rate in flight', 4)
        self.assertIn('SKYLAB4-SCIENTISTPILOT-REST-IN-FLIGHT:', hits[0]['title'])

    def test_record_with_the_asked_measure_ranks_first(self):
        hits = namespace['search_evidence'](self.store, "What was Gordon Cooper's body temperature after landing?", 4)
        self.assertIn('NASA-VITAL-007:', hits[0]['title'])

    def test_record_without_the_measure_still_reaches_the_model(self):
        # Only minute ventilation was recorded; the model must see this record to say so.
        hits = namespace['search_evidence'](self.store, "What was the Skylab 4 pilot's respiratory rate in breaths per minute during postflight recovery?", 4)
        self.assertIn('SKYLAB4-PILOT-RECOVERY-POSTFLIGHT:', hits[0]['title'])

    def test_shared_interpretation_guidance(self):
        guidance = (ROOT / 'server/orbit_server/evidence_guidance.py').read_text()
        for phrase in ['grouped protocol means', 'Missing fields are unknown', 'BTPS and STPD', 'PDF/page/table']:
            self.assertIn(phrase, guidance)
        for file in ['voice.py', 'onboard_library.py']:
            self.assertIn('HISTORICAL_GUIDANCE', (ROOT / 'server/orbit_server' / file).read_text())

    def test_nasa_sources_and_hostile_environments(self):
        cases = {
            'How hot is Venus?': 'Planet Venus',
            'How cold does Mercury get?': 'Planet Mercury',
            'What is Mars like for astronauts?': 'Planet Mars',
            'How much radiation did the Apollo 10 crew get?': 'Radiation dose (Apollo 10)',
            'Why does morale drop in the third quarter of a mission?': 'Morale in the third quarter',
            'What are hostile environments?': 'Fiberglass in the cabin (Apollo 10)',
            'How hard did the Apollo moonwalks work?': 'Effort on the Apollo moonwalks',
            'Can heart rate predict metabolic rate on a spacewalk?': 'Heart rate as a workload estimate',
            'What happened on Gemini XI?': 'Overexertion on Gemini spacewalks',
        }
        for question, title in cases.items():
            hits = namespace['search_evidence'](self.store, question, 3)
            self.assertTrue(hits[0]['title'].startswith(title), f'{question} -> {hits[0]["title"]}')
        # The Mercury program still means the missions, not the planet.
        hits = namespace['search_evidence'](self.store, 'Tell me about the Mercury mission crew', 3)
        self.assertNotIn('Planet Mercury', hits[0]['title'])

if __name__ == '__main__':
    unittest.main()
