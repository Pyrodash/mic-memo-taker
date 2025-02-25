export const AUDIO_CONSTRAINTS = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000
};

export const RECORDER_OPTIONS = {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 128000
};

// Use smaller chunks for more frequent data collection
export const CHUNK_INTERVAL = 100; // 100ms chunks for more frequent data collection
