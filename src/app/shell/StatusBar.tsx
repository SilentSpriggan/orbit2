import { Cpu, Database, Lock, Menu, ServerCrash, ShieldAlert, WifiOff, type LucideIcon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSystemStatus } from "../../shared/context/SystemStatusContext";
import { formatCount, formatUtcDate, formatUtcDateTime } from "../../shared/format";
import type { NetworkMode, StatusLevel, SystemStatus } from "../../shared/types";
import { CrewSelector } from "./CrewSelector";
import { SECTION_LABEL, currentSection } from "./section";
import { StatusChip } from "./StatusChip";

const NETWORK: Record<NetworkMode, { level: StatusLevel; icon: LucideIcon; text: string }> = {
  https_lan: { level: "nominal", icon: Lock, text: "Local HTTPS" },
  offline_local: { level: "standby", icon: WifiOff, text: "Offline · local only" },
  cert_untrusted: { level: "caution", icon: ShieldAlert, text: "Certificate not trusted" },
  unreachable: { level: "critical", icon: ServerCrash, text: "Local server unreachable" },
};

function NetworkChip({ network }: { network: SystemStatus["network"] }) {
  const n = NETWORK[network.mode];
  return (
    <StatusChip
      level={n.level}
      icon={n.icon}
      text={n.text}
      title="Network"
      details={[
        ["State", n.text],
        ["Host", network.host],
        ["LAN IP", network.lanIp ?? "—"],
        ["SSID", network.ssid ?? "—"],
        ["Certificate expires", network.certExpiresAt ? formatUtcDate(network.certExpiresAt) : "—"],
      ]}
    >
      {n.text}
      {network.mode === "https_lan" && <span className="font-mono font-normal text-ink-2">{network.host}</span>}
    </StatusChip>
  );
}

function ModelChip({ ollama }: { ollama: SystemStatus["ollama"] }) {
  const level: StatusLevel = ollama.state === "ready" ? "nominal" : ollama.state === "loading" ? "caution" : "critical";
  const stateText =
    ollama.state === "ready" ? "Ready" : ollama.state === "loading" ? `Loading ${ollama.loadProgress ?? 0}%` : "Model unavailable";
  const text = ollama.state === "unavailable" ? "Model unavailable" : ollama.model;
  return (
    <StatusChip
      level={level}
      icon={Cpu}
      text={ollama.state === "loading" ? `${ollama.model} · ${ollama.loadProgress ?? 0}%` : text}
      title="Local model"
      details={[
        ["Model", ollama.model],
        ["State", stateText],
        ["Runtime", "Ollama · local"],
      ]}
    >
      {ollama.state === "unavailable" ? (
        "Model unavailable"
      ) : (
        <span className="font-mono">
          {ollama.model}
          {ollama.state === "loading" && <span className="tabular-nums">{` ·  ${ollama.loadProgress ?? 0}%`}</span>}
        </span>
      )}
    </StatusChip>
  );
}

function IndexChip({ faiss }: { faiss: SystemStatus["faiss"] }) {
  const level: StatusLevel = faiss.state === "ready" ? "nominal" : faiss.state === "building" ? "caution" : "critical";
  const text =
    faiss.state === "missing"
      ? "Index missing"
      : faiss.state === "building"
        ? `FAISS building ${faiss.buildProgress ?? 0}%`
        : `FAISS ${formatCount(faiss.chunkCount)} chunks`;
  return (
    <StatusChip
      level={level}
      icon={Database}
      text={text}
      title="Evidence index"
      details={[
        ["State", faiss.state === "ready" ? "Ready" : faiss.state === "building" ? `Building ${faiss.buildProgress ?? 0}%` : "Index missing"],
        ["Documents", formatCount(faiss.documentCount)],
        ["Chunks", formatCount(faiss.chunkCount)],
        ["Last indexed", faiss.updatedAt ? formatUtcDateTime(faiss.updatedAt) : "—"],
      ]}
    >
      {faiss.state === "missing" ? (
        "Index missing"
      ) : (
        <>
          FAISS
          <span className="font-mono tabular-nums">
            {faiss.state === "building" ? `${faiss.buildProgress ?? 0}%` : `${formatCount(faiss.chunkCount)} chunks`}
          </span>
        </>
      )}
    </StatusChip>
  );
}

export function StatusBar({ navigationOpen, onToggleNav }: { navigationOpen: boolean; onToggleNav: () => void }) {
  const { status } = useSystemStatus();
  const label = SECTION_LABEL[currentSection(useLocation().pathname)];
  const ready = status?.ollama.state === "ready" && status.network.mode !== "unreachable";
  return (
    <header className="orbit-topbar">
      <button className="orbit-menu-button" type="button" aria-label="Toggle navigation" aria-expanded={navigationOpen} aria-controls="orbit-navigation" onClick={onToggleNav}><Menu size={20} /></button>
      <div className="orbit-location"><span>Mission control</span><b aria-hidden="true">/</b> {label}</div>
      <div className="orbit-topbar-actions">
        <details className="orbit-system-status">
          <summary><span aria-hidden="true" className={ready ? "text-nominal" : "text-ink-2"}>&#9679;</span>{ready ? "Ready" : "System status"}</summary>
          <div aria-label="Local system status">
            {status ? <><NetworkChip network={status.network} /><ModelChip ollama={status.ollama} /><IndexChip faiss={status.faiss} /></> : <p className="text-sm text-ink-2">Checking local services…</p>}
          </div>
        </details>
        <CrewSelector />
      </div>
    </header>
  );
}
