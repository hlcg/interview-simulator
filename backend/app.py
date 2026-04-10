from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gtts import gTTS
import anthropic
import sqlite3
import json
from datetime import datetime
import os
from io import BytesIO

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Event handler pour initialiser la DB au démarrage
@app.on_event("startup")
def startup_event():
    try:
        init_db()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ ERROR initializing database: {e}")

# Lazy loading du client Anthropic (évite le problème "proxies" sur Railway)
_client = None

def get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client

# Base de données SQLite
DB_PATH = "interview_sessions.db"

def init_db():
    """Initialise la base de données"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            sector TEXT,
            job_offer TEXT,
            cv TEXT,
            tone TEXT,
            duration INTEGER,
            created_at TIMESTAMP,
            completed_at TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            question_num INTEGER,
            question TEXT,
            answer TEXT,
            score REAL,
            feedback TEXT,
            created_at TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS score_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            score REAL,
            max_score REAL,
            created_at TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Pydantic Models
class GenerateQuestionsRequest(BaseModel):
    sector: str
    job_offer: str
    cv: str
    duration: int = 30
    tone: str = "professional"

class AnalyzeAnswerRequest(BaseModel):
    question: str
    answer: str
    tone: str = "professional"

class GenerateReportRequest(BaseModel):
    sector: str
    job_offer: str
    cv: str
    answers: list
    tone: str = "professional"

class StartSessionRequest(BaseModel):
    sector: str
    job_offer: str
    cv: str
    duration: int = 30
    tone: str = "professional"

class AnswerRequest(BaseModel):
    session_id: str
    question_num: int
    question: str
    answer: str

class CompleteSessionRequest(BaseModel):
    session_id: str
    answers: list
    tone: str = "professional"

# Routes Health
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "interview-backend"}

# Routes Endpoints originaux (conservés)
@app.post("/api/generate-questions")
def generate_questions(req: GenerateQuestionsRequest):
    """Génère des questions d'entretien basées sur le secteur, l'offre et le CV"""
    client = get_client()
    
    prompt = f"""
    Vous êtes un recruteur expérimenté dans le secteur {req.sector}.
    
    Offre d'emploi: {req.job_offer}
    CV du candidat: {req.cv}
    Durée de l'entretien: {req.duration} minutes
    Ton: {req.tone}
    
    Générez {min(5, max(3, req.duration // 10))} questions d'entretien pertinentes et structurées.
    Répondez en JSON avec la structure: {{"questions": ["question1", "question2", ...]}}
    """
    
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        result = json.loads(message.content[0].text)
        return result
    except:
        return {"questions": ["Parlez-moi de votre expérience", "Pourquoi cette offre vous intéresse?"]}

@app.post("/api/analyze-answer")
def analyze_answer(req: AnalyzeAnswerRequest):
    """Analyse une réponse et donne un score + feedback"""
    client = get_client()
    
    prompt = f"""
    Vous êtes un recruteur évaluant une réponse d'entretien.
    
    Question: {req.question}
    Réponse: {req.answer}
    Ton: {req.tone}
    
    Évaluez la réponse sur:
    1. Pertinence et clarté
    2. Expérience démontrée
    3. Adaptabilité au ton demandé
    
    Répondez en JSON: {{"score": 0-100, "feedback": "..."}}
    """
    
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        result = json.loads(message.content[0].text)
        return result
    except:
        return {"score": 70, "feedback": "Bonne réponse"}

@app.post("/api/generate-report")
def generate_report(req: GenerateReportRequest):
    """Génère un rapport complet avec tous les scores"""
    client = get_client()
    
    answers_text = "\n".join([f"Q: {a['question']}\nA: {a['answer']}\nScore: {a.get('score', 'N/A')}" for a in req.answers])
    
    prompt = f"""
    Génère un rapport d'entretien complet.
    
    Secteur: {req.sector}
    Offre: {req.job_offer}
    CV: {req.cv}
    Ton: {req.tone}
    
    Réponses:
    {answers_text}
    
    Répondez en JSON avec: {{"overall_score": 0-100, "summary": "...", "strengths": [...], "improvements": [...]}}
    """
    
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        result = json.loads(message.content[0].text)
        return result
    except:
        return {"overall_score": 75, "summary": "Entretien satisfaisant"}

# Routes nouvelles pour sessions
@app.post("/api/session/start")
def start_session(req: StartSessionRequest):
    """Crée une nouvelle session d'entretien"""
    import uuid
    session_id = str(uuid.uuid4())
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # FIX: Convertir les tuples en dicts
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO sessions (id, sector, job_offer, cv, tone, duration, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (session_id, req.sector, req.job_offer, req.cv, req.tone, req.duration, datetime.now()))
    
    conn.commit()
    conn.close()
    
    return {"session_id": session_id}

@app.post("/api/session/answer")
def save_answer(req: AnswerRequest):
    """Sauvegarde une réponse et retourne un score"""
    client = get_client()
    
    # Analyse la réponse
    prompt = f"""
    Question: {req.question}
    Réponse: {req.answer}
    
    Score de 0 à 100 et feedback court.
    Répondez en JSON: {{"score": 0-100, "feedback": "..."}}
    """
    
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        analysis = json.loads(message.content[0].text)
        score = analysis.get("score", 70)
        feedback = analysis.get("feedback", "Bonne réponse")
    except:
        score = 70
        feedback = "Réponse enregistrée"
    
    # Sauvegarde en base
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # FIX: Convertir les tuples en dicts
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO answers (session_id, question_num, question, answer, score, feedback, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (req.session_id, req.question_num, req.question, req.answer, score, feedback, datetime.now()))
    
    conn.commit()
    conn.close()
    
    return {"score": score, "feedback": feedback}

@app.post("/api/session/complete")
def complete_session(req: CompleteSessionRequest):
    """Finalise une session et génère le rapport"""
    client = get_client()
    
    # Génère le rapport final
    answers_text = "\n".join([f"Q{i+1}: {a['question']}\nA: {a['answer']}" for i, a in enumerate(req.answers)])
    
    prompt = f"""
    Génère un rapport final d'entretien.
    
    Réponses:
    {answers_text}
    
    Répondez en JSON: {{"overall_score": 0-100, "summary": "...", "recommendation": "..."}}
    """
    
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        report = json.loads(message.content[0].text)
        overall_score = report.get("overall_score", 75)
    except:
        report = {"overall_score": 75, "summary": "Session complétée"}
        overall_score = 75
    
    # Sauvegarde score et statut
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # FIX: Convertir les tuples en dicts
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO score_history (session_id, score, max_score, created_at)
        VALUES (?, ?, ?, ?)
    ''', (req.session_id, overall_score, 100, datetime.now()))
    
    cursor.execute('''
        UPDATE sessions SET completed_at = ? WHERE id = ?
    ''', (datetime.now(), req.session_id))
    
    conn.commit()
    conn.close()
    
    return report

@app.get("/api/session/history")
def get_history():
    """Retourne l'historique de toutes les sessions"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # FIX: Convertir les tuples en dicts
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10')
    sessions = cursor.fetchall()
    conn.close()
    
    return {"sessions": [dict(s) for s in sessions]}

@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    """Retourne les détails d'une session"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # FIX: Convertir les tuples en dicts
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM sessions WHERE id = ?', (session_id,))
    session = cursor.fetchone()
    
    cursor.execute('SELECT * FROM answers WHERE session_id = ?', (session_id,))
    answers = cursor.fetchall()
    
    conn.close()
    
    return {"session": dict(session) if session else None, "answers": [dict(a) for a in answers]}

@app.get("/api/session/stats/evolution")
def get_evolution():
    """Retourne l'évolution des scores"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # FIX: Convertir les tuples en dicts
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM score_history ORDER BY created_at ASC')
    scores = cursor.fetchall()
    conn.close()
    
    return {"evolution": [dict(s) for s in scores]}

@app.post("/api/tts")
def text_to_speech(request: dict):
    """Convertit du texte en parole avec gTTS"""
    text = request.get("text", "")
    lang = request.get("lang", "fr")
    
    if not text:
        return {"error": "No text provided"}
    
    try:
        tts = gTTS(text=text, lang=lang, slow=False)
        audio_buffer = BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        return {
            "audio": audio_buffer.getvalue().hex(),
            "format": "audio/mpeg"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
