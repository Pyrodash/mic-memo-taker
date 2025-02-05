
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
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });
    activeTab = tab;
  }

  if (!activeTab?.id) {
    throw new Error('No active tab found');
  }

  if (activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('edge://')) {
    throw new Error('Recording not available on browser system pages');
  }

  return activeTab;
};

export const injectContentScript = async (tabId) => {
  let scriptInjected = false;
  let retries = 2;
  
  while (retries >= 0 && !scriptInjected) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-script.js']
      });
      scriptInjected = true;
      console.log('Content script injected successfully');
    } catch (error) {
      console.error('Script injection attempt failed:', error);
      retries--;
      if (retries >= 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw new Error('Failed to initialize recording');
      }
    }
  }
  return scriptInjected;
};
