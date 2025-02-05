
import { recordingState } from './state.js';

const activePorts = new Set();

export const addPort = (port) => {
  activePorts.add(port);
  port.onDisconnect.addListener(() => {
    activePorts.delete(port);
  });
};

export const broadcastToAllPorts = (message) => {
  activePorts.forEach(port => {
    port.postMessage(message);
  });
};

export const sendState = () => {
  const state = {
    isRecording: recordingState.isRecording,
    isPaused: recordingState.isPaused,
    duration: recordingState.startTime ? Math.floor((Date.now() - recordingState.startTime) / 1000) : 0,
    recordingType: recordingState.recordingType
  };

  broadcastToAllPorts({
    type: 'STATE_UPDATE',
    state
  });
};
