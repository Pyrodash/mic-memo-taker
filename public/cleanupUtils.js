
import { setMediaRecorder, setAudioChunks, getMediaRecorder } from './recorderManager.js';

export function cleanup() {
  console.log('Performing cleanup...');
  const mediaRecorder = getMediaRecorder();
  
  if (mediaRecorder) {
    try {
      if (mediaRecorder.state !== 'inactive') {
        console.log('Stopping active MediaRecorder');
        mediaRecorder.stop();
      }
      
      if (mediaRecorder.stream) {
        console.log('Stopping all audio tracks');
        mediaRecorder.stream.getTracks().forEach(track => {
          try {
            track.stop();
            console.log('Track stopped:', track.label);
          } catch (error) {
            console.error('Error stopping track:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error during MediaRecorder cleanup:', error);
    }
    
    setMediaRecorder(null);
  }
  
  console.log('Clearing audio chunks');
  setAudioChunks([]);
}

