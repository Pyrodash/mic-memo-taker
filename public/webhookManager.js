
export const uploadToWebhook = async (blob, recordingType) => {
  const webhookUrl = await chrome.storage.local.get('webhookUrl');
  if (!webhookUrl.webhookUrl) {
    throw new Error('Webhook URL not configured');
  }

  const formData = new FormData();
  const audioFile = new File([blob], 'recording.webm', {
    type: 'audio/webm;codecs=opus',
    lastModified: Date.now()
  });

  formData.append('audio', audioFile);
  
  console.log('Sending to webhook:', webhookUrl.webhookUrl);
  
  const uploadResponse = await fetch(
    `${webhookUrl.webhookUrl}?route=${recordingType}`,
    {
      method: 'POST',
      body: formData
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.status}`);
  }

  console.log('Upload successful');
};
