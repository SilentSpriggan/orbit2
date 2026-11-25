"""Emergency first response for the voice assistant.

When a person says or types something that sounds like a medical emergency, this adds reviewed
first-response steps to the conversation for that turn, before the model answers. The model then
says those steps first, in its own short sentences, instead of composing first aid from scratch.
The steps are general first aid (direct pressure for bleeding and so on) plus "alert the medical
officer and crew now"; the assistant cannot contact anyone itself.

Matching is deliberately simple keyword patterns, so it is fast and predictable. A research
question that mentions bleeding ("why do gums bleed in space?") may also match; the guidance then
only reminds the model to check whether this is happening now.
"""

import re
import time

from pipecat.frames.frames import Frame, LLMMessagesAppendFrame, TranscriptionFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

ALERT = (
    "Alert the medical officer and the rest of the crew right now, and keep doing these steps while you do. "
    "If the medical officer cannot help, the crew should reach the ground flight surgeon through mission control. "
)

# (name, pattern, steps). Checked in order; the first match wins.
EMERGENCIES = [
    (
        "bleeding",
        r"\b(bleed\w*|blood\w*|hemorrhag\w*|gash\w*|deep cut)\b",
        "1) Press firmly and directly on the wound with a clean cloth or gauze, and keep "
        "pressing hard; do not lift it to check. 2) If blood soaks through, put more cloth on top and keep "
        "pressing. 3) Raise the injured part above the heart if you can. " + ALERT,
    ),
    (
        "choking",
        r"\b(chok\w*|can'?t (?:breathe|swallow)|cannot (?:breathe|swallow)|something stuck in (?:my|his|her|their) throat)\b",
        "1) If the person cannot speak, cough or breathe, a crewmate gives firm "
        "abdominal thrusts, braced against the cabin. 2) If they can cough, encourage them to keep coughing. "
        "3) Check the cabin air and carbon dioxide alarms and use oxygen per procedure. " + ALERT,
    ),
    (
        "breathing",
        r"\b(short(?:ness)? of breath|trouble breathing|hard to breathe|struggling to breathe|not breathing|breathless)\b",
        "1) Stop all activity and stay still. 2) Check the cabin air and carbon dioxide "
        "alarms. 3) Use oxygen per the emergency procedure. " + ALERT,
    ),
    (
        "chest_pain",
        r"\b(chest (?:pain|hurts?|tight\w*|pressure)|heart attack|crushing pain)\b",
        "1) Stop all activity and rest. 2) Note when it started and whether it spreads to the arm, "
        "jaw or back, or comes with sweating or shortness of breath. 3) Open the onboard medical kit per "
        "procedure. " + ALERT,
    ),
    (
        "unresponsive",
        r"\b(unconscious|unresponsive|passed out|fainted|not waking|won'?t wake|collapsed|seizure|convuls\w*)\b",
        "1) Check whether they are breathing. 2) Secure them and clear anything they "
        "could hit; do not hold them down or put anything in their mouth. 3) Follow the emergency checklist. "
        + ALERT,
    ),
    (
        "burn",
        r"\b(burn(?:ed|t|ing)? (?:my|his|her|their|the)|severe burn|on fire)\b",
        "1) Cool the burn with clean cool water for at least 20 minutes if available. 2) Remove rings or "
        "tight items near it, but not anything stuck to the skin. 3) Cover it loosely with a clean dressing. "
        + ALERT,
    ),
]

URGENT_WORDS = r"\b(help|emergency|scared|hurry|fast|a lot|really bad|won'?t stop|can'?t stop|right now|dying)\b"


def emergency_guidance(text: str) -> str | None:
    """The guidance note to add for this message, or None if it does not sound like an emergency."""
    lowered = text.lower()
    for name, pattern, steps in EMERGENCIES:
        if re.search(pattern, lowered):
            urgent = bool(re.search(URGENT_WORDS, lowered))
            return (
                f"EMERGENCY GUIDANCE ({name}). "
                + ("This sounds urgent. " if urgent else "First check whether this is happening to someone now; if it is, ")
                + "Say these first-response steps first, before anything else, in short spoken sentences, "
                "then answer any other question. Do not search the library first and do not ask questions first. "
                "You cannot contact anyone: never say you are calling, contacting or connecting anyone, or that you will "
                "help connect them. "
                f"Steps: {steps}"
            )
    return None


def _user_text(frame: Frame) -> str | None:
    if isinstance(frame, TranscriptionFrame):
        return frame.text
    if isinstance(frame, LLMMessagesAppendFrame) and len(frame.messages) == 1 and frame.messages[0].get("role") == "user":
        content = frame.messages[0].get("content")
        return content if isinstance(content, str) else None
    return None


# After an emergency is raised, later messages ("the medical officer isn't trained") may not
# mention it again, so a short reminder goes with each message for this long.
FOLLOW_UP_SECONDS = 600


def follow_up_note(name: str) -> str:
    steps = next(steps for n, _, steps in EMERGENCIES if n == name)
    return (
        f"EMERGENCY IN PROGRESS ({name}), raised earlier in this conversation. Keep helping with it: answer "
        "this message, and repeat the key first-response steps if they still apply. If the medical officer cannot "
        "help, the crew should reach the ground flight surgeon through mission control. You cannot contact "
        "anyone: never say you are calling, contacting or connecting anyone, or that you will help connect them. "
        f"Steps: {steps}"
    )


class EmergencyGuard(FrameProcessor):
    """Sits after speech recognition. Before an urgent message (spoken or typed) reaches the LLM,
    adds the matching first-response steps to the context as a system note, and keeps a short
    reminder on the messages that follow for FOLLOW_UP_SECONDS."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._active: tuple[str, float] | None = None  # (emergency name, when it was raised)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        text = _user_text(frame) if direction == FrameDirection.DOWNSTREAM else None
        note = emergency_guidance(text) if text else None
        if note:
            self._active = (note.split("(", 1)[1].split(")", 1)[0], time.monotonic())
        elif text and self._active and time.monotonic() - self._active[1] < FOLLOW_UP_SECONDS:
            note = follow_up_note(self._active[0])
        if note:
            await self.push_frame(LLMMessagesAppendFrame(messages=[{"role": "system", "content": note}], run_llm=False), direction)
        await self.push_frame(frame, direction)
