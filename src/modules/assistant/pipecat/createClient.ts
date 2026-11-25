import { LogLevel, PipecatClient, type RTVIEventCallbacks } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport, type SmallWebRTCTransportConstructorOptions } from "@pipecat-ai/small-webrtc-transport";
import { API_BASE } from "../../../shared/api/client";
import { LocalMediaManager } from "./localMediaManager";

/** Signaling endpoint on the local FastAPI server (same origin). */
export const OFFER_PATH = "/api/voice/offer";

export interface CreatedClient {
  client: PipecatClient;
  transport: SmallWebRTCTransport;
  media: LocalMediaManager;
  /** The transport's current RTCPeerConnection (not part of its public typings). */
  peerConnection(): RTCPeerConnection | null;
  /** The server's id for this WebRTC session (pc_id from the SDP answer). */
  sessionId(): string | null;
}

/**
 * Build a PipecatClient on SmallWebRTC with:
 * - signaling POSTed to /api/voice/offer on the same origin,
 * - no ICE servers (host candidates only; the network is local),
 * - a local-only media manager (no daily-js / CDN code).
 */
export function createClient(callbacks: RTVIEventCallbacks = {}): CreatedClient {
  const media = new LocalMediaManager();
  const transportOptions: SmallWebRTCTransportConstructorOptions = {
    iceServers: [],
    webrtcRequestParams: { endpoint: `${API_BASE}${OFFER_PATH}` },
    // The option is typed against @pipecat-ai/transport-lib's MediaManager,
    // which is not published separately; LocalMediaManager implements it.
    mediaManager: media as unknown as SmallWebRTCTransportConstructorOptions["mediaManager"],
  };
  const transport = new SmallWebRTCTransport(transportOptions);
  const client = new PipecatClient({
    transport,
    enableMic: true,
    enableCam: false,
    enableScreenShare: false,
    callbacks,
  });
  client.setLogLevel(import.meta.env.DEV ? LogLevel.WARN : LogLevel.ERROR);

  const peerConnection = () => (transport as unknown as { pc: RTCPeerConnection | null }).pc ?? null;

  media.onLocalTrackReplaced = async (track) => {
    const sender = peerConnection()?.getTransceivers()[0]?.sender;
    if (sender) await sender.replaceTrack(track);
  };

  const sessionId = () => (transport as unknown as { pc_id: string | null }).pc_id ?? null;

  return { client, transport, media, peerConnection, sessionId };
}
