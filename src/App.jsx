import React, { useState, useEffect } from 'react';
import './App.css';
import ConfigSession from './components/ConfigSession';
import InterviewSession from './components/InterviewSession';
import FinalReport from './components/FinalReport';
import HistoryPanel from './components/HistoryPanel';

function App() {
  const [currentPage, setCurrentPage] = useState('config'); // config, interview, report, history
  const [sessionData, setSessionData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  const handleStartInterview = async (config) => {
    try {
      // Démarrer une nouvelle session backend
      const response = await fetch('https://interview-backend-production-eaed.up.railway.app/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      setSessionData({ ...config, session_id: data.session_id, answers: [] });
      setCurrentPage('interview');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur au démarrage de la session');
    }
  };

  const handleAnswersComplete = async (answers) => {
    try {
      const response = await fetch('https://interview-backend-production-eaed.up.railway.app/api/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          sector: sessionData.sector,
          job_offer: sessionData.job_offer,
          cv: sessionData.cv,
          answers: answers,
          tone: sessionData.tone
        })
      });
      
      const report = await response.json();
      setReportData({ ...report, session_id: sessionData.session_id });
      setCurrentPage('report');
      
      // Recharger l'historique
      loadHistory();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la génération du rapport');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('https://interview-backend-production-eaed.up.railway.app/api/session/history');
      const data = await response.json();
      setHistoryData(data.sessions || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>🎤 Interview Simulator</h1>
          <p>Entraînement d'entretien d'embauche avec IA</p>
        </div>
      </header>

      <nav className="app-nav">
        <button 
          className={`nav-btn ${currentPage === 'config' ? 'active' : ''}`}
          onClick={() => setCurrentPage('config')}
        >
          ⚙️ Configuration
        </button>
        <button 
          className={`nav-btn ${currentPage === 'interview' ? 'active' : ''}`}
          onClick={() => currentPage !== 'interview' && setCurrentPage('interview')}
          disabled={!sessionData}
        >
          🎙️ Entretien
        </button>
        <button 
          className={`nav-btn ${currentPage === 'report' ? 'active' : ''}`}
          onClick={() => currentPage !== 'report' && setCurrentPage('report')}
          disabled={!reportData}
        >
          📊 Rapport
        </button>
        <button 
          className={`nav-btn ${currentPage === 'history' ? 'active' : ''}`}
          onClick={() => setCurrentPage('history')}
        >
          📈 Historique
        </button>
      </nav>

      <main className="app-main">
        {currentPage === 'config' && (
          <ConfigSession onStart={handleStartInterview} />
        )}
        
        {currentPage === 'interview' && sessionData && (
          <InterviewSession 
            sessionData={sessionData}
            onComplete={handleAnswersComplete}
            onCancel={() => {
              setSessionData(null);
              setCurrentPage('config');
            }}
          />
        )}
        
        {currentPage === 'report' && reportData && (
          <FinalReport 
            report={reportData}
            onNewSession={() => {
              setSessionData(null);
              setReportData(null);
              setCurrentPage('config');
            }}
          />
        )}
        
        {currentPage === 'history' && (
          <HistoryPanel sessions={historyData} />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 Interview Simulator | Powered by Claude AI</p>
      </footer>
    </div>
  );
}

export default App;
