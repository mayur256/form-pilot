import { DEFAULT_SERVER_URL } from "@job-autofill/shared";

export interface PanelSettings {
  serverUrl: string;
  token: string | undefined;
}

export async function loadPanelSettings(): Promise<PanelSettings> {
  const stored = await chrome.storage.local.get(["serverUrl", "token"]);
  return {
    serverUrl: typeof stored.serverUrl === "string" ? stored.serverUrl : DEFAULT_SERVER_URL,
    token: typeof stored.token === "string" && stored.token ? stored.token : undefined,
  };
}

export async function savePanelSettings(settings: PanelSettings): Promise<void> {
  await chrome.storage.local.set({ serverUrl: settings.serverUrl, token: settings.token ?? "" });
}
