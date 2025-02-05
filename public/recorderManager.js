let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

export const getMediaRecorder = () => mediaRecorder;
export const getAudioChunks = () => audioChunks;
export const getIsRecording = () => isRecording;

export const setMediaRecorder = (recorder) => {
  mediaRecorder = recorder;
  isRecording = true;
};

export const setAudioChunks = (chunks) => {
  if (Array.isArray(chunks)) {
    audioChunks = chunks;
  } else {
    audioChunks = [];
  }
};

export const addAudioChunk = (chunk) => {
  if (chunk && chunk.size > 0) {
    audioChunks.push(chunk);
    return true;
  }
  return false;
};

export const clearRecorder = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
    } catch (e) {
      console.warn('Error stopping recorder:', e);
    }
  }
  mediaRecorder = null;
  audioChunks = [];
  isRecording = false;
};
