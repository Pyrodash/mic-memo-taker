
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
        sampleRate: 48000,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }
    });

    // Force the audio context sample rate to match our desired rate
    const audioContext = new AudioContext({ sampleRate: 48000 });
    const source = audioContext.createMediaStreamSource(stream);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 256000 // Increased bitrate for better quality
    });

    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
        console.log('Chunk received:', event.data.size, 'bytes');
      }
    };

    // Request smaller chunks more frequently
    mediaRecorder.start(500);
    console.log('Recording started with AudioContext processing');
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

    mediaRecorder.onstop = () => {
      console.log('Recording stopped, processing chunks...');
      
      if (audioChunks.length === 0) {
        cleanup();
        reject(new Error('No audio data recorded'));
        return;
      }

      // Create blob from chunks
      const finalBlob = new Blob(audioChunks, { type: 'audio/webm' });
      console.log('Final blob size:', finalBlob.size, 'bytes');

      if (finalBlob.size < 1000) {
        cleanup();
        reject(new Error('Recording too short or no audio captured'));
        return;
      }

      cleanup();
      resolve(finalBlob);
    };

    try {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.requestData();
        mediaRecorder.stop();
      } else {
        cleanup();
        reject(new Error('MediaRecorder not in recording state'));
      }
    } catch (error) {
      cleanup();
      reject(error);
    }
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
        const tracks = mediaRecorder.stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    mediaRecorder = null;
  }
  audioChunks = [];
}
