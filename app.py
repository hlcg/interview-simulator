from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import anthropic
import json
from pydantic import BaseModel
from pathlib import Path
import sqlite3
from datetime import datetime
import io
from gtts import gTTS
import uuid

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DB_PATH = "interview_data.db"

def get_client():
    """Lazy loading du client Anthropic"""
    return anthropic.Anthropic()

def init_db():
    """Initialiser la base de données SQLite"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Table Sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            sector TEXT,
            job_offer TEXT,
            cv TEXT,
            tone TEXT,
            duration INTEGER,
            created_at TIMESTAMP,
            completed_at TIMESTAMP,
            overall_score INTEGER,
            communication_score INTEGER,
            technical_score INTEGER,
            cultural_fit_score INTEGER
        )
    ''')
    
    # Table Answers
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS answers (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            question TEXT,
            answer TEXT,
            score INTEGER,
            feedback TEXT,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    ''')
    
    # Table Scores évolutifs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS score_history (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            overall_score INTEGER,
            communication_score INTEGER,
            technical_score INTEGER,
            cultural_fit_score INTEGER,
            created_at TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize DB
init_db()

# Pydantic Models
class GenerateQuestionsRequest(BaseModel):
    sector: str
    job_offer: str
    cv: str
    duration: int
    tone: str = "professionnel"

class AnalyzeAnswerRequest(BaseModel):
    question: str
    answer: str
    tone: str = "professionnel"

class GenerateReportRequest(BaseModel):
    sector: str
    job_offer: str
    cv: str
    answers: list
    tone: str = "professionnel"

class StartSessionRequest(BaseModel):
    sector: str
    job_offer: str
    cv: str
    duration: int
    tone: str

class SaveAnswerRequest(BaseModel):
    session_id: str
    question: str
    answer: str

class CompleteSessionRequest(BaseModel):
    session_id: str
    sector: str
    job_offer: str
    cv: str
    answers: list
    tone: str

# ==================== ENDPOINTS EXISTANTS ====================

@app.post("/api/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    """Génère des questions d'entretien personnalisées"""
    try:
        client = get_client()
        num_questions = {5: 1, 10: 3, 15: 5}.get(request.duration, 3)
        
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": f"""Tu es un recruteur senior avec 15 ans d'expérience. Génère {num_questions} questions d'entretien d'embauche basées sur ces informations:
SECTEUR/POSTE: {request.sector}
OFFRE D'EMPLOI: {request.job_offer[:500]}...
CV DU CANDIDAT: {request.cv[:500]}...

Les questions doivent être:
- Spécifiques au profil et au poste
- Comportementales et techniques mélangées
- Réalistes et professionnelles
- En français

Réponds UNIQUEMENT avec un JSON valide contenant:
{{
  "questions": [
    "Question 1?",
    "Question 2?",
    ...
  ]
}}
Pas de texte en dehors du JSON."""
                }
            ]
        )
        
        response_text = message.content[0].text
        questions = json.loads(response_text)
        return questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-answer")
async def analyze_answer(request: AnalyzeAnswerRequest):
    """Analyse une réponse et donne un feedback"""
    try:
        client = get_client()
        tone_prompt = {
            "bienveillant": "Sois constructif et encourageant",
            "professionnel": "Sois neutre et professionnel",
            "critique": "Sois direct et critique"
        }.get(request.tone, "Sois neutre et professionnel")
        
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": f"""{tone_prompt}. En tant qu'expert RH, évalue cette réponse d'entretien:
QUESTION: {request.question}
RÉPONSE DU CANDIDAT: {request.answer}

Donne un JSON avec:
{{
  "score": 0-100,
  "feedback": "Feedback court et constructif",
  "strengths": ["force 1", "force 2"],
  "improvements": ["amélioration 1", "amélioration 2"]
}}
Réponds UNIQUEMENT avec le JSON."""
                }
            ]
        )
        
        response_text = message.content[0].text
        analysis = json.loads(response_text)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-report")
async def generate_report(request: GenerateReportRequest):
    """Génère un rapport final d'entretien"""
    try:
        client = get_client()
        answers_text = "\n\n".join([
            f"Q: {qa['question']}\nR: {qa['answer']}"
            for qa in request.answers
        ])
        
        tone_prompt = {
            "bienveillant": "Sois positif et encourageant",
            "professionnel": "Sois neutre et objectif",
            "critique": "Sois direct et critique"
        }.get(request.tone, "Sois neutre et objectif")
        
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": f"""{tone_prompt}. Tu es un expert RH senior. Analyse cet entretien d'embauche et génère un rapport détaillé.

