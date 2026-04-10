import React, { useState } from 'react';
import { API } from '../api';

function ConfigSession({ onStart }) {
  const [sector, setSector] = useState('');
  const [jobOffer, setJobOffer] = useState('');
  const [cv, setCv] = useState('');
  const [duration, setDuration] = useState(10);
  const [tone, setTone] = useState('professionnel');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!sector.trim() || !jobOffer.trim() || !cv.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    
    try {
      // Générer les questions en premier
      const questionsResponse = await API.generateQuestions({
  sector: sector,
  job_offer: jobOffer,
  cv: cv,
  duration: duration,
  tone: tone
});

      if (!questionsResponse.ok) {
        throw new Error('Erreur lors de la génération des questions');
      }

      const questionsData = await questionsResponse.json();
      
      onStart({
        sector,
        job_offer: jobOffer,
        cv,
        duration,
        tone,
        questions: questionsData.questions || []
      });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toneDescriptions = {
    bienveillant: '😊 L\'IA sera positive et encourageante',
    professionnel: '💼 L\'IA sera neutre et professionnelle',
    critique: '⚡ L\'IA sera directe et critique'
  };

  return (
    <div className="config-container">
      <div className="config-card">
        <h2>Configuration de l'Entretien</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Secteur / Poste */}
          <div className="form-group">
            <label htmlFor="sector">Secteur / Poste *</label>
            <input
              id="sector"
              type="text"
              placeholder="Ex: Développeur Full-Stack"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Offre d'emploi */}
          <div className="form-group">
            <label htmlFor="jobOffer">Offre d'emploi (description du poste) *</label>
            <textarea
              id="jobOffer"
              placeholder="Décrivez le poste, les responsabilités, les compétences requises..."
              value={jobOffer}
              onChange={(e) => setJobOffer(e.target.value)}
              disabled={loading}
              rows={5}
            />
          </div>

          {/* CV */}
          <div className="form-group">
            <label htmlFor="cv">Votre CV / Profil *</label>
            <textarea
              id="cv"
              placeholder="Collez votre CV, votre expérience, vos compétences..."
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              disabled={loading}
              rows={5}
            />
          </div>

          {/* Durée */}
          <div className="form-group">
            <label htmlFor="duration">Durée de l'entretien</label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              disabled={loading}
            >
              <option value={5}>5 minutes (1 question)</option>
              <option value={10}>10 minutes (3 questions)</option>
              <option value={15}>15 minutes (5 questions)</option>
            </select>
          </div>

          {/* Ton de l'IA */}
          <div className="form-group">
            <label>Ton de l'IA</label>
            <p className="tone-hint">{toneDescriptions[tone]}</p>
            <div className="tone-selector">
              {['bienveillant', 'professionnel', 'critique'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tone-btn ${tone === t ? 'active' : ''}`}
                  onClick={() => setTone(t)}
                  disabled={loading}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '⏳ Préparation...' : '🎯 Commencer l\'entretien'}
          </button>
        </form>
      </div>

      <div className="info-panel">
        <h3>💡 Conseils</h3>
        <ul>
          <li>Décrivez votre poste cible en détail</li>
          <li>Adaptez votre ton selon l'entreprise</li>
          <li>Choisissez une durée réaliste</li>
          <li>L'IA vous posera des questions adaptées à votre profil</li>
        </ul>
      </div>
    </div>
  );
}

export default ConfigSession;
