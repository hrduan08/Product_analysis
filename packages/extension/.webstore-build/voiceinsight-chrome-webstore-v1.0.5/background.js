function configureSidePanelBehavior() {
  if (!chrome.sidePanel?.setPanelBehavior) return;
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => {
      console.error(
        "[voiceinsight][background] side panel behavior setup failed",
        error?.message || error
      );
    });
}

configureSidePanelBehavior();

chrome.runtime.onInstalled.addListener(() => {
  configureSidePanelBehavior();
});
