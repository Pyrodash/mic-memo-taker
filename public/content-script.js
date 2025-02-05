
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
  console.log('Starting recording with new implementation...');
  
  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  };
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Audio stream obtained:', stream.getAudioTracks()[0].getSettings());
    
    // Create MediaRecorder with specific options
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    });
    
    console.log('MediaRecorder created:', {
      state: mediaRecorder.state,
      mimeType: mediaRecorder.mimeType,
      audioBitsPerSecond: mediaRecorder.audioBitsPerSecond
    });

    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('Received audio chunk:', {
          size: event.data.size,
          type: event.data.type,
          timestamp: new Date().toISOString()
        });
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstart = () => {
      console.log('MediaRecorder started:', new Date().toISOString());
    };

    mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
      cleanup();
    };

    mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped:', new Date().toISOString());
    };

    // Start recording with smaller timeslice for more frequent chunks
    mediaRecorder.start(10);
    return true;
  } catch (error) {
    console.error('Error in startRecording:', error);
    cleanup();
    throw error;
  }
}

function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      reject(new Error('No active recording found'));
      return;
    }

    console.log('Stopping recording. Current state:', mediaRecorder.state);

    // Add error handler for the stop event
    mediaRecorder.onerror = (error) => {
      console.error('Error during stop:', error);
      cleanup();
      reject(error);
    };

    mediaRecorder.onstop = async () => {
      try {
        console.log('Total chunks collected:', audioChunks.length);
        
        if (audioChunks.length === 0) {
          throw new Error('No audio data collected');
        }

        // Log individual chunks
        audioChunks.forEach((chunk, index) => {
          console.log(`Chunk ${index + 1}:`, {
            size: chunk.size,
            type: chunk.type
          });
        });

        const blob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        console.log('Final blob created:', {
          size: blob.size,
          type: blob.type
        });

        // Verify blob is valid
        if (blob.size <= 44) { // WebM header size is ~44 bytes
          throw new Error('Invalid audio blob: too small');
        }

        // Test playability
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.onerror = () => {
          console.error('Audio test failed:', audio.error);
          URL.revokeObjectURL(url);
          cleanup();
          reject(new Error('Created audio is not playable'));
        };

        audio.onloadedmetadata = () => {
          console.log('Audio test successful:', {
            duration: audio.duration,
            size: blob.size
          });
          URL.revokeObjectURL(url);
          cleanup();
          resolve(blob);
        };

      } catch (error) {
        console.error('Error processing recording:', error);
        cleanup();
        reject(error);
      }
    };

    try {
      mediaRecorder.requestData(); // Request any pending data
      mediaRecorder.stop();
    } catch (error) {
      console.error('Error stopping MediaRecorder:', error);
      cleanup();
      reject(error);
    }
  });
}

function pauseRecording() {
  if (mediaRecorder?.state === 'recording') {
    console.log('Pausing recording...');
    mediaRecorder.pause();
    console.log('Recording paused');
  } else {
    console.warn('Cannot pause - invalid recorder state:', mediaRecorder?.state);
  }
}

function resumeRecording() {
  if (mediaRecorder?.state === 'paused') {
    console.log('Resuming recording...');
    mediaRecorder.resume();
    console.log('Recording resumed');
  } else {
    console.warn('Cannot resume - invalid recorder state:', mediaRecorder?.state);
  }
}

function cancelRecording() {
  console.log('Canceling recording');
  cleanup();
}

function cleanup() {
  console.log('Starting cleanup...');
  if (mediaRecorder) {
    try {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => {
          track.stop();
          console.log('Audio track stopped:', track.label);
        });
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    mediaRecorder = null;
  }
  audioChunks = [];
  console.log('Cleanup completed');
}
