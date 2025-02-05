
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
      audio: {
        channelCount: 1,
        sampleRate: 44100,
        echoCancellation: true,
        noiseSuppression: true
      },
      video: false
    });

    // Check available MIME types
    const mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      throw new Error('Codec not supported');
    }
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      audioBitsPerSecond: 128000
    });
    
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log('Chunk received:', event.data.size, 'bytes');
      }
    };

    // Request chunks every 1 second to ensure we're getting data
    mediaRecorder.start(1000);
    console.log('Recording started with timeslice');
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

    const handleStop = () => {
      console.log('Recorder stopped, chunks:', audioChunks.length);
      
      if (audioChunks.length === 0) {
        cleanup();
        reject(new Error('No audio data recorded'));
        return;
      }

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
      console.log(`Final recording size: ${audioBlob.size} bytes`);
      
      if (audioBlob.size < 1000) {
        cleanup();
        reject(new Error('Recording too short'));
        return;
      }

      cleanup();
      resolve(audioBlob);
    };

    mediaRecorder.onstop = handleStop;

    try {
      // Ensure we're actually recording before stopping
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.requestData(); // Request any final chunks
        mediaRecorder.stop();
      } else {
        handleStop();
      }
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
      console.log('Recording paused');
    } catch (error) {
      console.error('Error pausing recording:', error);
    }
  }
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    try {
      mediaRecorder.resume();
      console.log('Recording resumed');
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
