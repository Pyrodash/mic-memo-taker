
export const updateBadge = (isRecording) => {
  chrome.action.setBadgeText({ 
    text: isRecording ? '🎤' : '' 
  });
  if (isRecording) {
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }
};
