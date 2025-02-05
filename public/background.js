
let isRecording = false;
let startTime = 0;
let isPaused = false;
let recordingType = null;
let port = null;

chrome.runtime.onConnect.addListener(function(p) {
  port = p;
  port.onMessage.addListener(handleMessage);
  port.onDisconnect.addListener(() => {
    port = null;
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
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    // Check if we can access the tab
    const url = new URL(tab.url);
    if (!url.protocol.startsWith('http')) {
      throw new Error('Recording is only supported on web pages');
    }

    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js']
    });

    // Request recording start from content script
    const response = await chrome.tabs.sendMessage(tab.id, { 
      type: 'START_RECORDING',
      recordingType: type
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to start recording');
    }

    // Initialize state
    recordingType = type;
    startTime = Date.now();
    isPaused = false;
    updateBadge();
    sendState();
  } catch (error) {
    console.error('Error starting recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

async function stopRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' });
    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to stop recording');
    }

    if (response.blob) {
      try {
        const webhookUrl = await chrome.storage.local.get('webhookUrl');
        if (webhookUrl.webhookUrl) {
          const formData = new FormData();
          formData.append('audio', response.blob);
          
          const uploadResponse = await fetch(`${webhookUrl.webhookUrl}?route=${recordingType}`, {
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'PAUSE_RECORDING' });
    if (response?.success) {
      isPaused = true;
      sendState();
    }
  } catch (error) {
    console.error('Error pausing recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

async function resumeRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'RESUME_RECORDING' });
    if (response?.success) {
      isPaused = false;
      sendState();
    }
  } catch (error) {
    console.error('Error resuming recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

async function cancelRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    await chrome.tabs.sendMessage(tab.id, { type: 'CANCEL_RECORDING' });
    cleanup();
  } catch (error) {
    console.error('Error canceling recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

function cleanup() {
  startTime = 0;
  isPaused = false;
  recordingType = null;
  updateBadge();
  sendState();
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'RECORDING_STARTED':
      isRecording = true;
      updateBadge();
      break;
    case 'RECORDING_STOPPED':
    case 'RECORDING_CANCELLED':
      isRecording = false;
      updateBadge();
      break;
  }
});

function sendState() {
  if (port) {
    port.postMessage({
      type: 'STATE_UPDATE',
      state: {
        isRecording,
        isPaused,
        duration: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
        recordingType
      }
    });
  }
}

function updateBadge() {
  if (isRecording) {
    chrome.action.setBadgeText({ text: '🎤' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

setInterval(() => {
  if (isRecording && !isPaused) {
    sendState();
  }
}, 1000);
