/**
 * Build-time stand-in for @daily-co/daily-js.
 *
 * @pipecat-ai/small-webrtc-transport imports daily-js for its default
 * DailyMediaManager, which loads call-machine code from Daily's CDN. ORBIT
 * passes its own local media manager, so daily-js is never needed; aliasing
 * it here keeps that code (and any chance of a CDN request) out of the bundle.
 */
const unavailable = (): never => {
  throw new Error("daily-js is not bundled in ORBIT: use the local media manager.");
};

const DailyStub = {
  getCallInstance: (): null => null,
  createCallObject: unavailable,
  createFrame: unavailable,
};

export default DailyStub;
