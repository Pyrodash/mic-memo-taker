import { recordingState, resetState } from './state.js';
import { broadcastToAllPorts, sendState } from './portManager.js';

export const updateBadge = () => {
  chrome.action.setBadgeText({ 
    text: recordingState.isRecording ? '🎤' : '' 
  });
  if (recordingState.isRecording) {
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }
};

export const startRecording = async (type) => {
  try {
    if (recordingState.isRecording) {
      throw new Error('Recording already in progress');
    }

    // Query for current window first
    const windows = await chrome.windows.getCurrent();
    const tabs = await chrome.tabs.query({
      active: true,
      windowId: windows.id
    });

    if (!tabs || tabs.length === 0) {
      throw new Error('No active tab found');
    }

    const tab = tabs[0];
    if (!tab?.id) {
      throw new Error('Invalid tab');
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      throw new Error('Recording not available on browser system pages');
    }

    // Inject content script if not already injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-script.js']
      });
    } catch (error) {
      console.error('Script injection error:', error);
      throw new Error('Failed to initialize recording');
    }

    // Start recording with retry mechanism
    let retries = 2;
    let response;
    
    while (retries >= 0 && !response?.success) {
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          type: 'START_RECORDING'
        });
        
        if (response?.success) break;
        
        console.log(`Retry attempt ${2 - retries}, response:`, response);
        retries--;
        
        if (retries >= 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Start recording attempt failed:', error);
        retries--;
        if (retries < 0) throw error;
      }
    }

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to start recording');
    }

    recordingState.tabId = tab.id;
    recordingState.recordingType = type;
    recordingState.startTime = Date.now();
    recordingState.isRecording = true;
    recordingState.isPaused = false;
    
    updateBadge();
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
      const webhookUrl = await chrome.storage.local.get('webhookUrl');
      if (!webhookUrl.webhookUrl) {
        throw new Error('Webhook URL not configured');
      }

      const formData = new FormData();
      const audioFile = new File([response.blob], 'recording.webm', {
        type: 'audio/webm;codecs=opus',
        lastModified: Date.now()
      });

      formData.append('audio', audioFile);
      
      console.log('Sending to webhook:', webhookUrl.webhookUrl);
      
      const uploadResponse = await fetch(
        `${webhookUrl.webhookUrl}?route=${recordingState.recordingType}`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      console.log('Upload successful');

    } catch (error) {
      console.error('Upload error:', error);
      broadcastToAllPorts({ type: 'ERROR', error: error.message });
    }

    resetState();
    updateBadge();
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
    updateBadge();
    sendState();
  } catch (error) {
    console.error('Cancel error:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
  }
};
