
export const findActiveTab = async () => {
  // Query all windows to find the active tab
  const windows = await chrome.windows.getAll({ populate: true });
  let activeTab = null;
  
  for (const window of windows) {
    if (window.focused) {
      activeTab = window.tabs?.find(tab => tab.active);
      if (activeTab) break;
    }
  }

  // Fallback to querying current window if no active tab found
  if (!activeTab) {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    activeTab = tabs[0];

    // If still no active tab, try a broader search
    if (!activeTab) {
      const allTabs = await chrome.tabs.query({
        active: true
      });
      activeTab = allTabs[0];
    }
  }

  if (!activeTab?.id) {
    throw new Error('No active tab found');
  }

  return activeTab;
};
