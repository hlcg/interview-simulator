import { useState, useRef, useCallback } from 'react';

function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const startRecording = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('La reconnaissance vocale n\'est pas supportée sur ce navigateur. Utilisez Chrome ou Edge.');
      return;
    }

    try {
      // Vérifier accès micro
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalTranscript = '';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Erreur reconnaissance vocale:', event.error);
        if (event.error === 'not-allowed') {
          alert('Accès au microphone refusé. Autorisez le microphone dans les paramètres du navigateur.');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);

    } catch (error) {
      console.error('Erreur accès microphone:', error);
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
    resetTranscript
  };
}

export default useAudioRecorder;
