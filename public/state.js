
export let recordingState = {
  isRecording: false,
  isPaused: false,
  startTime: null,
  lastStateUpdate: Date.now(),
  tabId: null,
  recordingType: null
};

export const resetState = () => {
  recordingState.startTime = null;
  recordingState.isPaused = false;
  recordingState.isRecording = false;
  recordingState.recordingType = null;
  recordingState.tabId = null;
};
