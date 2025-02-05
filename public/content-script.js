
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
      mimeType: 'audio/webm;codecs=opus'
    });
    
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    // Start without a timeslice for a single final chunk once stopped
    mediaRecorder.start();
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

    mediaRecorder.onstop = async () => {
      // Wait for any final chunks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (audioChunks.length === 0) {
        cleanup();
        reject(new Error('No audio data recorded'));
        return;
      }

      // Create and verify the blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
      if (audioBlob.size < 1000) {
        cleanup();
        reject(new Error('Recording too short or empty'));
        return;
      }

      console.log(`Final recording size: ${audioBlob.size} bytes`);
      
      // Test if the audio is valid
      const testUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(testUrl);
      
      try {
        await audio.play();
        // If we get here, audio is valid
        audio.pause();
        URL.revokeObjectURL(testUrl);
        cleanup();
        resolve(audioBlob);
      } catch (error) {
        console.error('Invalid audio recording:', error);
        cleanup();
        URL.revokeObjectURL(testUrl);
        reject(new Error('Invalid audio recording'));
      }
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
