
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
  console.log('Starting recording...');
  const constraints = {
    audio: {
      channelCount: 1,
      sampleRate: 44100
    }
  };
  console.log('Using audio constraints:', constraints);

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const audioTrack = stream.getAudioTracks()[0];
    console.log('Audio track settings:', audioTrack.getSettings());
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    });
    
    console.log('MediaRecorder created with state:', mediaRecorder.state);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log(`Received audio chunk: ${event.data.size} bytes`);
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstart = () => {
      console.log('MediaRecorder started recording');
    };

    mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
    };

    mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped');
    };

    // Request data more frequently for better chunk collection
    mediaRecorder.start(100);
    return true;
  } catch (error) {
    console.error('Error starting recording:', error);
    cleanup();
    throw error;
  }
}

function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      const error = new Error('No active recording found');
      console.error(error);
      cleanup();
      reject(error);
      return;
    }

    console.log('Stopping recording. Current state:', mediaRecorder.state);
    
    mediaRecorder.onstop = async () => {
      try {
        console.log(`Processing ${audioChunks.length} audio chunks`);
        
        if (audioChunks.length === 0) {
          const error = new Error('No audio data collected');
          console.error(error);
          cleanup();
          reject(error);
          return;
        }

        // Log individual chunk sizes
        audioChunks.forEach((chunk, index) => {
          console.log(`Chunk ${index + 1} size:`, chunk.size);
        });

        const audioBlob = new Blob(audioChunks, { 
          type: 'audio/webm;codecs=opus' 
        });

        console.log('Created audio blob:', {
          size: audioBlob.size,
          type: audioBlob.type
        });

        // Verify blob is valid
        if (audioBlob.size < 100) {
          const error = new Error(`Invalid audio blob size: ${audioBlob.size} bytes`);
          console.error(error);
          cleanup();
          reject(error);
          return;
        }

        // Create test audio element to verify blob
        const testAudio = new Audio(URL.createObjectURL(audioBlob));
        testAudio.onerror = (error) => {
          console.error('Error testing audio blob:', error);
        };
        testAudio.onloadedmetadata = () => {
          console.log('Audio duration:', testAudio.duration);
        };

        cleanup();
        resolve(audioBlob);
      } catch (error) {
        console.error('Error processing recording:', error);
        cleanup();
        reject(error);
      }
    };

    mediaRecorder.requestData(); // Request any final chunks
    mediaRecorder.stop();
  });
}

function pauseRecording() {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.pause();
    console.log('Recording paused');
  } else {
    console.warn('Cannot pause - invalid recorder state:', mediaRecorder?.state);
  }
}

function resumeRecording() {
  if (mediaRecorder?.state === 'paused') {
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
