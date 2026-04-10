import React, { useState } from 'react';

function HistoryPanel({ sessions }) {
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);

  const handleSelectSession = async (sessionId) => {
    try {
      const response = await fetch(
        `https://interview-backend-production-eaed.up.railway.app/api/session/${sessionId}`
      );
      const data = await response.json();
      setSelectedSession(sessionId);
      setSessionDetails(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    return '#F44336';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Bon';
    if (score >= 40) return 'Acceptable';
    return 'À améliorer';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateEvolution = () => {
    if (sessions.length < 2) return null;

    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );

    const firstScore = sortedSessions[0].overall_score || 0;
    const lastScore = sortedSessions[sortedSessions.length - 1].overall_score || 0;
    const evolution = lastScore - firstScore;

    return { evolution, firstScore, lastScore };
  };

  const evolution = calculateEvolution();

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>📈 Historique des Entretiens</h1>
        <p>Suivi de votre progression</p>
      </div>

      {/* Évolution globale */}
      {evolution && (
        <section className="evolution-section">
          <h2>📊 Votre Évolution</h2>
          <div className="evolution-stats">
            <div className="evolution-item">
              <div className="evolution-label">Score Initial</div>
              <div className="evolution-value" style={{ color: getScoreColor(evolution.firstScore) }}>
                {evolution.firstScore}/100
              </div>
            </div>
            
            <div className="evolution-item">
              <div className="evolution-arrow">
                {evolution.evolution > 0 ? '📈' : evolution.evolution < 0 ? '📉' : '➡️'}
              </div>
              <div 
                className="evolution-change"
                style={{ 
                  color: evolution.evolution > 0 ? '#4CAF50' : evolution.evolution < 0 ? '#F44336' : '#666'
                }}
              >
                {evolution.evolution > 0 ? '+' : ''}{evolution.evolution}
              </div>
            </div>

            <div className="evolution-item">
              <div className="evolution-label">Score Actuel</div>
              <div className="evolution-value" style={{ color: getScoreColor(evolution.lastScore) }}>
                {evolution.lastScore}/100
              </div>
            </div>
          </div>
        </section>
      )}

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>📭 Aucun entretien enregistré pour le moment</p>
          <p>Commencez un entretien pour voir votre historique ici</p>
        </div>
      ) : (
        <div className="history-grid">
          {/* Liste des sessions */}
          <div className="sessions-list">
            <h2>Sessions Passées</h2>
            {sessions.map((session, idx) => (
              <div
                key={session.id}
                className={`session-item ${selectedSession === session.id ? 'active' : ''}`}
                onClick={() => handleSelectSession(session.id)}
              >
                <div className="session-header">
                  <span className="session-number">#{sessions.length - idx}</span>
                  <span className="session-sector">{session.sector}</span>
                </div>
                <div className="session-meta">
                  <span className="session-date">{formatDate(session.created_at)}</span>
                  <span className="session-tone">{session.tone}</span>
                </div>
                {session.overall_score !== null && (
                  <div className="session-score">
                    <div 
                      className="score-badge"
                      style={{ 
                        background: getScoreColor(session.overall_score),
                        color: 'white'
                      }}
                    >
                      {session.overall_score}
                    </div>
                    <span className="score-label">
                      {getScoreLabel(session.overall_score)}
                    </span>
                  </div>
                )}
                {!session.completed_at && (
                  <span className="session-status">⏳ En cours...</span>
                )}
              </div>
            ))}
          </div>

          {/* Détails de la session sélectionnée */}
          {selectedSession && sessionDetails && (
            <div className="session-details">
              <h2>Détails Session #{sessions.length - sessions.findIndex(s => s.id === selectedSession)}</h2>
              
              <div className="session-info">
                <div className="info-item">
                  <label>Secteur/Poste</label>
                  <p>{sessionDetails.session.sector}</p>
                </div>
                
                <div className="info-item">
                  <label>Ton utilisé</label>
                  <p className="tone-badge">{sessionDetails.session.tone}</p>
                </div>
                
                <div className="info-item">
                  <label>Date</label>
                  <p>{formatDate(sessionDetails.session.created_at)}</p>
                </div>

                <div className="info-item">
                  <label>Durée</label>
                  <p>{sessionDetails.session.duration} minutes</p>
                </div>
              </div>

              {/* Scores détaillés */}
              {sessionDetails.session.overall_score !== null && (
                <div className="scores-breakdown">
                  <h3>Résultats</h3>
                  <div className="score-row">
                    <span>Score Global</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ 
                          width: `${sessionDetails.session.overall_score}%`,
                          background: getScoreColor(sessionDetails.session.overall_score)
                        }}
                      />
                    </div>
                    <span className="score-number">
                      {sessionDetails.session.overall_score}/100
                    </span>
                  </div>

                  <div className="score-row">
                    <span>Communication</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ 
                          width: `${sessionDetails.session.communication_score}%`,
                          background: getScoreColor(sessionDetails.session.communication_score)
                        }}
                      />
                    </div>
                    <span className="score-number">
                      {sessionDetails.session.communication_score}/100
                    </span>
                  </div>

                  <div className="score-row">
                    <span>Compétences Techniques</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ 
                          width: `${sessionDetails.session.technical_score}%`,
                          background: getScoreColor(sessionDetails.session.technical_score)
                        }}
                      />
                    </div>
                    <span className="score-number">
                      {sessionDetails.session.technical_score}/100
                    </span>
                  </div>

                  <div className="score-row">
                    <span>Adéquation Culturelle</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ 
                          width: `${sessionDetails.session.cultural_fit_score}%`,
                          background: getScoreColor(sessionDetails.session.cultural_fit_score)
                        }}
                      />
                    </div>
                    <span className="score-number">
                      {sessionDetails.session.cultural_fit_score}/100
                    </span>
                  </div>
                </div>
              )}

              {/* Questions et réponses */}
              {sessionDetails.answers && sessionDetails.answers.length > 0 && (
                <div className="answers-list">
                  <h3>Questions & Réponses</h3>
                  {sessionDetails.answers.map((answer, idx) => (
                    <div key={idx} className="answer-item">
                      <div className="question-text">
                        <strong>Q{idx + 1}:</strong> {answer.question}
                      </div>
                      <div className="answer-text">
                        <strong>Votre réponse:</strong> {answer.answer}
                      </div>
                      {answer.feedback && (
                        <div className="answer-feedback">
                          <strong>Feedback:</strong> {answer.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HistoryPanel;
