import { recordingState } from './state.js';
import { addPort, sendState } from './portManager.js';
import { 
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  cancelRecording
} from './recordingControls.js';

chrome.runtime.onConnect.addListener(function(port) {
  // Send initial state
  port.postMessage({
    type: 'STATE_UPDATE',
    state: {
      isRecording: recordingState.isRecording,
      isPaused: recordingState.isPaused,
      duration: recordingState.startTime ? Math.floor((Date.now() - recordingState.startTime) / 1000) : 0,
      recordingType: recordingState.recordingType
    }
  });
  
  // Keep reference to port for updates
  addPort(port);
  port.onMessage.addListener(handleMessage);
});

async function handleMessage(msg) {
  switch (msg.type) {
    case 'START_RECORDING':
      startRecording(msg.recordingType);
      break;
    case 'STOP_RECORDING':
      stopRecording();
      break;
    case 'PAUSE_RECORDING':
      pauseRecording();
      break;
    case 'RESUME_RECORDING':
      resumeRecording();
      break;
    case 'CANCEL_RECORDING':
      cancelRecording();
      break;
    case 'GET_STATE':
      sendState();
      break;
  }
}

setInterval(() => {
  if (recordingState.isRecording && !recordingState.isPaused) {
    sendState();
  }
}, 1000);
