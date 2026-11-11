import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // Dev builds are loaded into your real Chrome profile (logged-in sessions), not a throwaway one.
  webExt: { disabled: true },
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: "Job Autofill",
    description:
      "Fills job application forms from your resume and answer bank. You review and submit.",
    // Minimal permissions (SPEC §14). Content scripts are injected on demand via activeTab + scripting.
    permissions: ["activeTab", "scripting", "sidePanel", "storage"],
    host_permissions: ["http://127.0.0.1/*"],
    action: { default_title: "Job Autofill" },
    commands: {
      "open-panel": {
        suggested_key: { default: "Alt+Shift+F" },
        description: "Open the Job Autofill panel",
      },
    },
  },
});
