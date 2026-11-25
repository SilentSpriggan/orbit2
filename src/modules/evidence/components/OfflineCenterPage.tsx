import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Button,
  Card,
  Dialog,
  StatusBadge,
  useToast,
} from "../../../shared/ui";
import { useSystemStatus } from "../../../shared/context/SystemStatusContext";
import {
  useDiagnostics,
  useNetworkInfo,
  usePageState,
  useRead,
} from "../hooks/useEvidence";
import { getStorage } from "../services/evidence";
import { downloadJson, ReadState, utc } from "./common";
import type { NetworkInfo } from "../types";

export function ConnectDeviceQr({ info }: { info: NetworkInfo }) {
  const [svg, setSvg] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setSvg("");
    setError("");
    void QRCode.toString(info.httpsUrl, {
      type: "svg",
      margin: 4,
      width: 200,
      errorCorrectionLevel: "M",
    })
      .then((value) => {
        if (active) setSvg(value);
      })
      .catch(() => {
        if (active) setError("QR generation failed. Use the URL above.");
      });
    return () => {
      active = false;
    };
  }, [info.httpsUrl]);
  return (
    <div className="space-y-3">
      {svg && (
        <div
          role="img"
          aria-label={`QR code for ${info.httpsUrl}`}
          className="inline-block bg-ink p-3 rounded-lg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      {error && <p role="alert">{error}</p>}
      <p className="text-sm text-ink-2">
        Join {info.ssid ?? "the local"} Wi-Fi → open the URL → trust the ORBIT
        local certificate (one time).
      </p>
      <a
        className="inline-flex min-h-11 items-center text-accent underline"
        href="/api/system/ca.crt"
        download
      >
        Download local CA certificate
      </a>
    </div>
  );
}
export function StorageCard() {
  const read = useRead(getStorage);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    void navigator.storage
      ?.estimate()
      .then((e) => setEstimate(e.usage ?? null))
      .catch(() => setEstimate(null));
  }, []);
  const clear = async () => {
    setPending(true);
    try {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (n) => n.startsWith("workbox-precache") || n.startsWith("orbit-"),
          )
          .map((n) => caches.delete(n)),
      );
      setConfirm(false);
      setEstimate(null);
      toast({
        title: "App cache cleared",
        description:
          "Reconnect and reload to restore offline availability. Server records and local notes are unaffected.",
      });
    } catch {
      toast({ level: "caution", title: "Could not clear browser cache" });
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-md font-semibold">Storage</h2>
      <ReadState
        loading={read.isLoading}
        error={read.error?.message}
        retry={read.refetch}
      />
      {read.data?.categories.map((c) => (
        <div key={c.name}>
          <div className="flex justify-between text-sm mb-2">
            <span>{c.name}</span>
            <span className="font-mono text-xs">
              {(c.bytes / 1e9).toFixed(2)} GB
            </span>
          </div>
          <progress
            aria-label={`${c.name} storage`}
            className="w-full h-1.5 accent-accent"
            value={c.bytes}
            max={read.data!.capacityBytes}
          />
        </div>
      ))}
      <p className="text-sm text-ink-2">
        Browser origin storage{" "}
        <span className="font-mono">
          {estimate === null
            ? "Unavailable"
            : `${(estimate / 1e6).toFixed(1)} MB`}
        </span>{" "}
        (includes cache and browser data)
      </p>
      <Button onClick={() => setConfirm(true)}>Clear browser cache</Button>
      <Dialog
        open={confirm}
        onClose={() => !pending && setConfirm(false)}
        title="Clear ORBIT browser cache?"
        description="This removes cached app files and model assets on this browser. Offline launch will be unavailable until you reconnect and reload. Health records on the server and local notes are unaffected."
        footer={
          <>
            <Button disabled={pending} onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => void clear()}
            >
              Clear app cache
            </Button>
          </>
        }
      />
    </Card>
  );
}
export function OfflineCenterPage() {
  const network = useNetworkInfo();
  const checks = useDiagnostics();
  const override = usePageState();
  const { status } = useSystemStatus();
  const [connect, setConnect] = useState(false);
  const mode = status?.network.mode;
  const level =
    mode === "unreachable"
      ? "critical"
      : mode === "cert_untrusted"
        ? "caution"
        : mode === "offline_local"
          ? "standby"
          : "nominal";
  const label =
    mode === "unreachable"
      ? "Local server unreachable"
      : mode === "cert_untrusted"
        ? "Certificate not trusted"
        : mode === "offline_local"
          ? "Offline · local only"
          : "Local HTTPS / LAN";
  const passed = checks.data?.filter((c) => c.level === "nominal").length ?? 0;
  const total = checks.data?.length ?? 0;
  if (override)
    return (
      <ReadState
        loading={override === "loading"}
        error={
          override === "error" ? "Demo error: diagnostics unavailable." : null
        }
        empty={override === "empty"}
      />
    );
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
      <div className="space-y-4">
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="text-md font-semibold">Local connection</h2>
            <StatusBadge level={level}>
              {status ? label : "Checking connection"}
            </StatusBadge>
          </div>
          <ReadState
            loading={network.isLoading}
            error={network.error?.message}
            retry={network.refetch}
          />
          {network.data && (
            <>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-sm">
                {[
                  ["HTTPS URL", network.data.httpsUrl],
                  ["LAN IP", network.data.lanIp ?? "Unavailable"],
                  ["Wi-Fi hotspot", network.data.ssid ?? "Unavailable"],
                  ["Connected devices", String(network.data.connectedDevices)],
                  [
                    "Certificate SHA-256",
                    network.data.certFingerprintSha256
                      ?.match(/.{1,4}/g)
                      ?.join(" ") ?? "Unavailable",
                  ],
                  ["Certificate expiry", utc(network.data.certExpiresAt)],
                  [
                    "Internet reachable",
                    network.data.internetReachable ? "Yes" : "No (expected)",
                  ],
                ].map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="text-ink-2">{key}</dt>
                    <dd className="font-mono text-xs break-words">{value}</dd>
                  </div>
                ))}
              </dl>
              <Button onClick={() => setConnect((v) => !v)}>
                {connect ? "Hide connection guide" : "Connect another device"}
              </Button>
              {connect && <ConnectDeviceQr info={network.data} />}
            </>
          )}
        </Card>
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-line space-y-3">
            <h2 className="text-md font-semibold">Offline readiness</h2>
            {checks.data && (
              <StatusBadge
                level={
                  passed === total
                    ? "nominal"
                    : checks.data.some((c) => c.level === "critical")
                      ? "critical"
                      : "caution"
                }
              >
                {passed === total ? "Offline ready" : "Readiness needs review"}{" "}
                · {passed} of {total} checks passed
              </StatusBadge>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                loading={checks.running}
                onClick={() => void checks.run()}
              >
                Run all checks
              </Button>
              <Button
                disabled={!checks.data}
                onClick={() =>
                  downloadJson("orbit-diagnostics.json", {
                    exportedAt: new Date().toISOString(),
                    checks: checks.data,
                  })
                }
              >
                Export diagnostics report
              </Button>
            </div>
            {checks.runError && (
              <p role="alert" className="text-caution">
                {checks.runError}
              </p>
            )}
          </div>
          <ReadState
            loading={checks.isLoading}
            error={checks.error?.message}
            retry={checks.refetch}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-raised text-xs text-ink-2">
                <tr>
                  <th className="text-left p-3">Check</th>
                  <th className="text-left p-3">Result / detail</th>
                  <th className="p-3">Re-run</th>
                </tr>
              </thead>
              <tbody>
                {checks.data?.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="p-3 align-top">{c.label}</td>
                    <td className="p-3 space-y-2">
                      <StatusBadge level={c.level}>
                        {c.level === "nominal"
                          ? "Passed"
                          : c.level === "caution"
                            ? "Review"
                            : c.level === "critical"
                              ? "Failed"
                              : "Not checked"}
                      </StatusBadge>
                      <p className="font-mono text-2xs break-words">
                        {c.detail}
                      </p>
                      <p className="font-mono text-2xs text-ink-3">
                        {utc(c.checkedAt)}
                      </p>
                    </td>
                    <td className="p-3">
                      <Button
                        disabled={checks.running}
                        aria-label={`Re-run ${c.label}`}
                        onClick={() => void checks.run(c.id)}
                      >
                        Re-run
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <aside className="space-y-4">
        <Card className="p-5 space-y-3">
          <h2 className="text-md font-semibold">Local model & index</h2>
          <p className="font-mono text-xs">
            {status?.ollama.model ?? "Model unknown"}
          </p>
          <StatusBadge
            level={status?.ollama.state === "ready" ? "nominal" : "standby"}
          >
            {status?.ollama.state ?? "Unknown"}
          </StatusBadge>
          <p className="font-mono text-xs">
            Index: {status?.faiss.state ?? "Unknown"} ·{" "}
            {status?.faiss.documentCount ?? "—"} documents ·{" "}
            {status?.faiss.chunkCount ?? "—"} passages
          </p>
          <p className="text-sm text-ink-2">
            Search uses the local server. The cached app shell can open even
            when that server is unreachable.
          </p>
        </Card>
        <StorageCard />
      </aside>
    </div>
  );
}
