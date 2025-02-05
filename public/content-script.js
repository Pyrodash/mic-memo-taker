
let mediaRecorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECORDING':
      startRecording()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

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

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true,
      video: false
    });
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm'
    });
    
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(1000);
    return true;
  } catch (error) {
    console.error('Error starting recording:', error);
    throw new Error('Failed to start recording: ' + error.message);
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

    try {
      mediaRecorder.stop();
    } catch (error) {
      cleanup();
      reject(new Error('Failed to stop recording: ' + error.message));
    }
  });
}

function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    try {
      mediaRecorder.pause();
    } catch (error) {
      console.error('Error pausing recording:', error);
    }
  }
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    try {
      mediaRecorder.resume();
    } catch (error) {
      console.error('Error resuming recording:', error);
    }
  }
}

function cancelRecording() {
  cleanup();
}

function cleanup() {
  if (mediaRecorder) {
    try {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    mediaRecorder = null;
  }
  audioChunks = [];
}
