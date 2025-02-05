let mediaRecorder = null;
let audioChunks = [];
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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    recordingType = type;
    startTime = Date.now();
    isPaused = false;

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.start(1000);
    updateBadge();
    sendState();
  } catch (error) {
    console.error('Error starting recording:', error);
    port?.postMessage({ type: 'ERROR', error: error.message });
  }
}

function stopRecording() {
  if (!mediaRecorder) return;

  return new Promise((resolve) => {
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      
      try {
        const webhookUrl = await chrome.storage.local.get('webhookUrl');
        if (webhookUrl.webhookUrl) {
          const formData = new FormData();
          formData.append('audio', audioBlob);
          
          const response = await fetch(`${webhookUrl.webhookUrl}?route=${recordingType}`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload recording');
          }
        }
      } catch (error) {
        console.error('Error uploading recording:', error);
        port?.postMessage({ type: 'ERROR', error: error.message });
      }

      cleanup();
      resolve();
    };

    mediaRecorder.stop();
  });
}

function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    isPaused = true;
    sendState();
  }
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    isPaused = false;
    sendState();
  }
}

function cancelRecording() {
  cleanup();
}

function cleanup() {
  if (mediaRecorder) {
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    mediaRecorder = null;
  }
  audioChunks = [];
  startTime = 0;
  isPaused = false;
  recordingType = null;
  updateBadge();
  sendState();
}

function sendState() {
  if (port) {
    port.postMessage({
      type: 'STATE_UPDATE',
      state: {
        isRecording: !!mediaRecorder,
        isPaused,
        duration: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
        recordingType
      }
    });
  }
}

function updateBadge() {
  if (mediaRecorder) {
    chrome.action.setBadgeText({ text: '🎤' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

setInterval(() => {
  if (mediaRecorder && !isPaused) {
    sendState();
  }
}, 1000);