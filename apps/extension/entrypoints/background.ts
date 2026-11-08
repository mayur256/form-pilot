export default defineBackground(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

  chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "open-panel" && tab?.windowId !== undefined) {
      void chrome.sidePanel.open({ windowId: tab.windowId });
    }
  });
});
