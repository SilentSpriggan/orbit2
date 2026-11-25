export const MOCK_MODE = import.meta.env.VITE_USE_MOCKS === "true";

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * Every service function goes through this. In mock mode the mock result is
 * returned after a simulated latency; otherwise the real request runs.
 */
export async function withMock<T>(
  real: () => Promise<T>,
  mock: () => Promise<T> | T,
  latencyMs = 250,
  signal?: AbortSignal,
): Promise<T> {
  if (!MOCK_MODE) return real();
  await delay(latencyMs, signal);
  return mock();
}
