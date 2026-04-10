import React from 'react';

function FinalReport({ data, onRestart }) {
  const { report, answers, config } = data;

  if (!report) {
    return <div className="error">❌ Erreur: Rapport non disponible</div>;
  }

  return (
    <div className="report-container">
      <h1>📊 Rapport d'entretien</h1>

      <div className="report-section">
        <h2>📈 Score global</h2>
        <div className="score-display">
          <div className="score-value">{report.overall_score || 'N/A'}/100</div>
          <div className="score-bar">
            <div
              className="score-fill"
              style={{ width: `${report.overall_score || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="report-section">
        <h2>📝 Résumé</h2>
        <p>{report.summary || 'Pas de résumé disponible'}</p>
      </div>

      {report.strengths && report.strengths.length > 0 && (
        <div className="report-section">
          <h2>✅ Points forts</h2>
          <ul>
            {report.strengths.map((strength, idx) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {report.improvements && report.improvements.length > 0 && (
        <div className="report-section">
          <h2>🎯 Points à améliorer</h2>
          <ul>
            {report.improvements.map((improvement, idx) => (
              <li key={idx}>{improvement}</li>
            ))}
          </ul>
        </div>
      )}

      {report.recommendation && (
        <div className="report-section">
          <h2>💡 Recommandations</h2>
          <p>{report.recommendation}</p>
        </div>
      )}

      <div className="report-section">
        <h2>📋 Détail des réponses</h2>
        {answers && answers.map((answer, idx) => (
          <div key={idx} className="answer-detail">
            <h3>Question {idx + 1}</h3>
            <p><strong>Q:</strong> {answer.question}</p>
            <p><strong>R:</strong> {answer.answer}</p>
            <p><strong>Score:</strong> {answer.score}/100</p>
            <p><strong>Feedback:</strong> {answer.feedback}</p>
          </div>
        ))}
      </div>

      <div className="report-metadata">
        <p><strong>Secteur:</strong> {config.sector}</p>
        <p><strong>Durée:</strong> {config.duration} minutes</p>
        <p><strong>Ton:</strong> {config.tone}</p>
      </div>

      <button onClick={onRestart} className="restart-button">
        🔄 Recommencer un entretien
      </button>
    </div>
  );
}

export default FinalReport;
