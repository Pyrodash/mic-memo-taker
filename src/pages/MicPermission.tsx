import { useEffect } from "react";

const MicPermission = () => {
  useEffect(() => {
    async function requestPermission() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })

        window.close()
      }
      catch (err) {
        console.error('Microphone permission denied')
      }
    }

    requestPermission()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Permission Error</h1>
        <p className="text-xl text-gray-600 mb-4">Please grant the microphone permission</p>
      </div>
    </div>
  );
};

export default MicPermission;
