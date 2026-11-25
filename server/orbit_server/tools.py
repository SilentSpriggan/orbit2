"""The assistant's tools. They run in the browser (see src/modules/assistant/hooks/useToolRegistry.ts).

The server only advertises them to the LLM and relays results:

  LLM calls tool -> RTVI observer sends `llm-function-call-in-progress` to the browser
  -> the browser runs the handler (asking a person to confirm writes/shares)
  -> the browser sends `llm-function-call-result` -> RTVI pushes a FunctionCallResultFrame
  -> ClientToolBridge hands it to the waiting server handler -> handler reports the result.

Keeping the server handler alive until the browser answers lets Pipecat's own timeout,
interruption and context bookkeeping work as for any server-side tool.
"""

import asyncio
import re
from typing import Any

from loguru import logger
from pipecat.adapters.llm.schemas.function_schema import FunctionSchema
from pipecat.adapters.llm.schemas.tools_schema import ToolsSchema
from pipecat.frames.frames import (
    Frame,
    FunctionCallResultFrame,
    InterimTranscriptionFrame,
    LLMMessagesAppendFrame,
    TranscriptionFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.llm_service import FunctionCallParams, LLMService

from .store import VITAL_META

CALLSIGN = {"type": "string", "description": (
    "Crew callsign: CREW01, CREW02, CREW03 or CREW04 (Crew 01 to 04, the current sample crew), "
    "COOPER (Gordon Cooper, Mercury-Atlas 9) or CARPENTER (Scott Carpenter, Mercury-Atlas 7)."
)}

SCHEMAS = [
    FunctionSchema(
        name="get_current_context",
        description="Get the screen the person is on, who is using this console, and any selected crew member or anatomy region.",
        properties={},
        required=[],
    ),
    FunctionSchema(
        name="get_crew_summary",
        description="Get a crew member's latest readings and wellbeing check-in. Defaults to the person using the console.",
        properties={"callsign": CALLSIGN},
        required=[],
    ),
    FunctionSchema(
        name="log_vital",
        description=(
            "Draft a vital-sign reading for a crew member. The person presses Save on screen, or says \"confirm save\", before it is stored; "
            "this tool returns only after they decide, and the result says whether it was saved. "
            "Saved readings also appear in the website's Health log. If a form is open on screen, use fill_form instead."
        ),
        properties={
            "callsign": CALLSIGN,
            "kind": {"type": "string", "enum": list(VITAL_META), "description": "Which reading."},
            "value": {"type": "number", "description": "The number only, in the standard unit."},
            "unit": {"type": "string", "description": "Optional: bpm, %, mmHg, °C or /min."},
        },
        required=["callsign", "kind", "value"],
    ),
    FunctionSchema(
        name="navigate",
        description=(
            "Open a screen in this console. Paths: /crew, /anatomy, /anatomy?region=left_knee, /evidence, /assistant. "
            "Website pages: /status (crew status), /log (health log and trends), /trends (the trends section of /log), "
            "/care (health assessment), /wellbeing, /exercise and /skin (tabs inside health assessment), "
            "/routine (daily routine), /risks (health risk readings), /collect (collect vitals: how to take each measurement). "
            "To open a crew member's record on the main screen, use /crew?crew=<their name or callsign, as the "
            "person said it>, or /log?crew=<name> for their health log. Examples: /crew?crew=Gordon Cooper, "
            "/log?crew=Scott Carpenter, /crew?crew=Crew 03. The crew are Crew 01 (commander, crew leader), Crew 02 (pilot), "
            "Crew 03 (mission specialist, medical officer) and Crew 04 (flight engineer), the current sample crew; "
            "and Gordon Cooper (Mercury-Atlas 9, 1963) and Scott Carpenter (Mercury-Atlas 7, 1962), historical "
            "profiles from past missions. "
            "The result names the screen that opened."
        ),
        properties={"path": {"type": "string", "description": "A path starting with /."}},
        required=["path"],
    ),
    FunctionSchema(
        name="open_form",
        description=(
            "Open a form on the website for the person, as if they pressed its button: use this when they ask "
            "you to log, record, add or report something, or to click a button such as Log health data. "
            "It only opens the form; the person fills it in and presses Save, so never say anything was saved. "
            "Forms: health-check (Log health data: vitals, sleep, glucose, mood, notes), wellbeing-check-in, "
            "workout (exercise session), risk-reading (radiation dose, bone density or muscle strength), "
            "skin-check, eva-skin-check (after a spacewalk), wound, condition-note, image-record (photo or "
            "scan), health-assessment (guided symptom assessment), emergency-checklist (crew medical response), "
            "flight-surgeon-report (whole crew), crew-report (one crew member), crew-member (add a profile). "
            "For a single vital the person tells you, log_vital is quicker. Name the form the way the result does."
        ),
        properties={
            "form": {
                "type": "string",
                "enum": [
                    "health-check", "wellbeing-check-in", "workout", "risk-reading", "skin-check", "eva-skin-check",
                    "wound", "condition-note", "image-record", "health-assessment", "emergency-checklist",
                    "flight-surgeon-report", "crew-report", "crew-member",
                ],
            },
            "crew": {"type": "string", "description": (
                "Whose record, by name or callsign as said, e.g. Crew 02. Use \"me\" when they say I, me or my. "
                "Leave it out for the whole-crew report or when they name no one."
            )},
        },
        required=["form"],
    ),
    FunctionSchema(
        name="fill_form",
        description=(
            "Type values into the form that is open on screen (one you opened with open_form, or one the person "
            "opened). Use the field names listed when the form opened, e.g. {\"hr\": 82, \"sys\": 120, \"dia\": 80, "
            "\"notes\": \"after exercise\"}. When a form is open and the person tells you values or asks you to "
            "type or change something in it, use this, not log_vital. It does not save: the person checks the "
            "form and presses Save, so never say anything was saved or logged."
        ),
        properties={"values": {"type": "object", "description": "Field names and their values."}},
        required=["values"],
    ),
    FunctionSchema(
        name="control_anatomy",
        description="Control the 3D view in the Anatomy lab.",
        properties={
            "action": {
                "type": "string",
                "enum": ["select_region", "focus_region", "reset_view", "rotate", "toggle_layer"],
            },
            "region": {"type": "string", "description": "Body region, e.g. left_knee, lumbar_spine, heart."},
        },
        required=["action"],
    ),
    FunctionSchema(
        name="search_evidence",
        description=(
            "Search the local Evidence library: spaceflight medicine papers, NASA hazard pages and mission reports "
            "(Mercury, Apollo 10, Skylab), spacewalk (EVA) effort and suit studies, and NASA facts on the planets "
            "(Hostile Environments). Use it for any medical, research, spacewalk, space environment or planet "
            "question, then answer from the passages and cite them "
            "by number, like [1]."
        ),
        properties={
            "query": {"type": "string", "description": "What to look for."},
            "k": {"type": "integer", "description": "How many passages, 1 to 5.", "minimum": 1, "maximum": 5},
        },
        required=["query"],
    ),
    FunctionSchema(
        name="share_record_with_assistant",
        description=(
            "Ask to see parts of a crew member's record yourself, only when the person asks you to read or share it. "
            "To show someone a record, use navigate instead. A person reviews exactly what will be shared and must "
            "approve it on screen or by saying \"confirm share\". Never claim it was shared before the result says so."
        ),
        properties={
            "callsign": CALLSIGN,
            "sections": {
                "type": "array",
                "items": {"type": "string", "enum": ["latest_vitals", "wellbeing"]},
            },
        },
        required=["sections"],
    ),
]

TOOL_NAMES = [s.name for s in SCHEMAS]

# Tools that wait for a person: keep them alive through interruptions (saying
# "confirm share" is itself speech) and give people time to decide.
HUMAN_CONFIRMED = {"log_vital", "share_record_with_assistant"}
# The browser gives up at 285 s (CONFIRM_TIMEOUT_MS in src/modules/assistant/tools/definitions.ts)
# and reports "declined", so this server timeout is only a backstop. Keep it the larger of the two.
CONFIRM_TIMEOUT_SECS = 300
DEFAULT_TIMEOUT_SECS = 30


def tools_schema() -> ToolsSchema:
    return ToolsSchema(standard_tools=SCHEMAS)


def openai_tools() -> list[dict]:
    """The same tools in OpenAI request format (used to pre-warm Ollama's prompt cache)."""
    return [{"type": "function", "function": s.to_default_dict()} for s in SCHEMAS]


# The exact phrase a person speaks to approve each waiting tool. The browser decides whether
# it counts (spoken only, never typed); see src/modules/assistant/tools/definitions.ts.
CONFIRM_PHRASES = {"confirm save": "log_vital", "confirm share": "share_record_with_assistant"}


def confirm_phrase_tool(text: str) -> str | None:
    """The tool a confirm phrase approves, or None if the text is not one."""
    words = re.sub(r"[.!?,;:]+", " ", text.lower())
    return CONFIRM_PHRASES.get(" ".join(words.split()))


class ClientToolBridge(FrameProcessor):
    """Catches tool results sent by the browser and hands them to the waiting handler.

    Also keeps a confirm phrase ("Confirm save", "Confirm share") from the LLM when it
    approves nothing, while a save or share waits. The model would otherwise answer that
    something was saved before the person's decision is known. Typed text arrives here and
    never approves; spoken text is checked by ConfirmPhraseGate after speech recognition.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._waiting: dict[str, asyncio.Future] = {}
        # Names of human-confirmed tools waiting for a person, one entry per call.
        self.confirmations: list[str] = []

    def holds_back(self, text: str, spoken: bool) -> bool:
        tool = confirm_phrase_tool(text)
        if not tool or not self.confirmations:
            return False
        # A spoken phrase that matches a waiting tool approves it in the browser, so the
        # model may answer it (the result arrives with it). Anything else approves nothing.
        return not (spoken and tool in self.confirmations)

    def expect(self, tool_call_id: str) -> asyncio.Future:
        fut = asyncio.get_running_loop().create_future()
        self._waiting[tool_call_id] = fut
        return fut

    def forget(self, tool_call_id: str) -> None:
        self._waiting.pop(tool_call_id, None)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if (
            isinstance(frame, FunctionCallResultFrame)
            and direction == FrameDirection.DOWNSTREAM
            and frame.tool_call_id in self._waiting
        ):
            fut = self._waiting.pop(frame.tool_call_id)
            if not fut.done():
                fut.set_result(frame.result)
            return  # the LLM service re-broadcasts the result properly
        if isinstance(frame, LLMMessagesAppendFrame) and self._typed_confirmation(frame):
            logger.debug("Kept a typed confirm phrase from the LLM while a confirmation waits")
            return
        await self.push_frame(frame, direction)

    def _typed_confirmation(self, frame: LLMMessagesAppendFrame) -> bool:
        messages = frame.messages
        if len(messages) != 1 or messages[0].get("role") != "user":
            return False
        content = messages[0].get("content")
        return isinstance(content, str) and self.holds_back(content, spoken=False)


class ConfirmPhraseGate(FrameProcessor):
    """Sits after speech recognition. Drops a spoken confirm phrase that approves nothing
    (such as "Confirm save" while only a share waits), so the LLM does not answer it."""

    def __init__(self, bridge: ClientToolBridge, **kwargs):
        super().__init__(**kwargs)
        self._bridge = bridge

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, (TranscriptionFrame, InterimTranscriptionFrame)) and self._bridge.holds_back(frame.text, spoken=True):
            return
        await self.push_frame(frame, direction)


def register_client_tools(llm: LLMService, bridge: ClientToolBridge) -> None:
    async def relay(params: FunctionCallParams):
        fut = bridge.expect(params.tool_call_id)
        confirmed = params.function_name in HUMAN_CONFIRMED
        if confirmed:
            bridge.confirmations.append(params.function_name)
        try:
            result: Any = await fut
        finally:
            bridge.forget(params.tool_call_id)
            if confirmed:
                bridge.confirmations.remove(params.function_name)
        logger.debug(f"Tool {params.function_name} returned from browser")
        await params.result_callback(result)

    for name in TOOL_NAMES:
        confirmed = name in HUMAN_CONFIRMED
        llm.register_function(
            name,
            relay,
            cancel_on_interruption=not confirmed,
            timeout_secs=CONFIRM_TIMEOUT_SECS if confirmed else DEFAULT_TIMEOUT_SECS,
        )
