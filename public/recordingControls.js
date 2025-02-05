
import { recordingState, resetState } from './state.js';
import { broadcastToAllPorts, sendState } from './portManager.js';
import { updateBadge } from './badgeManager.js';
import { findActiveTab, injectContentScript } from './tabManager.js';
import { uploadToWebhook } from './webhookManager.js';

export const startRecording = async (type) => {
  try {
    if (recordingState.isRecording) {
      throw new Error('Recording already in progress');
    }

    const activeTab = await findActiveTab();
    console.log('Found active tab:', activeTab.id);

    await injectContentScript(activeTab.id);

    // Start recording with enhanced retry mechanism
    let retries = 3;
    let response = null;
    
    while (retries >= 0 && !response?.success) {
      try {
        console.log('Attempting to start recording, attempt', 3 - retries);
        response = await chrome.tabs.sendMessage(activeTab.id, {
          type: 'START_RECORDING'
        });
        
        if (response?.success) {
          console.log('Recording started successfully');
          break;
        }
        
        console.log('Start recording attempt failed:', response);
        retries--;
        
        if (retries >= 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error('Start recording attempt failed:', error);
        retries--;
        if (retries < 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

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

    const response = await chrome.tabs.sendMessage(recordingState.tabId, { 
      type: 'STOP_RECORDING' 
    });

    if (!response?.success || !response.blob) {
      throw new Error(response?.error || 'Failed to stop recording');
    }

    console.log('Stop recording blob:', {
      size: response.blob.size,
      type: response.blob.type
    });

    if (response.blob.size <= 44) {
      throw new Error('Invalid audio data received');
    }

    try {
      await uploadToWebhook(response.blob, recordingState.recordingType);
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
  }
};

export const pauseRecording = async () => {
  try {
    if (!recordingState.tabId) return;
    
    const response = await chrome.tabs.sendMessage(recordingState.tabId, {
      type: 'PAUSE_RECORDING'
    });

    if (response?.success) {
      recordingState.isPaused = true;
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
    
    const response = await chrome.tabs.sendMessage(recordingState.tabId, {
      type: 'RESUME_RECORDING'
    });

    if (response?.success) {
      recordingState.isPaused = false;
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
    
    await chrome.tabs.sendMessage(recordingState.tabId, {
      type: 'CANCEL_RECORDING'
    });
    
    resetState();
    updateBadge(false);
    sendState();
  } catch (error) {
    console.error('Cancel error:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
  }
};
