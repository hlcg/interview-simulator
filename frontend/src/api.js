// frontend/src/api.js
// Configuration centralisée pour toutes les appels API

// URL du backend - change cette valeur selon ton environnement
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://interview-backend-production-eaed.up.railway.app';

console.log('🔌 API Base URL:', API_BASE_URL);

// Fonction helper pour faire des requêtes API
export const apiCall = async (endpoint, method = 'GET', data = null) => {
  const url = `${API_BASE_URL}/api${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
};

// Endpoints spécifiques
export const API = {
  // Health check
  health: () => apiCall('/health'),

  // Questions
  generateQuestions: (data) => apiCall('/generate-questions', 'POST', data),

  // Answers
  analyzeAnswer: (data) => apiCall('/analyze-answer', 'POST', data),

  // Reports
  generateReport: (data) => apiCall('/generate-report', 'POST', data),

  // Sessions
  startSession: (data) => apiCall('/session/start', 'POST', data),
  saveAnswer: (data) => apiCall('/session/answer', 'POST', data),
  completeSession: (data) => apiCall('/session/complete', 'POST', data),
  getHistory: () => apiCall('/session/history', 'GET'),
  getSession: (sessionId) => apiCall(`/session/${sessionId}`, 'GET'),
  getEvolution: () => apiCall('/session/stats/evolution', 'GET'),

  // TTS (Text to Speech)
  textToSpeech: (text, lang = 'fr') => apiCall('/tts', 'POST', { text, lang }),
};

export default API;
