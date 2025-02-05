
import { create } from 'zustand';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordingType: 'task' | 'note' | null;
  webhookUrl: string;
  port: chrome.runtime.Port | null;
  setWebhookUrl: (url: string) => void;
  startRecording: (type: 'task' | 'note') => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  incrementDuration: () => void;
  setState: (state: Partial<RecordingState>) => void;
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  isRecording: false,
  isPaused: false,
  duration: 0,
  recordingType: null,
  webhookUrl: '',
  port: null,

  setWebhookUrl: async (url) => {
    await chrome.storage.local.set({ webhookUrl: url });
    set({ webhookUrl: url });
  },

  startRecording: async (type) => {
    let port = get().port;
    if (!port) {
      port = chrome.runtime.connect();
      setupPortListeners(port, set);
      set({ port });
    }
    port.postMessage({ type: 'START_RECORDING', recordingType: type });
  },

  stopRecording: async () => {
    const { port } = get();
    if (port) {
      port.postMessage({ type: 'STOP_RECORDING' });
    }
  },

  pauseRecording: () => {
    const { port } = get();
    if (port) {
      port.postMessage({ type: 'PAUSE_RECORDING' });
    }
  },

  resumeRecording: () => {
    const { port } = get();
    if (port) {
      port.postMessage({ type: 'RESUME_RECORDING' });
    }
  },

  cancelRecording: () => {
    const { port } = get();
    if (port) {
      port.postMessage({ type: 'CANCEL_RECORDING' });
    }
  },

  incrementDuration: () => {
    // This is now handled by the background script
  },

  setState: (state) => {
    set(state);
  },
}));

function setupPortListeners(port: chrome.runtime.Port, set: any) {
  port.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'STATE_UPDATE':
        set(msg.state);
        break;
      case 'ERROR':
        // Handle error (you could use the toast here)
        console.error('Recording error:', msg.error);
        break;
    }
  });

  port.onDisconnect.addListener(() => {
    set({ port: null });
  });
}

// Initialize connection and state
if (typeof chrome !== 'undefined' && chrome.runtime) {
  const port = chrome.runtime.connect();
  setupPortListeners(port, useRecordingStore.setState);
  port.postMessage({ type: 'GET_STATE' });

  // Load webhook URL from storage
  chrome.storage.local.get('webhookUrl').then((result) => {
    if (result.webhookUrl) {
      useRecordingStore.setState({ webhookUrl: result.webhookUrl });
    }
  });
}
