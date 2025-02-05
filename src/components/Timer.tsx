import { useEffect } from 'react';
import { useRecordingStore } from '../store/recording-store';

export const Timer = () => {
  const { duration, incrementDuration } = useRecordingStore();

  useEffect(() => {
    const interval = setInterval(incrementDuration, 1000);
    return () => clearInterval(interval);
  }, [incrementDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-2xl font-mono text-white">
      {formatTime(duration)}
    </div>
  );
};