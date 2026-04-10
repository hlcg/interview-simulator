import React, { useState, useEffect } from 'react';
import { API } from '../api';
import useAudioRecorder from '../hooks/useAudioRecorder';

function InterviewSession({ config, onComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { isRecording, transcript, startRecording, stopRecording, resetTranscript } = useAudioRecorder();

  const questions = config.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Initialiser la session
  useEffect(() => {
    const initSession = async () => {
      try {
        setLoading(true);
        const response = await API.startSession({
          sector: config.sector,
          job_offer: config.jobOffer,
          cv: config.cv,
          duration: config.duration,
          tone: config.tone
        });
        setSessionId(response.session_id);
      } catch (err) {
        console.error('❌ Erreur initialisation session:', err);
        setError('Erreur lors du démarrage de la session');
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [config]);

  // Text-to-Speech pour la question
  const playQuestion = async () => {
    if (!currentQuestion) return;

    try {
      setIsPlaying(true);
      await API.textToSpeech(currentQuestion, 'fr');
      setIsPlaying(false);
    } catch (err) {
      console.error('❌ Erreur TTS:', err);
      setIsPlaying(false);
    }
  };

  // Sauvegarder la réponse
  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) {
      setError('⚠️ Veuillez répondre à la question');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Sauvegarde la réponse
      const response = await API.saveAnswer({
        session_id: sessionId,
        question_num: currentQuestionIndex + 1,
        question: currentQuestion,
        answer: transcript
      });

      // Ajoute la réponse à la liste
      setAnswers([
        ...answers,
        {
          question: currentQuestion,
          answer: transcript,
          score: response.score,
          feedback: response.feedback
        }
      ]);

      // Affiche le feedback
      alert(`Score: ${response.score}/100\n\nFeedback: ${response.feedback}`);

      // Prochaine question ou fin
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        resetTranscript();
      } else {
        handleComplete();
      }
    } catch (err) {
      console.error('❌ Erreur sauvegarde réponse:', err);
      setError('Erreur lors de la sauvegarde de la réponse');
    } finally {
      setLoading(false);
    }
  };

  // Terminer l'entretien
  const handleComplete = async () => {
    try {
      setLoading(true);
      const report = await API.completeSession({
        session_id: sessionId,
        answers: answers,
        tone: config.tone
      });

      onComplete({
        sessionId,
        answers,
        report,
        config
      });
    } catch (err) {
      console.error('❌ Erreur finalisation:', err);
      setError('Erreur lors de la finalisation de l\'entretien');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !sessionId) {
    return <div className="loading">⏳ Initialisation de l'entretien...</div>;
  }

  if (!currentQuestion) {
    return <div className="error">❌ Erreur: Aucune question trouvée</div>;
  }

  return (
    <div className="interview-container">
      <div className="progress-bar">
        <div className="progress" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
      </div>

      <div className="question-counter">
        Question {currentQuestionIndex + 1}/{questions.length}
      </div>

      <div className="question-box">
        <h2>{currentQuestion}</h2>
      </div>

      <div className="button-group">
        <button onClick={playQuestion} disabled={isPlaying || loading} className="play-button">
          {isPlaying ? '🔊 En cours...' : '🔊 Écouter la question'}
        </button>
      </div>

      <div className="recording-box">
        {isRecording ? (
          <button onClick={stopRecording} className="stop-button">
            ⏹️ Arrêter l'enregistrement
          </button>
        ) : (
          <button onClick={startRecording} disabled={loading} className="mic-button">
            🎙️ Enregistrer votre réponse
          </button>
        )}
      </div>

      {transcript && (
        <div className="transcript-box">
          <p><strong>Votre réponse:</strong></p>
          <p>{transcript}</p>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="action-buttons">
        <button
          onClick={handleSubmitAnswer}
          disabled={loading || !transcript}
          className="submit-button"
        >
          {loading ? '⏳ Traitement...' : '✅ Valider la réponse'}
        </button>
      </div>
    </div>
  );
}

export default InterviewSession;
