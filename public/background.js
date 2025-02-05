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

async function requestMicrophonePermission() {
  try {
    const result = await chrome.permissions.request({
      permissions: ['microphone']
    });
    return result;
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
}

async function startRecording(type) {
  try {
    // Request microphone permission first
    const hasMicPermission = await requestMicrophonePermission();
    if (!hasMicPermission) {
      throw new Error('Microphone permission denied');
    }

    // Initialize recording in the content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

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

    recordingType = type;
    startTime = Date.now();
    isPaused = false;
    isRecording = true;
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
  isRecording = false;
  recordingType = null;
  updateBadge();
  sendState();
}

function updateBadge() {
  if (isRecording) {
    chrome.action.setBadgeText({ text: '🎤' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

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

setInterval(() => {
  if (isRecording && !isPaused) {
    sendState();
  }
}, 1000);
