
import { AUDIO_CONSTRAINTS, RECORDER_OPTIONS, CHUNK_INTERVAL } from './audioConfig.js';
import { cleanup } from './cleanupUtils.js';
import { getMediaRecorder, getAudioChunks, setMediaRecorder, setAudioChunks } from './recorderManager.js';

export async function startRecording() {
  if (getMediaRecorder()?.state === 'recording') {
    throw new Error('Already recording');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS
    });

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      throw new Error('No audio track available');
    }

    console.log('Audio stream obtained:', audioTrack.getSettings());
    
    setAudioChunks([]);
    
    return new Promise((resolve, reject) => {
      try {
        const recorder = new MediaRecorder(stream, RECORDER_OPTIONS);

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            console.log('Chunk received:', event.data.size, 'bytes');
            getAudioChunks().push(event.data);
          }
        };

        recorder.onstart = () => {
          console.log('MediaRecorder started successfully');
          resolve(true);
        };

        recorder.onerror = (error) => {
          console.error('MediaRecorder error:', error);
          cleanup();
          reject(new Error('Recording failed to start: ' + error.message));
        };

        setMediaRecorder(recorder);
        recorder.start(CHUNK_INTERVAL);
      } catch (error) {
        cleanup();
        reject(new Error('Failed to initialize recorder: ' + error.message));
      }
    });
  } catch (error) {
    cleanup();
    throw new Error('Failed to access microphone: ' + error.message);
  }
}

export function stopRecording() {
  return new Promise((resolve, reject) => {
    const mediaRecorder = getMediaRecorder();
    if (!mediaRecorder) {
      reject(new Error('No active recorder found'));
      return;
    }

    if (mediaRecorder.state === 'inactive') {
      reject(new Error('Recorder is not active'));
      return;
    }

    mediaRecorder.onstop = () => {
      try {
        const audioChunks = getAudioChunks();
        if (!audioChunks || audioChunks.length === 0) {
          reject(new Error('No audio data recorded'));
          return;
        }

        const blob = new Blob(audioChunks, { type: RECORDER_OPTIONS.mimeType });
        console.log('Final blob created:', blob.size, 'bytes');
        
        if (!blob || blob.size <= 44) {
          reject(new Error('Invalid audio data'));
          return;
        }

        cleanup();
        resolve(blob);
      } catch (error) {
        cleanup();
        reject(new Error('Failed to process recording: ' + error.message));
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

export function pauseRecording() {
  const mediaRecorder = getMediaRecorder();
  if (!mediaRecorder) {
    throw new Error('No active recorder found');
  }
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
  }
}

export function resumeRecording() {
  const mediaRecorder = getMediaRecorder();
  if (!mediaRecorder) {
    throw new Error('No active recorder found');
  }
  if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
  }
}

export function cancelRecording() {
  cleanup();
}
