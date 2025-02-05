import { create } from 'zustand';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordingType: 'task' | 'note' | null;
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
  startRecording: (type: 'task' | 'note') => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  incrementDuration: () => void;
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  isRecording: false,
  isPaused: false,
  duration: 0,
  recordingType: null,
  mediaRecorder: null,
  audioChunks: [],
  webhookUrl: '',
  
  setWebhookUrl: (url) => set({ webhookUrl: url }),
  
  startRecording: async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.start(1000);
      
      set({
        isRecording: true,
        recordingType: type,
        mediaRecorder,
        audioChunks,
        duration: 0,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  },

  stopRecording: async () => {
    const { mediaRecorder, audioChunks, webhookUrl, recordingType } = get();
    
    if (!mediaRecorder) return;

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          const response = await fetch(`${webhookUrl}?route=${recordingType}`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload recording');
          }
        } catch (error) {
          console.error('Error uploading recording:', error);
        }

        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        set({
          isRecording: false,
          isPaused: false,
          duration: 0,
          mediaRecorder: null,
          audioChunks: [],
          recordingType: null,
        });
        resolve();
      };

      mediaRecorder.stop();
    });
  },

  pauseRecording: () => {
    const { mediaRecorder } = get();
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      set({ isPaused: true });
    }
  },

  resumeRecording: () => {
    const { mediaRecorder } = get();
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      set({ isPaused: false });
    }
  },

  cancelRecording: () => {
    const { mediaRecorder } = get();
    if (mediaRecorder) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      set({
        isRecording: false,
        isPaused: false,
        duration: 0,
        mediaRecorder: null,
        audioChunks: [],
        recordingType: null,
      });
    }
  },

  incrementDuration: () => {
    const { isRecording, isPaused } = get();
    if (isRecording && !isPaused) {
      set((state) => ({ duration: state.duration + 1 }));
    }
  },
}));