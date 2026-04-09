import React, { useState, useRef, useEffect } from 'react';

// URL de l'API - peut venir de l'environnement ou par défaut
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

console.log('🔗 API URL:', API_URL);

export default function InterviewApp() {
  const [phase, setPhase] = useState('setup'); // setup, interview, report
  const [cv, setCv] = useState('');
  const [jobOffer, setJobOffer] = useState('');
  const [sector, setSector] = useState('');
  const [duration, setDuration] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Reconnaissance vocale non supportée par ce navigateur');
      return false;
    }
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'fr-FR';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onstart = () => {
      setTranscript('');
    };

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptSegment + ' ';
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      setError(`Erreur de reconnaissance: ${event.error}`);
    };

    return true;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      setError('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          resolve();
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    });
  };

  const generateQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sector,
          job_offer: jobOffer,
          cv: cv,
          duration
        })
      });

      if (!response.ok) throw new Error('Erreur serveur');
      
      const data = await response.json();
      setQuestions(data.questions);
      setPhase('interview');
    } catch (err) {
      setError('Erreur lors de la génération des questions. Vérifiez la connexion au serveur.');
      console.error(err);
    }
    setLoading(false);
  };

  const handleAnswerComplete = async () => {
    if (!transcript.trim()) {
      setError('Veuillez enregistrer une réponse');
      return;
    }

    await stopRecording();
    
    const newAnswer = {
      question: questions[currentQuestionIndex],
      answer: transcript
    };
    setAnswers([...answers, newAnswer]);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTranscript('');
      setError('');
    } else {
      await generateReport([...answers, newAnswer]);
    }
  };

  const generateReport = async (finalAnswers) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sector,
          job_offer: jobOffer,
          cv: cv,
          answers: finalAnswers
        })
      });

      if (!response.ok) throw new Error('Erreur serveur');
      
      const reportData = await response.json();
      setReport(reportData);
      setPhase('report');
    } catch (err) {
      setError('Erreur lors de la génération du rapport');
      console.error(err);
    }
    setLoading(false);
  };

  const handleStartInterview = () => {
    if (!cv.trim() || !jobOffer.trim() || !sector.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (!initSpeechRecognition()) {
      return;
    }
    setError('');
    generateQuestions();
  };

  const handleRestart = () => {
    setPhase('setup');
    setCv('');
    setJobOffer('');
    setSector('');
    setDuration(10);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setTranscript('');
    setReport(null);
    setError('');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        
        .setup-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #e0e0e0;
          padding: 2rem;
          gap: 1.5rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .input-group label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        
        .input-group input,
        .input-group textarea,
        .input-group select {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          font-family: system-ui, sans-serif;
        }
        
        .input-group input:focus,
        .input-group textarea:focus,
        .input-group select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }
        
        .input-group textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        .button {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .button:hover {
          border-color: #bbb;
          background: #f8f8f8;
        }
        
        .button-primary {
          background: #007bff;
          color: white;
          border: 1px solid #007bff;
        }
        
        .button-primary:hover {
          background: #0056b3;
          border-color: #0056b3;
        }
        
        .button-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .button-danger {
          background: #dc3545;
          color: white;
          border: 1px solid #dc3545;
        }
        
        .button-danger:hover {
          background: #c82333;
        }
        
        .interview-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .progress-bar {
          background: #e9ecef;
          border-radius: 8px;
          height: 8px;
          overflow: hidden;
        }
        
        .progress-fill {
          background: #007bff;
          height: 100%;
          transition: width 0.3s;
        }
        
        .question-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e0e0e0;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .question-number {
          font-size: 12px;
          color: #666;
          margin-bottom: 0.5rem;
        }
        
        .question-text {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 2rem;
          color: #333;
        }
        
        .transcript-display {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1rem;
          min-height: 80px;
          color: #333;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          border: 1px solid #e9ecef;
        }
        
        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #dc3545;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 1rem;
        }
        
        .recording-dot {
          width: 12px;
          height: 12px;
          background: #dc3545;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .button-group {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .report-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .score-card {
          background: #f0f7ff;
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          border: 1px solid #d0e8ff;
        }
        
        .score-number {
          font-size: 36px;
          font-weight: 700;
          color: #007bff;
          margin-bottom: 0.5rem;
        }
        
        .score-label {
          font-size: 13px;
          color: #666;
        }
        
        .scores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .list-item {
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 14px;
          color: #333;
          margin-bottom: 0.5rem;
          border-left: 3px solid #007bff;
          padding-left: 1rem;
        }
        
        .list-section {
          margin-bottom: 2rem;
        }
        
        .list-section h3 {
          margin: 0 0 1rem 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        .error {
          background: #f8d7da;
          color: #721c24;
          padding: 1rem;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 1rem;
          border: 1px solid #f5c6cb;
        }
        
        .loading {
          text-align: center;
          color: #666;
          padding: 2rem;
        }
        
        .title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 2rem;
          color: #333;
        }
        
        .summary-text {
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          border: 1px solid #e9ecef;
        }
      `}</style>

      <h1 className="title">🎤 Simulateur d'Entretien RH</h1>

      {error && <div className="error">{error}</div>}

      {phase === 'setup' && (
        <div className="setup-container">
          <div className="input-group">
            <label>Secteur / Poste recherché *</label>
            <input
              type="text"
              placeholder="Ex: Développeur Senior React, Data Scientist, Product Manager..."
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Offre d'emploi (coller le texte) *</label>
            <textarea
              placeholder="Collez la description du poste..."
              value={jobOffer}
              onChange={(e) => setJobOffer(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Votre CV (texte ou résumé) *</label>
            <textarea
              placeholder="Collez votre CV ou un résumé de votre profil..."
              value={cv}
              onChange={(e) => setCv(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Durée de l'entretien *</label>
            <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
              <option value={5}>5 minutes (1 question)</option>
              <option value={10}>10 minutes (3 questions)</option>
              <option value={15}>15 minutes (5 questions)</option>
            </select>
          </div>

          <button
            className="button button-primary"
            onClick={handleStartInterview}
            disabled={loading}
          >
            {loading ? 'Préparation...' : '▶️ Démarrer l\'entretien'}
          </button>
        </div>
      )}

      {phase === 'interview' && questions.length > 0 && (
        <div className="interview-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`
              }}
            />
          </div>

          <div className="question-card">
            <div className="question-number">
              Question {currentQuestionIndex + 1} / {questions.length}
            </div>
            <div className="question-text">
              {questions[currentQuestionIndex]}
            </div>

            {isRecording && (
              <div className="recording-indicator">
                <div className="recording-dot" />
                Enregistrement en cours...
              </div>
            )}

            <div className="transcript-display">
              {transcript || '🎧 Votre réponse apparaîtra ici en direct...'}
            </div>

            <div className="button-group">
              {!isRecording ? (
                <button className="button button-primary" onClick={startRecording}>
                  🎤 Démarrer l'enregistrement
                </button>
              ) : (
                <>
                  <button
                    className="button button-danger"
                    onClick={stopRecording}
                  >
                    ⏹ Arrêter
                  </button>
                  <button
                    className="button button-primary"
                    onClick={handleAnswerComplete}
                    disabled={!transcript.trim()}
                  >
                    ✓ Réponse terminée
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === 'report' && report && (
        <div className="report-container">
          <div className="question-card">
            <h2 style={{ marginTop: 0 }}>📊 Rapport d'Entretien</h2>

            <div className="scores-grid">
              <div className="score-card">
                <div className="score-number">{report.overallScore}</div>
                <div className="score-label">Score global</div>
              </div>
              <div className="score-card">
                <div className="score-number">{report.communicationScore}</div>
                <div className="score-label">Communication</div>
              </div>
              <div className="score-card">
                <div className="score-number">{report.technicalScore}</div>
                <div className="score-label">Compétences</div>
              </div>
              <div className="score-card">
                <div className="score-number">{report.culturalFitScore}</div>
                <div className="score-label">Adéquation</div>
              </div>
            </div>

            <div className="list-section">
              <h3>✨ Points forts</h3>
              {report.strengths.map((strength, i) => (
                <div key={i} className="list-item">• {strength}</div>
              ))}
            </div>

            <div className="list-section">
              <h3>📈 Axes d'amélioration</h3>
              {report.improvements.map((improvement, i) => (
                <div key={i} className="list-item">• {improvement}</div>
              ))}
            </div>

            <div className="list-section">
              <h3>📝 Résumé</h3>
              <div className="summary-text">{report.summary}</div>
            </div>

            <div className="list-section">
              <h3>💬 Recommandation</h3>
              <div className="summary-text">{report.recommendation}</div>
            </div>

            <button className="button button-primary" onClick={handleRestart}>
              🔄 Nouvel entretien
            </button>
          </div>
        </div>
      )}

      {loading && !report && (
        <div className="loading">
          ⏳ Préparation en cours... (peut prendre quelques secondes)
        </div>
      )}
    </div>
  );
}