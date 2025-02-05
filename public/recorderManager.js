
let mediaRecorder = null;
let audioChunks = [];

export const getMediaRecorder = () => mediaRecorder;
export const getAudioChunks = () => audioChunks;
export const setMediaRecorder = (recorder) => {
  mediaRecorder = recorder;
};
export const setAudioChunks = (chunks) => {
  audioChunks = chunks;
};
