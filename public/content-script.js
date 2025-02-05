
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
  console.log('Starting recording with following settings:');
  const constraints = {
    audio: {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  };
  console.log('Audio constraints:', constraints);

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Stream obtained:', stream.getAudioTracks()[0].getSettings());

    const options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    };

    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error('MIME type not supported:', options.mimeType);
      console.log('Supported MIME types:', MediaRecorder.isTypeSupported);
      throw new Error(`MIME type ${options.mimeType} is not supported`);
    }

    console.log('Creating MediaRecorder with options:', options);
    mediaRecorder = new MediaRecorder(stream, options);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log(`Chunk collected: ${event.data.size} bytes, type: ${event.data.type}`);
      }
    };

    mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
    };

    mediaRecorder.start(1000);
    console.log('MediaRecorder started:', mediaRecorder.state);
    return true;

  } catch (error) {
    console.error('Error in startRecording:', error);
    cleanup();
    throw error;
  }
}

function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      console.error('No active recording found');
      cleanup();
      reject(new Error('No active recording'));
      return;
    }

    console.log('Stopping recording...');
    mediaRecorder.onstop = async () => {
      try {
        console.log(`Total chunks collected: ${audioChunks.length}`);
        console.log('Chunk sizes:', audioChunks.map(chunk => chunk.size));

        if (audioChunks.length === 0) {
          console.error('No audio chunks collected');
          cleanup();
          reject(new Error('No audio data recorded'));
          return;
        }

        const audioBlob = new Blob(audioChunks, {
          type: 'audio/webm;codecs=opus'
        });

        console.log('Final blob details:', {
          size: audioBlob.size,
          type: audioBlob.type
        });

        // Verify blob content
        if (audioBlob.size < 1000) {
          console.error('Blob size too small:', audioBlob.size);
          cleanup();
          reject(new Error('Recording too short or no audio captured'));
          return;
        }

        // Create an audio element to verify the blob
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.onloadedmetadata = () => {
          console.log('Audio duration:', audio.duration);
        };

        cleanup();
        resolve(audioBlob);

      } catch (error) {
        console.error('Error processing audio:', error);
        cleanup();
        reject(error);
      }
    };

    mediaRecorder.requestData();
    mediaRecorder.stop();
    console.log('MediaRecorder stopped');
  });
}

function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    console.log('Recording paused');
  } else {
    console.warn('Cannot pause - recorder state:', mediaRecorder?.state);
  }
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    console.log('Recording resumed');
  } else {
    console.warn('Cannot resume - recorder state:', mediaRecorder?.state);
  }
}

function cancelRecording() {
  console.log('Canceling recording');
  cleanup();
}

function cleanup() {
  console.log('Cleaning up recording resources');
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
}
