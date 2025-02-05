
import { startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording } from './recordingOperations.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  const handlers = {
    START_RECORDING: async () => {
      try {
        await startRecording();
        console.log('Recording started successfully');
        sendResponse({ success: true });
      } catch (error) {
        console.error('Start recording error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true; // Keep message channel open for async response
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
      try {
        pauseRecording();
        sendResponse({ success: true });
      } catch (error) {
        console.error('Pause recording error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    },
    
    RESUME_RECORDING: () => {
      try {
        resumeRecording();
        sendResponse({ success: true });
      } catch (error) {
        console.error('Resume recording error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    },
    
    CANCEL_RECORDING: () => {
      try {
        cancelRecording();
        sendResponse({ success: true });
      } catch (error) {
        console.error('Cancel recording error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
  };

  const handler = handlers[message.type];
  if (!handler) {
    console.error('Unknown message type:', message.type);
    sendResponse({ success: false, error: 'Unknown message type' });
    return false;
  }
  return handler();
});
