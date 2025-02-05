import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useRecordingStore } from '../store/recording-store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export const Settings = () => {
  const { webhookUrl, setWebhookUrl } = useRecordingStore();
  const [tempUrl, setTempUrl] = useState(webhookUrl);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    setWebhookUrl(tempUrl);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:text-gray-300">
          <SettingsIcon className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-recorder-bg text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="webhook" className="text-sm font-medium">
              Webhook URL
            </label>
            <Input
              id="webhook"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter webhook URL"
            />
          </div>
          <Button
            onClick={handleSave}
            className="w-full bg-recorder-red hover:bg-recorder-red/90 text-white"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};