
import { startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording } from './recordingOperations.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  const handlers = {
    START_RECORDING: async () => {
      try {
        const success = await startRecording();
        sendResponse({ success });
      } catch (error) {
        console.error('Start recording error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    },
    
    STOP_RECORDING: async () => {
      try {
        const blob = await stopRecording();
        console.log('Stop recording blob:', {
          size: blob.size,
          type: blob.type
        });
        sendResponse({ success: true, blob });
      } catch (error) {
        console.error('Stop recording error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    },
    
    PAUSE_RECORDING: () => {
      pauseRecording();
      sendResponse({ success: true });
    },
    
    RESUME_RECORDING: () => {
      resumeRecording();
      sendResponse({ success: true });
    },
    
    CANCEL_RECORDING: () => {
      cancelRecording();
      sendResponse({ success: true });
    }
  };

  const handler = handlers[message.type];
  return handler ? handler() : false;
});
