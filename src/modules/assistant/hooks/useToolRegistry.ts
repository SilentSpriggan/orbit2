import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useCrew } from "../../../shared/context/CrewContext";
import { useToast } from "../../../shared/ui/Toast";
import { formatUtcTime } from "../../../shared/format";
import { EMBEDDED, notifyWebsite, requestWebsite, WEBSITE_FORMS, WEBSITE_PAGES, websiteTab } from "../../../shared/embed";
import type { CrewMember } from "../../../shared/types";
import {
  clearAssistantContext,
  getCrewSummary,
  logVital,
  searchEvidence,
  shareRecordWithAssistant,
  VITAL_META,
} from "../services/toolServices";
import { CONFIRM_TIMEOUT_MS, isVoiceSaveApproval, isVoiceShareApproval, isToolName, TOOL_DEFINITIONS } from "../tools/definitions";
import type { Citation, ToolHandler, ToolOutcome } from "../types";

import {
  buildSharePreview, parseVitalDraft, readString, readNumber, summarizeCrew, SHARE_SECTIONS,
  type ShareConfirmation, type VitalConfirmation, type ShareSection,
} from "../tools/inputs";
export type { ShareConfirmation, VitalConfirmation, ShareSection } from "../tools/inputs";
export { WELLBEING_NEUTRAL } from "../tools/inputs";

const DISABLED_KEY = "orbit.assistant.disabledTools";
export type Confirmation = VitalConfirmation | ShareConfirmation;
export type DecisionVia = "button" | "voice";
interface Decision {
  approve: boolean;
  via: DecisionVia | "cancelled" | "timeout";
}

export interface SharedContextEntry {
  sessionId: string;
  crewId: string;
  callsign: string;
  sections: ShareSection[];
  sharedAt: string;
}