SECTEUR/POSTE: {request.sector}
OFFRE D'EMPLOI: {request.job_offer[:500]}...
CV DU CANDIDAT: {request.cv[:500]}...
QUESTIONS ET RÉPONSES: {answers_text}

Génère un JSON avec:
{{
  "overallScore": 0-100,
  "strengths": ["force 1", "force 2", "force 3"],
  "improvements": ["amélioration 1", "amélioration 2", "amélioration 3"],
  "communicationScore": 0-100,
  "technicalScore": 0-100,
  "culturalFitScore": 0-100,
  "summary": "Résumé court et professionnel (3-4 lignes)",
  "recommendation": "Recommandation finale (2-3 lignes)"
}}
Réponds UNIQUEMENT avec le JSON."""
                }
            ]
        )
        
        response_text = message.content[0].text
        report = json.loads(response_text)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health():
    """Vérifier que le serveur fonctionne"""
    return {"status": "ok"}

# ==================== NOUVEAUX ENDPOINTS ====================

@app.post("/api/session/start")
async def start_session(request: StartSessionRequest):
    """Démarrer une nouvelle session d'entretien"""
    try:
        session_id = str(uuid.uuid4())
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sessions 
            (id, sector, job_offer, cv, tone, duration, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, request.sector, request.job_offer, request.cv, 
              request.tone, request.duration, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return {"session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/session/answer")
async def save_answer(request: SaveAnswerRequest):
    """Sauvegarder une réponse dans la session"""
    try:
        answer_id = str(uuid.uuid4())
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO answers (id, session_id, question, answer)
            VALUES (?, ?, ?, ?)
        ''', (answer_id, request.session_id, request.question, request.answer))
        
        conn.commit()
        conn.close()
        
        return {"answer_id": answer_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/session/complete")
async def complete_session(request: CompleteSessionRequest):
    """Compléter la session et générer le rapport final"""
    try:
        client = get_client()
        
        # Générer le rapport
        report = await generate_report(GenerateReportRequest(
            sector=request.sector,
            job_offer=request.job_offer,
            cv=request.cv,
            answers=request.answers,
            tone=request.tone
        ))
        
        # Sauvegarder les scores
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE sessions 
            SET completed_at = ?, 
                overall_score = ?, 
                communication_score = ?, 
                technical_score = ?, 
                cultural_fit_score = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(),
              report.get('overallScore', 0),
              report.get('communicationScore', 0),
              report.get('technicalScore', 0),
              report.get('culturalFitScore', 0),
              request.session_id))
        
        # Ajouter à l'historique des scores
        score_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO score_history 
            (id, session_id, overall_score, communication_score, 
             technical_score, cultural_fit_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (score_id, request.session_id,
              report.get('overallScore', 0),
              report.get('communicationScore', 0),
              report.get('technicalScore', 0),
              report.get('culturalFitScore', 0),
              datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/session/history")
async def get_history():
    """Récupérer l'historique de toutes les sessions"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, sector, tone, duration, created_at, completed_at, 
                   overall_score, communication_score, technical_score, cultural_fit_score
            FROM sessions 
            ORDER BY created_at DESC
        ''')
        
        sessions = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Récupérer les détails d'une session"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Session details
        cursor.execute('SELECT * FROM sessions WHERE id = ?', (session_id,))
        session = dict(cursor.fetchone() or {})
        
        # Answers
        cursor.execute('SELECT * FROM answers WHERE session_id = ?', (session_id,))
        answers = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return {"session": session, "answers": answers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/session/stats/evolution")
async def get_score_evolution():
    """Récupérer l'évolution du score sur les sessions"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT overall_score, communication_score, technical_score, 
                   cultural_fit_score, created_at
            FROM score_history 
            ORDER BY created_at ASC
        ''')
        
        scores = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {"evolution": scores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts")
async def text_to_speech(text: dict):
    """Convertir du texte en voix avec gTTS"""
    try:
        tts = gTTS(text=text.get("text", ""), lang='fr', slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        return StreamingResponse(
            iter([audio_buffer.getvalue()]),
            media_type="audio/mpeg"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Serveur démarré sur http://localhost:8000")
    print("📱 Frontend disponible sur http://localhost:3000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
