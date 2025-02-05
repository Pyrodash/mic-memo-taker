
import { setMediaRecorder, setAudioChunks, getMediaRecorder } from './recorderManager.js';

export function cleanup() {
  const mediaRecorder = getMediaRecorder();
  if (mediaRecorder) {
    try {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.error('Error stopping track:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    
    setMediaRecorder(null);
  }
  setAudioChunks([]);
}
