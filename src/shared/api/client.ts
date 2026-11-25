import type { ApiError } from "../types";

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";
const DEFAULT_TIMEOUT_MS = 8000;

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export function isApiError(e: unknown): e is ApiError {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof (e as ApiError).status === "number" &&
    typeof (e as ApiError).code === "string" &&
    typeof (e as ApiError).message === "string"
  );
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

/** Normalize anything thrown into an ApiError. */
export function toApiError(e: unknown): ApiError {
  if (isApiError(e)) return e;
  if (e instanceof DOMException && e.name === "TimeoutError") {
    return { status: 0, code: "timeout", message: "The local server did not answer in time." };
  }
  if (e instanceof Error) return { status: 0, code: "network", message: e.message };
  return { status: 0, code: "unknown", message: "Unknown error" };
}

/** Combine a caller signal with a timeout. */
function linkSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  const ctrl = new AbortController();
  let timedOut = false;
  let timer: number | undefined = window.setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: ctrl.signal,
    timedOut: () => timedOut,
    /** Stop the timeout but keep the caller's abort linked (used by apiStream once a stream is open). */
    clearTimer: () => {
      window.clearTimeout(timer);
      timer = undefined;
    },
    cleanup: () => {
      window.clearTimeout(timer);
      timer = undefined;
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

async function errorFromResponse(res: Response): Promise<ApiError> {
  let code = `http_${res.status}`;
  let message = res.statusText || "Request failed";
  try {
    const body: unknown = await res.json();
    if (typeof body === "object" && body !== null) {
      const b = body as { code?: unknown; message?: unknown; detail?: unknown };
      if (typeof b.code === "string") code = b.code;
      if (typeof b.message === "string") message = b.message;
      else if (typeof b.detail === "string") message = b.detail;
    }
  } catch {
    /* non-JSON error body */
  }
  return { status: res.status, code, message };
}

function rethrow(e: unknown, timedOut: boolean): never {
  if (timedOut) throw toApiError(new DOMException("Timed out", "TimeoutError"));
  if (isAbortError(e)) throw e;
  throw toApiError(e);
}

async function request<T>(method: string, path: string, body: unknown, opts: RequestOptions): Promise<T> {
  const link = linkSignal(opts.signal, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
    if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      // Module 4: multipart document imports retain the browser-generated boundary.
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: link.signal,
      credentials: "same-origin",
    });
    if (!res.ok) throw await errorFromResponse(res);
    if (res.status === 204) return undefined as T;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("application/json")) return (await res.json()) as T;
    return (await res.blob()) as T;
  } catch (e) {
    rethrow(e, link.timedOut());
  } finally {
    link.cleanup();
  }
}

export function apiGet<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return request<T>("GET", path, undefined, opts);
}

/** No retries on POST/PUT/PATCH/DELETE. */
export function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  return request<T>(method, path, body, opts);
}

/*
 * DO NOT DELETE apiStream, even if nothing imports it yet.
 *
 * It is part of the shared API contract that every ORBIT module is built
 * against (Shared Foundation, section J: "apiGet, apiSend, apiStream"). The
 * four modules are built separately and expect this file to match that spec;
 * removing it breaks modules that are not in this repo yet, notably the
 * Evidence library, which streams model answers over Server-Sent Events.
 * "Unused" here means "not built yet", not "dead code".
 */

export interface StreamEvent {
  event: string;
  data: string;
  id?: string;
}

/**
 * Server-Sent Events over fetch (POST-capable). The timeout covers the time
 * to first byte only; once the stream is open it runs until done or aborted.
 */
export async function apiStream(
  path: string,
  body: unknown,
  onEvent: (e: StreamEvent) => void,
  opts: RequestOptions & { method?: "GET" | "POST" } = {},
): Promise<void> {
  const link = linkSignal(opts.signal, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: opts.method === "GET" ? undefined : JSON.stringify(body ?? {}),
      signal: link.signal,
      credentials: "same-origin",
    });
    if (!res.ok) throw await errorFromResponse(res);
    link.clearTimer();
    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";
    let current: StreamEvent = { event: "message", data: "" };
    let hasData = false;
    const flush = () => {
      if (hasData) onEvent({ ...current, data: current.data.replace(/\n$/, "") });
      current = { event: "message", data: "" };
      hasData = false;
    };
    const handleLine = (line: string) => {
      if (line === "") return flush();
      if (line.startsWith(":")) return;
      const idx = line.indexOf(":");
      const field = idx === -1 ? line : line.slice(0, idx);
      const val = idx === -1 ? "" : line.slice(idx + 1).replace(/^ /, "");
      if (field === "event") current.event = val;
      else if (field === "data") {
        current.data += `${val}\n`;
        hasData = true;
      } else if (field === "id") current.id = val;
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl = buffer.indexOf("\n");
      while (nl >= 0) {
        handleLine(buffer.slice(0, nl).replace(/\r$/, ""));
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf("\n");
      }
    }
    if (buffer) handleLine(buffer.replace(/\r$/, ""));
    flush();
  } catch (e) {
    rethrow(e, link.timedOut());
  } finally {
    link.cleanup();
  }
}
