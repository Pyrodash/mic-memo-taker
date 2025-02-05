import { AUDIO_CONSTRAINTS, RECORDER_OPTIONS, CHUNK_INTERVAL } from './audioConfig.js';
import { cleanup } from './cleanupUtils.js';
import { getMediaRecorder, getAudioChunks, setMediaRecorder, setAudioChunks } from './recorderManager.js';

export async function startRecording() {
  console.log('Starting recording...');
  
  if (getMediaRecorder()?.state === 'recording') {
    throw new Error('Already recording');
  }

  cleanup();
  
  try {
    console.log('Requesting microphone access...');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS
    });

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      throw new Error('No audio track available');
    }

    console.log('Audio stream obtained:', audioTrack.getSettings());
    
    const recorder = new MediaRecorder(stream, {
      ...RECORDER_OPTIONS,
      audioBitsPerSecond: 128000
    });
    console.log('MediaRecorder created with options:', RECORDER_OPTIONS);
    
    setMediaRecorder(recorder);
    setAudioChunks([]);
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('Chunk received:', event.data.size, 'bytes');
        getAudioChunks().push(event.data);
      }
    };

    recorder.start(CHUNK_INTERVAL);
    console.log('MediaRecorder.start() called');
    
    return true;
  } catch (error) {
    console.error('Failed to initialize recording:', error);
    cleanup();
    throw error;
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

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Stop recording timeout'));
    }, 5000);

    mediaRecorder.onstop = () => {
      clearTimeout(timeoutId);
      try {
        const audioChunks = getAudioChunks();
        if (!audioChunks || audioChunks.length === 0) {
          cleanup();
          reject(new Error('No audio data recorded'));
          return;
        }

        const blob = new Blob(audioChunks, { 
          type: 'audio/webm;codecs=opus' 
        });
        console.log('Final blob created:', {
          chunks: audioChunks.length,
          size: blob.size,
          type: blob.type
        });
        
        if (!blob || blob.size <= 44) {
          cleanup();
          reject(new Error('Invalid audio data'));
          return;
        }

        cleanup();
        resolve(blob);
      } catch (error) {
        console.error('Error processing recording:', error);
        cleanup();
        reject(error);
      }
    };

    try {
      // Request final chunk before stopping
      try {
        mediaRecorder.requestData();
      } catch (e) {
        console.warn('Could not request final data:', e);
      }
      mediaRecorder.stop();
    } catch (error) {
      console.error('Error stopping recorder:', error);
      clearTimeout(timeoutId);
      cleanup();
      reject(error);
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
