import React, { useState, useEffect } from 'react';
import { API } from '../api';

function HistoryPanel({ onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evolution, setEvolution] = useState([]);

  useEffect(() => {
    loadHistory();
    loadEvolution();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await API.getHistory();
      setSessions(response.sessions || []);
    } catch (err) {
      console.error('❌ Erreur chargement historique:', err);
      setError('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const loadEvolution = async () => {
    try {
      const response = await API.getEvolution();
      setEvolution(response.evolution || []);
    } catch (err) {
      console.error('❌ Erreur chargement évolution:', err);
    }
  };

  const handleSelectSession = async (sessionId) => {
    try {
      const response = await API.getSession(sessionId);
      onSelectSession(response);
    } catch (err) {
      console.error('❌ Erreur chargement session:', err);
      setError('Erreur lors du chargement de la session');
    }
  };

  if (loading) {
    return <div className="loading">⏳ Chargement de l'historique...</div>;
  }

  return (
    <div className="history-panel">
      <h2>📚 Historique des entretiens</h2>

      {error && <div className="error-message">{error}</div>}

      {sessions && sessions.length > 0 ? (
        <div className="sessions-list">
          {sessions.map((session, idx) => (
            <div key={idx} className="session-item">
              <div className="session-info">
                <h3>Entretien {idx + 1}</h3>
                <p><strong>Secteur:</strong> {session.sector}</p>
                <p><strong>Ton:</strong> {session.tone}</p>
                <p><strong>Date:</strong> {new Date(session.created_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleSelectSession(session.id)}
                className="view-button"
              >
                👀 Voir détails
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-data">Aucun entretien pour le moment</p>
      )}

      {evolution && evolution.length > 0 && (
        <div className="evolution-section">
          <h2>📈 Évolution des scores</h2>
          <div className="evolution-list">
            {evolution.map((item, idx) => (
              <div key={idx} className="evolution-item">
                <p>Entretien {idx + 1}: <strong>{item.score}/100</strong></p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={loadHistory} className="refresh-button">
        🔄 Actualiser
      </button>
    </div>
  );
}

export default HistoryPanel;
