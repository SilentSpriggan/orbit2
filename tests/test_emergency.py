"""Run with the server's Python: python tests/test_emergency.py"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from orbit_server.emergency import EMERGENCIES, emergency_guidance, follow_up_note  # noqa: E402


class EmergencyGuidance(unittest.TestCase):
    def test_bleeding_from_a_real_conversation(self):
        for said in [
            "Um, I'm bleeding in my left hand and it's going out really fast and I'm really scared. What do I do?",
            "Hey, so I'm leaning out right now and there's a lot of blood coming out and I don't know what to do",
        ]:
            note = emergency_guidance(said)
            self.assertIsNotNone(note, said)
            self.assertIn("(bleeding)", note)
            self.assertIn("This sounds urgent", note)
            self.assertIn("Press firmly and directly", note)
            self.assertIn("medical officer", note)
            self.assertIn("never say you are calling, contacting or connecting", note)
            self.assertNotIn("gentle", note)

    def test_follow_up_keeps_the_steps_and_forbids_promising_contact(self):
        note = follow_up_note("bleeding")
        self.assertIn("EMERGENCY IN PROGRESS (bleeding)", note)
        self.assertIn("flight surgeon through mission control", note)
        self.assertIn("help connect them", note)
        self.assertIn("Press firmly and directly", note)

    def test_steps_have_no_title_to_read_aloud(self):
        for name, _, steps in EMERGENCIES:
            self.assertTrue(steps.startswith("1)"), name)

    def test_other_emergencies(self):
        cases = {
            "I have crushing chest pain": "chest_pain",
            "Crew 02 is choking and can't breathe": "choking",
            "I'm really short of breath": "breathing",
            "TALON passed out in the node": "unresponsive",
            "he's having a seizure": "unresponsive",
            "I burned my hand on the heater": "burn",
        }
        for said, kind in cases.items():
            self.assertIn(f"({kind})", emergency_guidance(said) or "", said)

    def test_ordinary_questions_get_no_note(self):
        for said in ["What are Gordon Cooper's latest readings?", "Open the anatomy lab.", "Log a heart rate of 70 for Crew 02."]:
            self.assertIsNone(emergency_guidance(said), said)

    def test_a_research_question_is_only_a_check(self):
        note = emergency_guidance("Why do astronauts' gums bleed in space?")
        self.assertIn("First check whether this is happening to someone now", note)


if __name__ == "__main__":
    unittest.main()
