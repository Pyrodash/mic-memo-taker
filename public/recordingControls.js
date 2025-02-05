
import { recordingState, resetState } from './state.js';
import { broadcastToAllPorts, sendState } from './portManager.js';

export const updateBadge = () => {
  if (recordingState.isRecording) {
    chrome.action.setBadgeText({ text: '🎤' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
};

export const startRecording = async (type) => {
  try {
    if (recordingState.isRecording) {
      throw new Error('Recording already in progress');
    }

    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow?.id) {
      throw new Error('Could not determine current window');
    }

    const tabs = await chrome.tabs.query({
      active: true,
      windowId: currentWindow.id
    });

    const tab = tabs[0];
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      throw new Error('Recording is not available on browser system pages');
    }

    console.log('Starting recording of type:', type);
    recordingState.tabId = tab.id;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js']
    });

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'START_RECORDING',
      recordingType: type
    });

    console.log('Start recording response:', response);

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to start recording');
    }

    recordingState.recordingType = type;
    recordingState.startTime = Date.now();
    recordingState.isPaused = false;
    recordingState.isRecording = true;
    updateBadge();
    sendState();
  } catch (error) {
    console.error('Error starting recording:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
  }
};

export const stopRecording = async () => {
  try {
    if (!recordingState.tabId) {
      throw new Error('No active recording found');
    }

    console.log('Stopping recording...');
    const response = await chrome.tabs.sendMessage(recordingState.tabId, { type: 'STOP_RECORDING' });
    
    console.log('Stop recording response:', response);

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to stop recording');
    }

    if (response.blob) {
      try {
        const webhookUrl = await chrome.storage.local.get('webhookUrl');
        if (webhookUrl.webhookUrl) {
          // Convert blob to File with explicit MIME type
          const audioFile = new File([response.blob], "recording.webm", { 
            type: "audio/webm;codecs=opus",
            lastModified: Date.now()
          });

          console.log('Preparing file for upload:', {
            name: audioFile.name,
            size: audioFile.size,
            type: audioFile.type,
            lastModified: audioFile.lastModified
          });

          // Create FormData and append file
          const formData = new FormData();
          formData.append('audio', audioFile);

          // Verify FormData content
          for (let [key, value] of formData.entries()) {
            console.log('FormData entry:', key, value instanceof File ? {
              name: value.name,
              size: value.size,
              type: value.type
            } : value);
          }

          console.log('Sending to webhook:', webhookUrl.webhookUrl);
          const uploadResponse = await fetch(`${webhookUrl.webhookUrl}?route=${recordingState.recordingType}`, {
            method: 'POST',
            body: formData,
          });

          console.log('Webhook response status:', uploadResponse.status);
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload failed:', errorText);
            throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }

          const responseData = await uploadResponse.text();
          console.log('Upload success response:', responseData);
        } else {
          console.warn('No webhook URL configured');
        }
      } catch (error) {
        console.error('Error uploading recording:', error);
        broadcastToAllPorts({ type: 'ERROR', error: error.message });
      }
    } else {
      console.error('No blob received from recording');
      throw new Error('No audio data received');
    }

    resetState();
    updateBadge();
    sendState();
  } catch (error) {
    console.error('Error stopping recording:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
  }
};

export const pauseRecording = async () => {
  try {
    if (!recordingState.tabId) return;
    
    const response = await chrome.tabs.sendMessage(recordingState.tabId, { type: 'PAUSE_RECORDING' });
    if (response?.success) {
      recordingState.isPaused = true;
      sendState();
    }
  } catch (error) {
    console.error('Error pausing recording:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
  }
};

export const resumeRecording = async () => {
  try {
    if (!recordingState.tabId) return;
    
    const response = await chrome.tabs.sendMessage(recordingState.tabId, { type: 'RESUME_RECORDING' });
    if (response?.success) {
      recordingState.isPaused = false;
      sendState();
    }
  } catch (error) {
    console.error('Error resuming recording:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
  }
};

export const cancelRecording = async () => {
  try {
    if (!recordingState.tabId) return;
    
    await chrome.tabs.sendMessage(recordingState.tabId, { type: 'CANCEL_RECORDING' });
    resetState();
    updateBadge();
    sendState();
  } catch (error) {
    console.error('Error canceling recording:', error);
    broadcastToAllPorts({ type: 'ERROR', error: error.message });
  }
};
