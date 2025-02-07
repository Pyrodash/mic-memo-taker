import { startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording } from './recordingOperations.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return

  console.log('Offscreen script received message:', message);
  
  const handlers = {
    START_RECORDING: () => {
      startRecording(message.data)
        .then(() => {
          console.log('Recording started successfully');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Start recording error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep message channel open for async response
    },
    
    STOP_RECORDING: () => {
      stopRecording()
        .then(blob => {
          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            console.log('Recording stopped successfully:', {
              size: blob.size,
              type: blob.type,
              base64Length: base64data.length
            });
            sendResponse({ 
              success: true, 
              blobData: {
                data: base64data,
                type: blob.type,
                size: blob.size
              }
            });
          };
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          console.error('Stop recording error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    },
    
    PAUSE_RECORDING: () => {
      try {
        pauseRecording();
        console.log('Recording paused');
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
        console.log('Recording resumed');
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
        console.log('Recording cancelled');
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
