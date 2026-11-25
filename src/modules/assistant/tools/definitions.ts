import type { ToolPermission } from "../types";

export type ToolName =
  | "get_current_context"
  | "get_crew_summary"
  | "log_vital"
  | "navigate"
  | "open_form"
  | "fill_form"
  | "control_anatomy"
  | "search_evidence"
  | "share_record_with_assistant";

export interface ToolDefinition {
  name: ToolName;
  permission: ToolPermission;
  description: string;
}

/** Tools the agent can call. All run in the browser through the Pipecat client. */
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  { name: "get_current_context", permission: "read", description: "Current route, selected crew member and selected anatomy region." },
  { name: "get_crew_summary", permission: "read", description: "The selected crew member's latest readings. Wellbeing detail follows the visibility rule." },
  { name: "log_vital", permission: "write", description: "Drafts a reading. A person must press Save before anything is stored." },
  { name: "navigate", permission: "read", description: "Opens a screen in this console, such as a crew record or an anatomy region." },
  { name: "open_form", permission: "read", description: "Opens a website form to log or report something (health check, workout, skin check, report…). A person fills it in and saves." },
  { name: "fill_form", permission: "write", description: "Types values into the form open on screen. Nothing is saved until a person checks the form and presses Save." },
  { name: "control_anatomy", permission: "read", description: "Sends view actions to the Anatomy lab (select, focus, reset)." },
  { name: "search_evidence", permission: "read", description: "Searches the local Evidence library and returns cited passages." },
  { name: "share_record_with_assistant", permission: "share", description: "Shares a crew record with the assistant after a person reviews it and confirms." },
] as const;

export const CLIENT_TOOL_NAMES: readonly ToolName[] = TOOL_DEFINITIONS.map((t) => t.name);

export function toolPermission(name: string): ToolPermission {
  return TOOL_DEFINITIONS.find((t) => t.name === name)?.permission ?? "read";
}

export function isToolName(name: string): name is ToolName {
  return TOOL_DEFINITIONS.some((t) => t.name === name);
}

/**
 * How long a write/share confirmation waits for a person. Kept shorter than the
 * server's CONFIRM_TIMEOUT_SECS (300 s, server/orbit_server/tools.py) so the
 * browser always gives up first and reports "declined" to the model, instead of
 * leaving a Save button that still works after the model was told it timed out.
 */
export const CONFIRM_TIMEOUT_MS = 285_000;

/** The exact phrase a person must speak to approve a share by voice. */
export const VOICE_SHARE_PHRASE = "confirm share";

/** The exact phrase a person must speak to save a drafted reading by voice. */
export const VOICE_SAVE_PHRASE = "confirm save";

/** Speech recognition may add punctuation ("Confirm, save."); compare the words only. */
function spokenWords(text: string): string {
  return text.toLowerCase().replace(/[.!?,;:]+/g, " ").replace(/\s+/g, " ").trim();
}

export function isVoiceShareApproval(text: string): boolean {
  return spokenWords(text) === VOICE_SHARE_PHRASE;
}

export function isVoiceSaveApproval(text: string): boolean {
  return spokenWords(text) === VOICE_SAVE_PHRASE;
}
