let mediaRecorder = null;
let audioChunks = [];

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECORDING':
      startRecording(message.recordingType)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Required for async response

    case 'STOP_RECORDING':
      stopRecording()
        .then(blob => sendResponse({ success: true, blob }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'PAUSE_RECORDING':
      pauseRecording();
      sendResponse({ success: true });
      return false;

    case 'RESUME_RECORDING':
      resumeRecording();
      sendResponse({ success: true });
      return false;

    case 'CANCEL_RECORDING':
      cancelRecording();
      sendResponse({ success: true });
      return false;
  }
});

async function startRecording(type) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm'
    });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
      // Send chunk to background script
      chrome.runtime.sendMessage({
        type: 'AUDIO_DATA',
        data: event.data
      });
    };

    mediaRecorder.start(1000);
    chrome.runtime.sendMessage({ type: 'RECORDING_STARTED' });
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
}

function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      reject(new Error('No recording in progress'));
      return;
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      cleanup();
      resolve(audioBlob);
    };

    mediaRecorder.stop();
  });
}

function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    chrome.runtime.sendMessage({ type: 'RECORDING_PAUSED' });
  }
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    chrome.runtime.sendMessage({ type: 'RECORDING_RESUMED' });
  }
}

function cancelRecording() {
  cleanup();
  chrome.runtime.sendMessage({ type: 'RECORDING_CANCELLED' });
}

function cleanup() {
  if (mediaRecorder) {
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    mediaRecorder = null;
  }
  audioChunks = [];
}
