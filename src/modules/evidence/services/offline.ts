import { registerSW } from "virtual:pwa-register";

export const UPDATE_EVENT = "orbit:offline-update";
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined;
let updateReady = false;
export const hasOfflineUpdate = () => updateReady;
export const reloadOfflineUpdate = () => applyUpdate?.(true);
export function registerOfflineApp() {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
      window.dispatchEvent(new Event(UPDATE_EVENT));
    },
    onRegisterError(error: unknown) {
      console.warn("ORBIT offline registration failed", error);
    },
  });
}
