
import { AUDIO_CONSTRAINTS, RECORDER_OPTIONS, CHUNK_INTERVAL } from './audioConfig.js';
import { cleanup } from './cleanupUtils.js';
import { getMediaRecorder, getAudioChunks, setMediaRecorder, setAudioChunks } from './recorderManager.js';

export async function startRecording() {
  if (getMediaRecorder()?.state === 'recording') {
    throw new Error('Already recording');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: AUDIO_CONSTRAINTS
  });

  console.log('Audio stream obtained:', stream.getAudioTracks()[0].getSettings());
  
  setAudioChunks([]);
  
  return new Promise((resolve, reject) => {
    try {
      const recorder = new MediaRecorder(stream, RECORDER_OPTIONS);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Chunk received:', event.data.size, 'bytes');
          getAudioChunks().push(event.data);
        }
      };

      recorder.onstart = () => {
        console.log('MediaRecorder started');
      };

      recorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        cleanup();
        reject(error);
      };

      setMediaRecorder(recorder);
      recorder.start(CHUNK_INTERVAL);
      resolve(true);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export function stopRecording() {
  return new Promise((resolve, reject) => {
    const mediaRecorder = getMediaRecorder();
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      reject(new Error('Not recording'));
      return;
    }

    mediaRecorder.onstop = () => {
      try {
        const audioChunks = getAudioChunks();
        if (audioChunks.length === 0) {
          reject(new Error('No audio data recorded'));
          return;
        }

        const blob = new Blob(audioChunks, { type: RECORDER_OPTIONS.mimeType });
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

export function pauseRecording() {
  const mediaRecorder = getMediaRecorder();
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.pause();
  }
}

export function resumeRecording() {
  const mediaRecorder = getMediaRecorder();
  if (mediaRecorder?.state === 'paused') {
    mediaRecorder.resume();
  }
}

export function cancelRecording() {
  cleanup();
}
