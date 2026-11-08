import { useCallback, useEffect, useState } from "react";
import { checkHealth, type ServerStatus } from "../../src/server-status";
import { loadPanelSettings, savePanelSettings, type PanelSettings } from "../../src/storage";

const POLL_MS = 5000;

const STATUS_TEXT: Record<ServerStatus["state"], string> = {
  ok: "Server connected",
  "no-token": "Paste the server token to connect",
  unauthorized: "Token rejected by server",
  unreachable: "Server unreachable (is `pnpm dev:server` running?)",
};

const STATUS_COLOR: Record<ServerStatus["state"], string> = {
  ok: "bg-green-500",
  "no-token": "bg-amber-500",
  unauthorized: "bg-red-500",
  unreachable: "bg-red-500",
};

export function App() {
  const [settings, setSettings] = useState<PanelSettings | undefined>();
  const [tokenDraft, setTokenDraft] = useState("");
  const [status, setStatus] = useState<ServerStatus | undefined>();

  useEffect(() => {
    void loadPanelSettings().then(setSettings);
  }, []);

  const refresh = useCallback(async () => {
    if (!settings) return;
    setStatus(await checkHealth({ baseUrl: settings.serverUrl, token: settings.token }));
  }, [settings]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const saveToken = async () => {
    if (!settings) return;
    const next = { ...settings, token: tokenDraft.trim() || undefined };
    await savePanelSettings(next);
    setSettings(next);
    setTokenDraft("");
  };

  return (
    <main className="p-4 space-y-4 text-sm text-neutral-900">
      <h1 className="text-lg font-semibold">Job Autofill</h1>

      <section className="flex items-center gap-2" aria-live="polite">
        <span
          className={`h-2.5 w-2.5 rounded-full ${status ? STATUS_COLOR[status.state] : "bg-neutral-300"}`}
        />
        <span>{status ? STATUS_TEXT[status.state] : "Checking server…"}</span>
      </section>

      <section className="space-y-2">
        <label className="block font-medium" htmlFor="token">
          Server token
        </label>
        <input
          id="token"
          type="password"
          autoComplete="off"
          className="w-full rounded border border-neutral-300 px-2 py-1"
          placeholder={
            settings?.token
              ? "Saved (enter a new one to replace)"
              : "Printed when the server starts"
          }
          value={tokenDraft}
          onChange={(e) => setTokenDraft(e.target.value)}
        />
        <button
          type="button"
          className="rounded bg-neutral-900 px-3 py-1 text-white disabled:opacity-40"
          disabled={!tokenDraft.trim()}
          onClick={() => void saveToken()}
        >
          Save token
        </button>
      </section>
    </main>
  );
}
