
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
      }
    });

    // Create MediaRecorder with specific MIME type and codec
    const options = {
      mimeType: 'audio/webm;codecs=opus',
      bitsPerSecond: 128000
    };

    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      throw new Error(`MIME type ${options.mimeType} is not supported`);
    }

    mediaRecorder = new MediaRecorder(stream, options);
    audioChunks = [];

    // Handle data available event
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log(`Chunk collected: ${event.data.size} bytes`);
      }
    };

    // Collect data every 1 second to ensure continuous recording
    mediaRecorder.start(1000);
    console.log('Recording started');
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
      cleanup();
      reject(new Error('No active recording'));
      return;
    }

    mediaRecorder.onstop = async () => {
      try {
        console.log(`Collected ${audioChunks.length} chunks`);

        if (audioChunks.length === 0) {
          cleanup();
          reject(new Error('No audio data recorded'));
          return;
        }

        // Create blob with proper MIME type
        const audioBlob = new Blob(audioChunks, {
          type: 'audio/webm;codecs=opus'
        });

        console.log(`Final blob size: ${audioBlob.size} bytes`);

        // Verify blob size and content
        if (audioBlob.size < 1000) {
          cleanup();
          reject(new Error('Recording too short or no audio captured'));
          return;
        }

        cleanup();
        resolve(audioBlob);

      } catch (error) {
        console.error('Error processing audio:', error);
        cleanup();
        reject(error);
      }
    };

    // Ensure we get the last chunk of data
    mediaRecorder.requestData();
    mediaRecorder.stop();
  });
}

function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    console.log('Recording paused');
  }
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    console.log('Recording resumed');
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
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    mediaRecorder = null;
  }
  audioChunks = [];
}
