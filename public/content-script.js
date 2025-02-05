
let mediaRecorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  const handlers = {
    START_RECORDING: async () => {
      try {
        const success = await startRecording();
        sendResponse({ success });
      } catch (error) {
        console.error('Start recording error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    },
    
    STOP_RECORDING: async () => {
      try {
        const blob = await stopRecording();
        console.log('Stop recording blob:', {
          size: blob.size,
          type: blob.type
        });
        sendResponse({ success: true, blob });
      } catch (error) {
        console.error('Stop recording error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    },
    
    PAUSE_RECORDING: () => {
      pauseRecording();
      sendResponse({ success: true });
    },
    
    RESUME_RECORDING: () => {
      resumeRecording();
      sendResponse({ success: true });
    },
    
    CANCEL_RECORDING: () => {
      cancelRecording();
      sendResponse({ success: true });
    }
  };

  const handler = handlers[message.type];
  return handler ? handler() : false;
});

async function startRecording() {
  if (mediaRecorder?.state === 'recording') {
    throw new Error('Already recording');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  console.log('Audio stream obtained:', stream.getAudioTracks()[0].getSettings());
  
  audioChunks = [];
  
  return new Promise((resolve, reject) => {
    try {
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Chunk received:', event.data.size, 'bytes');
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
      };

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        cleanup();
        reject(error);
      };

      mediaRecorder.start(100);
      resolve(true);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      reject(new Error('Not recording'));
      return;
    }

    mediaRecorder.onstop = () => {
      try {
        if (audioChunks.length === 0) {
          reject(new Error('No audio data recorded'));
          return;
        }

        const blob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        console.log('Final blob created:', blob.size, 'bytes');
        
        if (blob.size <= 44) {
          reject(new Error('Invalid audio data'));
          return;
        }

        cleanup();
        resolve(blob);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    mediaRecorder.stop();
  });
}

function pauseRecording() {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.pause();
  }
}

function resumeRecording() {
  if (mediaRecorder?.state === 'paused') {
    mediaRecorder.resume();
  }
}

function cancelRecording() {
  cleanup();
}

function cleanup() {
  if (mediaRecorder) {
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    mediaRecorder = null;
  }
  audioChunks = [];
}
