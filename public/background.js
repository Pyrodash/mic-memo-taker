
let recordingState = {
  isRecording: false,
  isPaused: false,
  startTime: null,
  lastStateUpdate: Date.now(),
  tabId: null,
  recordingType: null
};

const activePorts = new Set();

chrome.runtime.onConnect.addListener(function(port) {
  // Send initial state
  port.postMessage({
    type: 'STATE_UPDATE',
    state: {
      isRecording: recordingState.isRecording,
      isPaused: recordingState.isPaused,
      duration: recordingState.startTime ? Math.floor((Date.now() - recordingState.startTime) / 1000) : 0,
      recordingType: recordingState.recordingType
    }
  });
  
  // Keep reference to port for updates
  activePorts.add(port);
  port.onMessage.addListener(handleMessage);
  port.onDisconnect.addListener(() => {
    activePorts.delete(port);
  });
});

async function handleMessage(msg) {
  switch (msg.type) {
    case 'START_RECORDING':
      startRecording(msg.recordingType);
      break;
    case 'STOP_RECORDING':
      stopRecording();
      break;
    case 'PAUSE_RECORDING':
      pauseRecording();
      break;
    case 'RESUME_RECORDING':
      resumeRecording();
      break;
    case 'CANCEL_RECORDING':
      cancelRecording();
      break;
    case 'GET_STATE':
      sendState();
      break;
  }
}

async function startRecording(type) {
  try {
    // Get the current window first
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow?.id) {
      throw new Error('Could not determine current window');
    }

    // Then query for the active tab in that specific window
    const tabs = await chrome.tabs.query({
      active: true,
      windowId: currentWindow.id
    });

    const tab = tabs[0];
    if (!tab?.id) {
      throw new Error('No active tab found. Please ensure you are on a web page.');
    }

    // Check if we're on a restricted URL
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      throw new Error('Recording is not available on browser system pages');
    }

    // Add a small delay to ensure tab is fully ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js']
    });

    // Start recording
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'START_RECORDING',
      recordingType: type
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to start recording');
    }

    recordingState.recordingType = type;
    recordingState.startTime = Date.now();
    recordingState.isPaused = false;
    recordingState.isRecording = true;
    recordingState.tabId = tab.id;
    updateBadge();
    sendState();
  } catch (error) {
    console.error('Error starting recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

async function stopRecording() {
  try {
    // Get the current window first
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow?.id) {
      throw new Error('Could not determine current window');
    }

    // Then query for the active tab in that specific window
    const tabs = await chrome.tabs.query({
      active: true,
      windowId: currentWindow.id
    });

    const tab = tabs[0];
    if (!tab?.id) {
      throw new Error('No active tab found. Please ensure you are on a web page.');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' });
    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to stop recording');
    }

    if (response.blob) {
      try {
        const webhookUrl = await chrome.storage.local.get('webhookUrl');
        if (webhookUrl.webhookUrl) {
          // Wrap the blob in a File, giving it a name and MIME type
          const audioFile = new File([response.blob], "recording.webm", { type: "audio/webm" });

          const formData = new FormData();
          formData.append('audio', audioFile);

          const uploadResponse = await fetch(`${webhookUrl.webhookUrl}?route=${recordingState.recordingType}`, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload recording');
          }
        }
      } catch (error) {
        console.error('Error uploading recording:', error);
        port?.postMessage({ type: 'ERROR', error: error.message });
      }
    }

    cleanup();
  } catch (error) {
    console.error('Error stopping recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

async function pauseRecording() {
  try {
    // Get the current window first
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow?.id) return;

    // Then query for the active tab in that specific window
    const tabs = await chrome.tabs.query({
      active: true,
      windowId: currentWindow.id
    });

    const tab = tabs[0];
    if (!tab?.id) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'PAUSE_RECORDING' });
    if (response?.success) {
      recordingState.isPaused = true;
      sendState();
    }
  } catch (error) {
    console.error('Error pausing recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

async function resumeRecording() {
  try {
    // Get the current window first
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow?.id) return;

    // Then query for the active tab in that specific window
    const tabs = await chrome.tabs.query({
      active: true,
      windowId: currentWindow.id
    });

    const tab = tabs[0];
    if (!tab?.id) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'RESUME_RECORDING' });
    if (response?.success) {
      recordingState.isPaused = false;
      sendState();
    }
  } catch (error) {
    console.error('Error resuming recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

async function cancelRecording() {
  try {
    // Get the current window first
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow?.id) return;

    // Then query for the active tab in that specific window
    const tabs = await chrome.tabs.query({
      active: true,
      windowId: currentWindow.id
    });

    const tab = tabs[0];
    if (!tab?.id) return;

    await chrome.tabs.sendMessage(tab.id, { type: 'CANCEL_RECORDING' });
    cleanup();
  } catch (error) {
    console.error('Error canceling recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

function cleanup() {
  recordingState.startTime = null;
  recordingState.isPaused = false;
  recordingState.isRecording = false;
  recordingState.recordingType = null;
  recordingState.tabId = null;
  updateBadge();
  sendState();
}

function updateBadge() {
  if (recordingState.isRecording) {
    chrome.action.setBadgeText({ text: '🎤' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

function sendState() {
  const state = {
    isRecording: recordingState.isRecording,
    isPaused: recordingState.isPaused,
    duration: recordingState.startTime ? Math.floor((Date.now() - recordingState.startTime) / 1000) : 0,
    recordingType: recordingState.recordingType
  };

  // Send to all active ports
  activePorts.forEach(port => {
    port.postMessage({
      type: 'STATE_UPDATE',
      state
    });
  });
}

setInterval(() => {
  if (recordingState.isRecording && !recordingState.isPaused) {
    sendState();
  }
}, 1000);
