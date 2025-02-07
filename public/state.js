
export let recordingState = {
  isRecording: false,
  isPaused: false,
  startTime: null,
  totalDuration: 0,
  lastStateUpdate: Date.now(),
  tabId: null,
  recordingType: null
};

export const resetState = () => {
  recordingState.startTime = null;
  recordingState.totalDuration = 0;
  recordingState.isPaused = false;
  recordingState.isRecording = false;
  recordingState.recordingType = null;
  recordingState.tabId = null;
};
