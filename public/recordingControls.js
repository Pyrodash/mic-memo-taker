import { recordingState, resetState } from './state.js';
import { broadcastToAllPorts, sendState } from './portManager.js';
import { updateBadge } from './badgeManager.js';
import { findActiveTab } from './tabManager.js';
import { uploadToWebhook } from './webhookManager.js';

export const startRecording = async (type) => {
  try {
    if (recordingState.isRecording) {
      throw new Error('Recording already in progress');
    }

    const existingContexts = await chrome.runtime.getContexts({});
    const offscreenDocument = existingContexts.find(
      (c) => c.contextType === 'OFFSCREEN_DOCUMENT'
    );

    // If an offscreen document is not already open, create one.
    if (!offscreenDocument) {
      // Create an offscreen document.
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Recording from chrome.tabCapture API',
      });
    }

    const activeTab = await findActiveTab();

    console.log('Found active tab:', activeTab.id);

    // Get a MediaStream for the active tab.
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: activeTab.id
    });

    const response = await chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      target: 'offscreen',
      data: streamId,
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to start recording');
    }

    recordingState.tabId = activeTab.id;
    recordingState.recordingType = type;
    recordingState.startTime = Date.now();
    recordingState.isRecording = true;
    recordingState.isPaused = false;
    
    updateBadge(true);
    sendState();

  } catch (error) {
    console.error('Error starting recording:', error);
    resetState();
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
    throw error;
  }
};

export const stopRecording = async () => {
  try {
    if (!recordingState.tabId) {
      throw new Error('No active recording');
    }

    const response = await chrome.runtime.sendMessage({ 
      type: 'STOP_RECORDING',
      target: 'offscreen',
    });

    if (!response?.success || !response.blobData) {
      throw new Error(response?.error || 'Failed to stop recording');
    }

    console.log('Stop recording blob:', {
      size: response.blobData.size,
      type: response.blobData.type
    });

    if (response.blobData.size <= 44) {
      throw new Error('Invalid audio data received');
    }

    try {
      // Convert base64 back to blob
      const binaryStr = atob(response.blobData.data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: response.blobData.type });
      
      await uploadToWebhook(blob, recordingState.recordingType);
    } catch (error) {
      console.error('Upload error:', error);
      broadcastToAllPorts({ type: 'ERROR', error: error.message });
    }

    resetState();
    updateBadge(false);
    sendState();

  } catch (error) {
    console.error('Stop recording error:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
    resetState();
    updateBadge(false);
    sendState();
  }
};

export const pauseRecording = async () => {
  try {
    if (!recordingState.tabId) return;
    
    const response = await chrome.runtime.sendMessage({
      type: 'PAUSE_RECORDING',
      target: 'offscreen',
    });

    if (response?.success) {
      recordingState.isPaused = true;
      recordingState.totalDuration += Date.now() - recordingState.startTime;

      console.log(recordingState.totalDuration)
      sendState();
    }
  } catch (error) {
    console.error('Pause error:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
  }
};

export const resumeRecording = async () => {
  try {
    if (!recordingState.tabId) return;
    
    const response = await chrome.runtime.sendMessage({
      type: 'RESUME_RECORDING',
      target: 'offscreen',
    });

    if (response?.success) {
      recordingState.isPaused = false;
      recordingState.startTime = Date.now();

      sendState();
    }
  } catch (error) {
    console.error('Resume error:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
  }
};

export const cancelRecording = async () => {
  try {
    if (!recordingState.tabId) return;
    
    await chrome.runtime.sendMessage({
      type: 'CANCEL_RECORDING',
      target: 'offscreen',
    });
    
    resetState();
    updateBadge(false);
    sendState();
  } catch (error) {
    console.error('Cancel error:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
    resetState();
    updateBadge(false);
    sendState();
  }
};
