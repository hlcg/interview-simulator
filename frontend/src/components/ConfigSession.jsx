import React, { useState } from 'react';
import { API } from '../api';

function ConfigSession({ onSessionStart }) {
  const [sector, setSector] = useState('');
  const [jobOffer, setJobOffer] = useState('');
  const [cv, setCv] = useState('');
  const [duration, setDuration] = useState(30);
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    if (!sector || !jobOffer || !cv) {
      setError('⚠️ Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Génération des questions...');
      
      // Utilise API.generateQuestions
      const questionsResponse = await API.generateQuestions({
        sector: sector,
        job_offer: jobOffer,
        cv: cv,
        duration: duration,
        tone: tone
      });

      if (questionsResponse.ok === false) {
        throw new Error(questionsResponse.error || 'Erreur API');
      }

      console.log('✅ Questions générées:', questionsResponse);

      // Passe les données au composant parent
      onSessionStart({
        sector,
        jobOffer,
        cv,
        duration,
        tone,
        questions: questionsResponse.questions || []
      });
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(`❌ Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="config-container">
      <h1>🎤 Interview Simulator</h1>
      <p>Configurez votre entretien d'embauche avec IA</p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Secteur d'activité *</label>
        <input
          type="text"
          placeholder="Ex: IT, Finance, Marketing..."
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Offre d'emploi *</label>
        <textarea
          placeholder="Collez l'offre d'emploi complète..."
          value={jobOffer}
          onChange={(e) => setJobOffer(e.target.value)}
          rows="4"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Votre CV *</label>
        <textarea
          placeholder="Collez votre CV en texte..."
          value={cv}
          onChange={(e) => setCv(e.target.value)}
          rows="4"
          disabled={loading}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Durée (minutes)</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} disabled={loading}>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
          </select>
        </div>

        <div className="form-group">
          <label>Ton</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)} disabled={loading}>
            <option value="friendly">Bienveillant</option>
            <option value="professional">Professionnel</option>
            <option value="critical">Critique</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="start-button"
      >
        {loading ? '⏳ Chargement...' : '🚀 Commencer l\'entretien'}
      </button>
    </div>
  );
}

export default ConfigSession;
