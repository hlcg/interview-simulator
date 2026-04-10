import React from 'react';

function FinalReport({ report, onNewSession }) {
  const getScoreColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Vert
    if (score >= 60) return '#FFC107'; // Orange
    return '#F44336'; // Rouge
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Bon';
    if (score >= 40) return 'Acceptable';
    return 'À améliorer';
  };

  const ScoreGauge = ({ score, label }) => (
    <div className="score-gauge">
      <div className="gauge-circle" style={{ borderColor: getScoreColor(score) }}>
        <div className="gauge-value">{score}</div>
        <div className="gauge-max">/100</div>
      </div>
      <div className="gauge-label">{label}</div>
      <div className="gauge-status" style={{ color: getScoreColor(score) }}>
        {getScoreLabel(score)}
      </div>
    </div>
  );

  return (
    <div className="report-container">
      <div className="report-header">
        <h1>📊 Rapport Final d'Entretien</h1>
        <p className="report-subtitle">Analyse complète de votre performance</p>
      </div>

      {/* Score Global */}
      <section className="report-section score-section">
        <h2>Score Global</h2>
        <div className="score-display">
          <div className="main-score">
            <div 
              className="main-gauge"
              style={{ 
                background: `conic-gradient(${getScoreColor(report.overallScore)} 0deg ${(report.overallScore / 100) * 360}deg, #e0e0e0 ${(report.overallScore / 100) * 360}deg)`
              }}
            >
              <div className="main-gauge-inner">
                <span className="main-score-value">{report.overallScore}</span>
                <span className="main-score-label">/100</span>
              </div>
            </div>
            <div className="main-status">
              <h3 style={{ color: getScoreColor(report.overallScore) }}>
                {getScoreLabel(report.overallScore)}
              </h3>
            </div>
          </div>

          {/* Scores détaillés */}
          <div className="scores-grid">
            <ScoreGauge 
              score={report.communicationScore} 
              label="Communication"
            />
            <ScoreGauge 
              score={report.technicalScore} 
              label="Compétences"
            />
            <ScoreGauge 
              score={report.culturalFitScore} 
              label="Adéquation"
            />
          </div>
        </div>
      </section>

      {/* Résumé */}
      <section className="report-section summary-section">
        <h2>📝 Résumé</h2>
        <div className="summary-box">
          <p>{report.summary}</p>
        </div>
      </section>

      {/* Forces */}
      <section className="report-section strengths-section">
        <h2>💪 Points Forts</h2>
        <ul className="strengths-list">
          {report.strengths && report.strengths.map((strength, idx) => (
            <li key={idx}>
              <span className="strength-icon">✓</span>
              <span>{strength}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Axes d'amélioration */}
      <section className="report-section improvements-section">
        <h2>🎯 Axes d'Amélioration</h2>
        <ul className="improvements-list">
          {report.improvements && report.improvements.map((improvement, idx) => (
            <li key={idx}>
              <span className="improvement-icon">→</span>
              <span>{improvement}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Recommandation */}
      <section className="report-section recommendation-section">
        <h2>📌 Recommandation</h2>
        <div className="recommendation-box">
          <p>{report.recommendation}</p>
        </div>
      </section>

      {/* Actions */}
      <section className="report-actions">
        <button 
          className="btn btn-primary"
          onClick={onNewSession}
        >
          🔄 Commencer un nouvel entretien
        </button>
        <button 
          className="btn btn-secondary"
          onClick={() => window.print()}
        >
          🖨️ Imprimer le rapport
        </button>
      </section>
    </div>
  );
}

export default FinalReport;
