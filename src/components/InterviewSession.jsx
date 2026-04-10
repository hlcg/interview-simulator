import React, { useState, useRef, useEffect } from 'react';
import useAudioRecorder from '../hooks/useAudioRecorder';

function InterviewSession({ sessionData, onComplete, onCancel }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAI, setIsPlayingAI] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [loading, setLoading] = useState(false);
  const audioPlayerRef = useRef(null);
  const { startRecording, stopRecording, recordedBlob } = useAudioRecorder();

  const questions = sessionData.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Générer et jouer la question avec TTS
  useEffect(() => {
    if (currentQuestion && !isPlayingAI) {
      playQuestionWithAI();
    }
  }, [currentQuestion]);

  const playQuestionWithAI = async () => {
    try {
      setIsPlayingAI(true);
      
      const response = await fetch(
        'https://interview-backend-production-eaed.up.railway.app/api/tts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: currentQuestion })
        }
      );

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.play();
      }
    } catch (error) {
      console.error('Erreur TTS:', error);
      alert('Erreur lors de la génération de la voix IA');
    } finally {
      setIsPlayingAI(false);
    }
  };

  const handleStartRecording = () => {
    setRecordedAudio(null);
    startRecording();
    setIsRecording(true);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    const blob = await stopRecording();
    setRecordedAudio(blob);

    // Convertir le blob en texte (Web Speech API simple)
    // En production, utiliser une API STT (Whisper, Google, etc.)
    await transcribeAudio(blob);
  };

  const transcribeAudio = async (blob) => {
    try {
      setLoading(true);
      // Simuler une transcription (en production, utiliser Whisper API)
      // Pour le moment, on demande simplement à l'utilisateur de transcrire
      const userText = prompt('Transcrivez votre réponse (ou appuyez sur Annuler pour ignorer):');
      
      if (userText) {
        await analyzeAnswer(userText);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeAnswer = async (answer) => {
    try {
      setLoading(true);
      
      const response = await fetch(
        'https://interview-backend-production-eaed.up.railway.app/api/analyze-answer',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: currentQuestion,
            answer,
            tone: sessionData.tone
          })
        }
      );

      const analysis = await response.json();

      // Sauvegarder la réponse
      const newAnswer = {
        question: currentQuestion,
        answer,
        score: analysis.score,
        feedback: analysis.feedback
      };

      setAnswers([...answers, newAnswer]);

      // Passer à la question suivante ou terminer
      if (isLastQuestion) {
        onComplete([...answers, newAnswer]);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setRecordedAudio(null);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'analyse de la réponse');
    } finally {
      setLoading(false);
    }
  };

  const playRecordedAudio = () => {
    if (recordedAudio) {
      const url = URL.createObjectURL(recordedAudio);
      const audio = new Audio(url);
      audio.play();
    }
  };

  const skipQuestion = () => {
    const skipAnswer = {
      question: currentQuestion,
      answer: '[Réponse ignorée]',
      score: 0,
      feedback: 'Vous avez choisi de sauter cette question'
    };

    setAnswers([...answers, skipAnswer]);

    if (isLastQuestion) {
      onComplete([...answers, skipAnswer]);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setRecordedAudio(null);
    }
  };

  return (
    <div className="interview-container">
      <div className="interview-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <p>Question {currentQuestionIndex + 1} / {questions.length}</p>
      </div>

      <div className="interview-main">
        <div className="question-card">
          <h2>🎤 Question {currentQuestionIndex + 1}</h2>
          <div className="question-text">
            <p>{currentQuestion}</p>
          </div>

          <div className="ai-voice-control">
            <button 
              className="btn btn-secondary"
              onClick={playQuestionWithAI}
              disabled={isPlayingAI}
            >
              🔊 Réécouter la question
            </button>
            <audio 
              ref={audioPlayerRef}
              onEnded={() => setIsPlayingAI(false)}
            />
          </div>
        </div>

        <div className="answer-card">
          <h3>🎙️ Votre Réponse</h3>

          {!recordedAudio ? (
            <div className="recording-section">
              {!isRecording ? (
                <button
                  className="btn btn-primary btn-large"
                  onClick={handleStartRecording}
                  disabled={loading}
                >
                  🎙️ Commencer l'enregistrement
                </button>
              ) : (
                <div className="recording-active">
                  <div className="recording-indicator">
                    <div className="recording-dot" />
                    En cours d'enregistrement...
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={handleStopRecording}
                  >
                    ⏹️ Arrêter l'enregistrement
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="answer-playback">
              <p className="success-message">✅ Enregistrement réussi</p>
              <button
                className="btn btn-secondary"
                onClick={playRecordedAudio}
              >
                🔊 Écouter votre réponse
              </button>

              <button
                className="btn btn-primary"
                onClick={() => setRecordedAudio(null)}
              >
                🔄 Réenregistrer
              </button>

              <button
                className={`btn btn-success ${loading ? 'disabled' : ''}`}
                onClick={() => handleStopRecording()}
                disabled={loading}
              >
                {loading ? '⏳ Analyse en cours...' : '✅ Valider la réponse'}
              </button>
            </div>
          )}
        </div>

        <div className="actions">
          <button 
            className="btn btn-outline"
            onClick={skipQuestion}
            disabled={loading || isRecording}
          >
            ⏭️ Sauter cette question
          </button>
          
          <button 
            className="btn btn-danger"
            onClick={onCancel}
            disabled={loading || isRecording}
          >
            ❌ Terminer l'entretien
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewSession;
