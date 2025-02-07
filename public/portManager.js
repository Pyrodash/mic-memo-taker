
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

export const calculateDuration = () => {
  let duration = recordingState.totalDuration

  if (!recordingState.isPaused) {
    duration += Date.now() - recordingState.startTime
  }

  return Math.floor(duration / 1000)
}

export const sendState = () => {
  const state = {
    isRecording: recordingState.isRecording,
    isPaused: recordingState.isPaused,
    duration: calculateDuration(),
    recordingType: recordingState.recordingType
  };

  broadcastToAllPorts({
    type: 'STATE_UPDATE',
    state
  });
};
