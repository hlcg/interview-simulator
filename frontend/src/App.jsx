import React, { useState, useEffect } from 'react';
import './App.css';
import API from './api';
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
        body: JSON.stringify({
  sector: config.sector,
  job_offer: config.jobOffer,
  cv: config.cv,
  duration: config.duration,
  tone: config.tone
})
      });
      
      const data = await response.json();
      setSessionData({ ...config, session_id: data.session_id, answers: [] });
      setCurrentPage('interview');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur au démarrage de la session');
    }
  };

const handleAnswersComplete = async (result) => {
    setReportData({
      report: result.report,
      answers: result.answers,
      config: result.config
    });
    setCurrentPage('report');
    loadHistory();
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
          <ConfigSession onSessionStart={handleStartInterview} />
        )}
        
      {currentPage === 'interview' && sessionData && (
  <InterviewSession 
    config={sessionData}
    onComplete={handleAnswersComplete}
    onCancel={() => {
      setSessionData(null);
      setCurrentPage('config');
    }}
  />
)}
        
        {currentPage === 'report' && reportData && (
        <FinalReport 
    data={reportData}
    onRestart={() => {
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
