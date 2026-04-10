import { useState, useRef } from 'react';

function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      
      // Créer le MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (error) => {
        console.error('Erreur enregistrement:', error);
      };

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Erreur accès microphone:', error);
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = async () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current.mimeType;
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Arrêter le stream
        mediaStreamRef.current.getTracks().forEach(track => track.stop());

        setIsRecording(false);
        chunksRef.current = [];

        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  };

  const recordedBlob = chunksRef.current.length > 0 
    ? new Blob(chunksRef.current) 
    : null;

  return {
    startRecording,
    stopRecording,
    isRecording,
    recordedBlob
  };
}

export default useAudioRecorder;