function readDisabled(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISABLED_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeDisabled(disabled: Set<string>) {
  try {
    window.localStorage.setItem(DISABLED_KEY, JSON.stringify(Array.from(disabled)));
  } catch {
    /* storage unavailable */
  }
}

function notApproved(via: Decision["via"], byPerson: string, verb: "saved" | "shared"): string {
  if (via === "timeout") return `No one confirmed within ${Math.round(CONFIRM_TIMEOUT_MS / 60_000)} minutes. Nothing was ${verb}.`;
  if (via === "cancelled") return `Cancelled before anyone confirmed. Nothing was ${verb}.`;
  return `${byPerson}. Nothing was ${verb}.`;
}

/** A compact list of an open form's fields for the model: name (label, unit, range or choices). */
function describeFields(fields: unknown): string {
  if (!fields || typeof fields !== "object") return "";
  return Object.entries(fields as Record<string, { label?: string; type?: string; unit?: string; min?: number; max?: number; options?: string[] }>)
    .map(([name, f]) => {
      const detail = [f.label && f.label !== name ? f.label : "", f.unit ?? "", Number.isFinite(f.min) && Number.isFinite(f.max) ? `${f.min}-${f.max}` : "", f.options?.length ? `one of ${f.options.join("/")}` : "", f.type && !["number", "text", "choice", "radio"].includes(f.type) ? f.type : ""]
        .filter(Boolean)
        .join(", ");
      return detail ? `${name} (${detail})` : name;
    })
    .join("; ");
}

const ALLOWED_ROUTES = ["crew", "anatomy", "assistant", "evidence"];
const ANATOMY_ACTIONS = ["select_region", "focus_region", "reset_view", "rotate", "toggle_layer"];

const ok = (resultSummary: string, result: Record<string, unknown> = {}, citations?: Citation[]): ToolOutcome => ({
  status: "succeeded",
  resultSummary,
  result,
  citations,
});
const fail = (error: string): ToolOutcome => ({ status: "failed", error, result: { error } });
const declined = (reason: string): ToolOutcome => ({ status: "declined", error: reason, result: { declined: true, reason } });

/**
 * Client-side tool handlers. Each is wrapped with the enable switch and, for
 * write/share tools, a human confirmation gate the model cannot pass itself.
 */
export function useToolRegistry() {
  const { toast } = useToast();
  const { activeCrew, crew, getCrew } = useCrew();
  const location = useLocation();
  const [disabled, setDisabled] = useState<Set<string>>(readDisabled);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [sharedContext, setSharedContext] = useState<SharedContextEntry[]>([]);

  const waiters = useRef(new Map<string, (d: Decision) => void>());
  /** Drafted readings waiting for a person, as "crew|kind|value". */
  const pendingVitals = useRef(new Set<string>());
  const live = useRef({ activeCrew, crew, getCrew, location, disabled });
  live.current = { activeCrew, crew, getCrew, location, disabled };

  const resolveCrew = useCallback((args: Record<string, unknown>): CrewMember | null => {
    const { crew: list, getCrew: byId } = live.current;
    const id = readString(args.crew_id) ?? readString(args.crewId);
    if (id) return byId(id) ?? null;
    // The model may give a callsign ("COOPER"), a full name ("Gordon Cooper") or a surname.
    const said = (readString(args.callsign) ?? readString(args.name))?.trim().toUpperCase();
    if (!said) return null;
    return (
      list.find((c) => c.callsign === said || c.fullName.toUpperCase() === said) ??
      list.find((c) => c.fullName.toUpperCase().split(" ").at(-1) === said) ??
      null
    );
  }, []);

  const waitFor = useCallback((req: Confirmation, signal: AbortSignal): Promise<Decision> => {
    setConfirmations((list) => [...list.filter((c) => c.callId !== req.callId), req]);
    return new Promise<Decision>((resolve) => {
      const cancel = () => done({ approve: false, via: "cancelled" });
      // Give up before the server's own timeout, so the model is told "declined"
      // and no Save button is left that would still store data afterwards.
      const timer = window.setTimeout(() => done({ approve: false, via: "timeout" }), CONFIRM_TIMEOUT_MS);
      const done = (d: Decision) => {
        window.clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
        waiters.current.delete(req.callId);
        setConfirmations((list) => list.filter((c) => c.callId !== req.callId));
        resolve(d);
      };
      waiters.current.set(req.callId, done);
      if (signal.aborted) done({ approve: false, via: "cancelled" });
      else signal.addEventListener("abort", cancel, { once: true });
    });
  }, []);

  /** Only a person can call this: from a button, or from their own spoken words. */
  const resolveConfirmation = useCallback((callId: string, approve: boolean, via: DecisionVia) => {
    waiters.current.get(callId)?.({ approve, via });
  }, []);

  const handleTool: ToolHandler = useCallback(
    async (call, update, signal, context) => {
      const name = call.name;
      const { activeCrew: viewer, location: currentLocation, disabled: disabledTools } = live.current;
      if (!isToolName(name)) return fail(`Unknown tool: ${call.name}`);
      if (disabledTools.has(name)) return declined("This tool is turned off on this device.");
      if (!viewer) return fail("No crew member is selected on this device.");
      const args = call.args;

      switch (name) {
        case "get_current_context": {
          update({ status: "running" });
          const params = new URLSearchParams(currentLocation.search);
          const result = {
            route: `${currentLocation.pathname}${currentLocation.search}`,
            viewingAs: { id: viewer.id, callsign: viewer.callsign, role: viewer.role },
            selectedCrew: params.get("crew"),
            selectedAnatomyRegion: params.get("region"),
          };
          return ok(`Route ${result.route} · viewing as ${viewer.callsign}`, result);
        }

        case "get_crew_summary": {
          const subject = resolveCrew(args) ?? viewer;
          update({ status: "running" });
          const summary = await getCrewSummary(subject.id, signal);
          const result = summarizeCrew(subject, summary, viewer);
          return ok(result.text, { crewId: subject.id, callsign: subject.callsign, readings: result.readings, wellbeing: result.wellbeing });
        }

        case "log_vital": {
          const subject = resolveCrew(args);
          if (!subject) return fail("Say who the reading is for (crew callsign).");
          const parsed = parseVitalDraft(args, subject.id);
          if (!parsed.draft) return fail(parsed.error);
          const draft = parsed.draft;
          const { kind, value } = draft;
          const meta = VITAL_META[kind];
          // The model sometimes drafts the same reading again while the first waits. One
          // "Confirm save" per draft would then save it twice, so refuse the repeat.
          const draftKey = `${subject.id}|${kind}|${value}`;
          if (pendingVitals.current.has(draftKey)) {
            return fail(`That ${meta.label} reading is already waiting for a person to confirm. Do not draft it again.`);
          }
          pendingVitals.current.add(draftKey);
          let decision: Decision;
          try {
            update({ status: "awaiting_confirmation" });
            decision = await waitFor(
              { kind: "vital", callId: call.id, crew: subject, draft, question: `Save ${meta.label} ${value} ${meta.unit} for ${subject.callsign}?` },
              signal,
            );
          } finally {
            pendingVitals.current.delete(draftKey);
          }
          if (!decision.approve) {
            return declined(notApproved(decision.via, "Discarded by a person", "saved"));
          }
          update({ status: "running" });
          const saved = await logVital(draft, signal);
          // Inside the website, also add it to the website's Health log (kept in that page's browser storage).
          notifyWebsite({ type: "orbit:vital-saved", id: saved.id, crewId: subject.id, kind, value, recordedAt: saved.recordedAt });
          return ok(`Saved ${meta.label} ${value} ${meta.unit} for ${subject.callsign} at ${formatUtcTime(saved.recordedAt)} · ${decision.via === "voice" ? "approved by voice" : "approved on screen"}`, {
            id: saved.id,
            recordedAt: saved.recordedAt,
          });
        }

        case "navigate": {
          const path = readString(args.path) ?? readString(args.route);
          if (!path || !path.startsWith("/") || path.startsWith("//")) return fail("Navigation needs a path inside this console.");
          const first = path.slice(1).split(/[/?#]/)[0];
          const websitePage = EMBEDDED && Object.hasOwn(WEBSITE_PAGES, first);
          if (!ALLOWED_ROUTES.includes(first) && !websitePage) {
            return fail(Object.hasOwn(WEBSITE_PAGES, first) ? `${WEBSITE_PAGES[first]} is only on the website.` : `No screen at ${path}.`);
          }
          update({ status: "running" });
          setPendingNavigation(path);
          // Name the screen that actually opens, so the reply cannot claim a different one.
          const crewAsked = new URLSearchParams(path.split("?")[1] ?? "").get("crew");
          const label = (EMBEDDED ? WEBSITE_PAGES[websiteTab(path)] : path) + (crewAsked ? ` for ${crewAsked}` : "");
          return ok(`Opening ${label}`, { path, screen: label });
        }

        case "open_form": {
          const form = readString(args.form);
          if (!form || !(WEBSITE_FORMS as readonly string[]).includes(form)) return fail(`Unknown form: ${form ?? "none"}.`);
          if (!EMBEDDED) return fail("Forms open only inside the ORBIT website.");
          update({ status: "running" });
          // "me" is the person talking: the crew member this console is viewing as.
          const asked = readString(args.crew);
          const crew = asked && /^(me|myself|my|i|self)$/i.test(asked.trim()) ? viewer.fullName : asked;
          const reply = await requestWebsite({ type: "orbit:open-form", form, crew: crew ?? undefined });
          if (!reply.ok) return fail(reply.reason ?? "The form did not open.");
          // Opening is all it does: say so, so the reply does not claim anything was saved.
          const fields = describeFields(reply.fields);
          return ok(
            `Opened the ${String(reply.title)} form for ${String(reply.crew)}. Call it that. Nothing is saved until the person presses Save.` +
              (fields ? ` You can fill it with fill_form. Fields: ${fields}` : ""),
            { form, crew: reply.crew, fields: reply.fields },
          );
        }

        case "fill_form": {
          if (!EMBEDDED) return fail("Forms open only inside the ORBIT website.");
          const values = args.values;
          if (!values || typeof values !== "object" || Array.isArray(values)) return fail("Give values as field names and values.");
          update({ status: "running" });
          const reply = await requestWebsite({ type: "orbit:fill-form", values });
          const filled = Array.isArray(reply.filled) ? (reply.filled as string[]) : [];
          const rejected = Array.isArray(reply.rejected) ? (reply.rejected as { field: string; reason: string }[]) : [];
          const problems = rejected.map((r) => `${r.field}: ${r.reason}`).join("; ");
          if (!reply.ok) {
            const fields = describeFields(reply.fields);
            return fail(`${reply.reason ?? "Nothing was filled in."}${problems ? ` ${problems}` : ""}${fields ? ` Fields: ${fields}` : ""}`);
          }
          // Filling is not saving: say so, so the reply does not claim the reading was logged.
          return ok(
            `Filled in ${filled.join(", ")} on the ${String(reply.form)} form. Not saved yet: the person checks it and presses Save. ` +
              `Say it is filled in and ready to save; never say it was updated, logged or saved.` +
              (problems ? ` Not filled: ${problems}` : ""),
            { filled, rejected },
          );
        }

        case "control_anatomy": {
          const action = readString(args.action);
          if (!action || !ANATOMY_ACTIONS.includes(action)) return fail(`Unknown anatomy action: ${action ?? "none"}.`);
          update({ status: "running" });
          const detail = { ...args, action, source: "assistant" };
          window.dispatchEvent(new CustomEvent("orbit:anatomy", { detail }));
          const region = readString(args.region);
          return ok(`Sent ${action}${region ? ` · ${region}` : ""} to the Anatomy lab`, { dispatched: true });
        }

        case "search_evidence": {
          const query = readString(args.query);
          if (!query) return fail("Search needs a query.");
          const k = Math.min(5, Math.max(1, readNumber(args.k) ?? 3));
          update({ status: "running" });
          const chunks = await searchEvidence(query, k, signal);
          const citations: Citation[] = chunks.map((c, i) => ({
            marker: i + 1,
            documentId: c.documentId,
            chunkId: c.chunkId,
            title: c.title,
            excerpt: c.excerpt,
          }));
          return ok(
            chunks.length ? `${chunks.length} cited passage${chunks.length === 1 ? "" : "s"} from the Evidence library` : "No passages matched",
            { passages: citations.map((c) => ({ marker: c.marker, title: c.title, excerpt: c.excerpt })) },
            citations,
          );
        }

        case "share_record_with_assistant": {
          // Shared records belong to one voice session; without one there is nothing to share with.
          const sessionId = context.sessionId;
          if (!sessionId) return fail("Sharing needs an active voice session.");
          const subject = resolveCrew(args) ?? viewer;
          const summary = await getCrewSummary(subject.id, signal);
          const { sections, content, rows, withheld } = buildSharePreview(args.sections, subject, viewer, summary);
          if (!rows.length) return fail("There is nothing that can be shared for that request.");
          update({ status: "awaiting_confirmation" });
          const decision = await waitFor(
            { kind: "share", callId: call.id, crew: subject, sections, content, rows, withheld },
            signal,
          );
          if (!decision.approve) {
            return declined(notApproved(decision.via, "Declined by a person", "shared"));
          }
          update({ status: "running" });
          const res = await shareRecordWithAssistant({ sessionId, crewId: subject.id, sections, content }, signal);
          setSharedContext((list) => [...list, { sessionId, crewId: subject.id, callsign: subject.callsign, sections, sharedAt: res.sharedAt }]);
          const how = decision.via === "voice" ? "approved by voice" : "approved on screen";
          return ok(`Shared ${sections.map((x) => SHARE_SECTIONS[x].toLowerCase()).join(" and ")} for ${subject.callsign} · ${how}`, {
            shared: content,
          });
        }
      }
    },
    [resolveCrew, waitFor],
  );

  const confirmationsRef = useRef(confirmations);
  confirmationsRef.current = confirmations;

  /**
   * Voice approval: only the exact phrase, only from a final user voice transcript.
   * "Confirm share" approves the pending share; "Confirm save" approves the oldest
   * pending reading, one per phrase.
   */
  const approveByVoice = useCallback(
    (text: string): boolean => {
      const kind = isVoiceShareApproval(text) ? "share" : isVoiceSaveApproval(text) ? "vital" : null;
      if (!kind) return false;
      const pending = confirmationsRef.current.find((c) => c.kind === kind);
      if (!pending) return false;
      resolveConfirmation(pending.callId, true, "voice");
      return true;
    },
    [resolveConfirmation],
  );

  const declineAll = useCallback(() => {
    for (const done of Array.from(waiters.current.values())) done({ approve: false, via: "cancelled" });
  }, []);

  const sharedRef = useRef(sharedContext);
  sharedRef.current = sharedContext;

  const clearShared = useCallback(async () => {
    const sessions = Array.from(new Set(sharedRef.current.map((e) => e.sessionId)));
    try {
      await Promise.all(sessions.map((id) => clearAssistantContext(id)));
      setSharedContext([]);
    } catch {
      toast({
        level: "caution",
        title: "Shared context could not be removed",
        description: "The server may still have the shared records. Try removing them again.",
      });
    }
  }, [toast]);

  const setToolEnabled = useCallback((name: string, on: boolean) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (on) next.delete(name);
      else next.add(name);
      writeDisabled(next);
      return next;
    });
  }, []);

  const consumeNavigation = useCallback(() => setPendingNavigation(null), []);

  useEffect(() => () => declineAll(), [declineAll]);

  const tools = useMemo(() => TOOL_DEFINITIONS.map((t) => ({ ...t, enabled: !disabled.has(t.name) })), [disabled]);

  return {
    handleTool,
    tools,
    setToolEnabled,
    confirmations,
    resolveConfirmation,
    approveByVoice,
    declineAll,
    pendingNavigation,
    consumeNavigation,
    sharedContext,
    clearShared,
  };
}

export type ToolRegistry = ReturnType<typeof useToolRegistry>;
