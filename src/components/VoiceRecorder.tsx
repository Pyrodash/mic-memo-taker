import { Mic, Pause, Play, Square, X } from 'lucide-react';
import { useRecordingStore } from '../store/recording-store';
import { Button } from './ui/button';
import { Timer } from './Timer';
import { Settings } from './Settings';
import { toast } from './ui/use-toast';

export const VoiceRecorder = () => {
  const {
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    webhookUrl,
  } = useRecordingStore();

  const handleStartRecording = async (type: 'task' | 'note') => {
    if (!webhookUrl) {
      toast({
        title: "Webhook URL Required",
        description: "Please set a webhook URL in settings first.",
        variant: "destructive",
      });
      return;
    }
    await startRecording(type);
  };

  if (isRecording) {
    return (
      <div className="w-[400px] h-[300px] bg-recorder-bg rounded-lg p-6 relative">
        <Settings />
        <div className="flex flex-col items-center justify-between h-full">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-recorder-red animate-blink" />
            <span className="text-white text-lg">Recording {isPaused ? '(paused)' : ''}</span>
          </div>
          
          <Timer />
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="bg-recorder-blue hover:bg-recorder-blue/90 text-white border-none"
            >
              {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={stopRecording}
              className="bg-recorder-red hover:bg-recorder-red/90 text-white border-none"
            >
              <Square className="h-6 w-6 mr-2" />
              Stop
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={cancelRecording}
              className="bg-gray-700 hover:bg-gray-600 text-white border-none"
            >
              <X className="h-6 w-6 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] h-[300px] bg-recorder-bg rounded-lg p-6 relative">
      <Settings />
      <div className="flex flex-col items-center justify-between h-full">
        <h1 className="text-2xl font-bold text-white">Voice Recorder</h1>
        
        <div className="grid grid-cols-2 gap-4 w-full">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleStartRecording('task')}
            className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
          >
            📋 Task
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleStartRecording('note')}
            className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
          >
            📝 Note
          </Button>
        </div>
      </div>
    </div>
  );
};