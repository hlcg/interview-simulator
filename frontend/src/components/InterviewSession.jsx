import React, { useState, useEffect, useRef } from 'react';
import { API } from '../api';
import useAudioRecorder from '../hooks/useAudioRecorder';

function InterviewSession({ config, onComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const answersRef = useRef([]);

  const { isRecording, transcript, startRecording, stopRecording, resetTranscript } = useAudioRecorder();

  const questions = config.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Sync answersRef with answers state
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || sessionEnded) return;
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, sessionEnded]);

  const handleTimeUp = async () => {
    if (sessionEnded) return;
    setSessionEnded(true);
    setTimerActive(false);
    await finalizeSession(answersRef.current);
  };

  // Init session
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
        setTimerActive(true);
      } catch (err) {
        console.error('Erreur initialisation session:', err);
        setError('Erreur lors du démarrage de la session');
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const timerColor = timeLeft < 60 ? '#ef4444' : timeLeft < 120 ? '#f59e0b' : '#22c55e';

  const playQuestion = async () => {
    if (!currentQuestion) return;
    try {
      setIsPlaying(true);
      const response = await API.textToSpeech(currentQuestion, 'fr');
      if (response.audio) {
        const bytes = new Uint8Array(response.audio.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
        audio.play();
      } else {
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('Erreur TTS:', err);
      setIsPlaying(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) {
      setError('Veuillez répondre à la question');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const response = await API.saveAnswer({
        session_id: sessionId,
        question_num: currentQuestionIndex + 1,
        question: currentQuestion,
        answer: transcript,
        tone: config.tone
      });

      const newAnswer = {
        question: currentQuestion,
        answer: transcript,
        score: response.score,
        feedback: response.feedback
      };

      const updatedAnswers = [...answersRef.current, newAnswer];
      setAnswers(updatedAnswers);
      answersRef.current = updatedAnswers;

      if (currentQuestionIndex < questions.length - 1 && !sessionEnded) {
        setCurrentQuestionIndex(prev => prev + 1);
        resetTranscript();
      } else {
        setSessionEnded(true);
        setTimerActive(false);
        await finalizeSession(updatedAnswers);
      }
    } catch (err) {
      console.error('Erreur sauvegarde réponse:', err);
      setError('Erreur lors de la sauvegarde de la réponse');
    } finally {
      setLoading(false);
    }
  };

  const finalizeSession = async (finalAnswers) => {
    try {
      setLoading(true);
      const report = await API.completeSession({
        session_id: sessionId,
        answers: finalAnswers,
        tone: config.tone,
        sector: config.sector
      });
      onComplete({ sessionId, answers: finalAnswers, report, config });
    } catch (err) {
      console.error('Erreur finalisation:', err);
      setError("Erreur lors de la génération du rapport");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !sessionId) {
    return <div className="loading">⏳ Initialisation de l'entretien...</div>;
  }

  if (sessionEnded && loading) {
    return <div className="loading">⏳ Génération du rapport final...</div>;
  }

  if (!currentQuestion) {
    return <div className="error">❌ Erreur: Aucune question trouvée</div>;
  }

  return (
    <div className="interview-container">

      {/* Timer */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '1rem',
        padding: '12px',
        background: '#f8f8f8',
        borderRadius: '8px'
      }}>
        <span style={{ fontSize: '14px', color: '#666' }}>⏱ Temps restant :</span>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: timerColor, fontFamily: 'monospace' }}>
          {formatTime(timeLeft)}
        </span>
        {timeLeft < 60 && <span style={{ fontSize: '13px', color: '#ef4444' }}>⚠️ Dernière minute !</span>}
      </div>

      <div className="progress-bar">
        <div className="progress" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
      </div>

      <div className="question-counter">
        Question {currentQuestionIndex + 1}/{questions.length}
        {answers.length > 0 && <span style={{ marginLeft: '12px', color: '#666', fontSize: '12px' }}>({answers.length} réponse(s) enregistrée(s))</span>}
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
          <p><strong>Votre réponse :</strong></p>
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
          {loading ? '⏳ Traitement...' : currentQuestionIndex < questions.length - 1 ? '✅ Valider et question suivante' : '🏁 Terminer l\'entretien'}
        </button>
      </div>

    </div>
  );
}

export default InterviewSession;
