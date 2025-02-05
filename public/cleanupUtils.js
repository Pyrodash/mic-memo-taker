
import { setMediaRecorder, setAudioChunks, getMediaRecorder } from './recorderManager.js';

export function cleanup() {
  const mediaRecorder = getMediaRecorder();
  if (mediaRecorder) {
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setMediaRecorder(null);
  }
  setAudioChunks([]);
}
