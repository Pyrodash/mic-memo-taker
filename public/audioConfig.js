
export const AUDIO_CONSTRAINTS = {
  channelCount: 1,
  sampleRate: 44100,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

export const RECORDER_OPTIONS = {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 128000
};

export const CHUNK_INTERVAL = 100; // milliseconds
