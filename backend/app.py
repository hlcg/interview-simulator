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
import logging
import sys

# Configure logging to output to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)

logger.info("🔧 [1/10] Module import started")

app = FastAPI()
logger.info("🔧 [2/10] FastAPI app created")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("🔧 [3/10] CORS middleware added")

# Event handler pour initialiser la DB au démarrage
@app.on_event("startup")
def startup_event():
    logger.info("🔧 [4/10] STARTUP EVENT TRIGGERED")
    try:
        logger.info("🔧 [4.1/10] Calling init_db()...")
        init_db()
        logger.info("✅ [4.2/10] Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ [4.3/10] ERROR initializing database: {e}", exc_info=True)

logger.info("🔧 [5/10] Startup event handler registered")

# Lazy loading du client Anthropic
_client = None
logger.info("🔧 [6/10] Client variable initialized")

def get_client():
    global _client
    logger.debug("🔧 [get_client] Checking if client exists...")
    if _client is None:
        logger.info("🔧 [get_client] Creating new Anthropic client...")
        api_key = os.getenv("ANTHROPIC_API_KEY")
        logger.info(f"🔧 [get_client] API Key exists: {bool(api_key)}")
        if not api_key:
            logger.error("❌ [get_client] ANTHROPIC_API_KEY not set!")
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")
        _client = anthropic.Anthropic(api_key=api_key)
        logger.info("🔧 [get_client] Client created successfully")
    return _client

logger.info("🔧 [7/10] get_client function defined")

# Base de données SQLite
DB_PATH = "interview_sessions.db"
logger.info(f"🔧 [8/10] DB_PATH set to: {DB_PATH}")

def init_db():
    """Initialise la base de données"""
    logger.info(f"🔧 [init_db] Connecting to {DB_PATH}...")
    try:
        conn = sqlite3.connect(DB_PATH)
        logger.info("🔧 [init_db] Connection successful")
        cursor = conn.cursor()
        logger.info("🔧 [init_db] Cursor created")
        
        logger.info("🔧 [init_db] Creating sessions table...")
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
        logger.info("✅ [init_db] sessions table created")
        
        logger.info("🔧 [init_db] Creating answers table...")
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
        logger.info("✅ [init_db] answers table created")
        
        logger.info("🔧 [init_db] Creating score_history table...")
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
        logger.info("✅ [init_db] score_history table created")
        
        logger.info("🔧 [init_db] Committing changes...")
        conn.commit()
        logger.info("✅ [init_db] Changes committed")
        
        logger.info("🔧 [init_db] Closing connection...")
        conn.close()
        logger.info("✅ [init_db] Connection closed successfully")
        
    except Exception as e:
        logger.error(f"❌ [init_db] ERROR: {e}", exc_info=True)
        raise

logger.info("🔧 [9/10] init_db function defined")

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

logger.info("🔧 [10/10] Pydantic models defined")

# ==================== ROUTES ====================

@app.get("/api/health")
def health():
    logger.info("📍 [ENDPOINT] /api/health called")
    try:
        result = {"status": "ok", "service": "interview-backend"}
        logger.info(f"✅ [ENDPOINT] /api/health returning: {result}")
        return result
    except Exception as e:
        logger.error(f"❌ [ENDPOINT] /api/health ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/generate-questions")
def generate_questions(req: GenerateQuestionsRequest):
    """Génère des questions d'entretien basées sur le secteur, l'offre et le CV"""
    logger.info(f"📍 [ENDPOINT] /api/generate-questions called with sector={req.sector}")
    try:
        logger.info("🔧 [generate_questions] Getting Anthropic client...")
        client = get_client()
        logger.info("✅ [generate_questions] Client obtained")
        
        prompt = f"""
        Vous êtes un recruteur expérimenté dans le secteur {req.sector}.
        
        Offre d'emploi: {req.job_offer}
        CV du candidat: {req.cv}
        Durée de l'entretien: {req.duration} minutes
        Ton: {req.tone}
        
        Générez {min(5, max(3, req.duration // 10))} questions d'entretien pertinentes et structurées.
        Répondez en JSON avec la structure: {{"questions": ["question1", "question2", ...]}}
        """
        
        logger.info("🔧 [generate_questions] Calling Anthropic API...")
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        logger.info("✅ [generate_questions] API call successful")
        
        try:
            result = json.loads(message.content[0].text)
            logger.info(f"✅ [generate_questions] JSON parsed successfully: {len(result.get('questions', []))} questions")
            return result
        except:
            logger.warning("⚠️ [generate_questions] JSON parse failed, returning default")
            return {"questions": ["Parlez-moi de votre expérience", "Pourquoi cette offre vous intéresse?"]}
    except Exception as e:
        logger.error(f"❌ [generate_questions] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/analyze-answer")
def analyze_answer(req: AnalyzeAnswerRequest):
    """Analyse une réponse et donne un score + feedback"""
    logger.info(f"📍 [ENDPOINT] /api/analyze-answer called")
    try:
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
            logger.info(f"✅ [analyze_answer] Score: {result.get('score')}")
            return result
        except:
            logger.warning("⚠️ [analyze_answer] JSON parse failed, returning default")
            return {"score": 70, "feedback": "Bonne réponse"}
    except Exception as e:
        logger.error(f"❌ [analyze_answer] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/generate-report")
def generate_report(req: GenerateReportRequest):
    """Génère un rapport complet avec tous les scores"""
    logger.info(f"📍 [ENDPOINT] /api/generate-report called")
    try:
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
            logger.info(f"✅ [generate_report] Report generated")
            return result
        except:
            logger.warning("⚠️ [generate_report] JSON parse failed")
            return {"overall_score": 75, "summary": "Entretien satisfaisant"}
    except Exception as e:
        logger.error(f"❌ [generate_report] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/session/start")
def start_session(req: StartSessionRequest):
    """Crée une nouvelle session d'entretien"""
    logger.info(f"📍 [ENDPOINT] /api/session/start called")
    try:
        import uuid
        session_id = str(uuid.uuid4())
        logger.info(f"🔧 [start_session] Generated session_id: {session_id}")
        
        logger.info("🔧 [start_session] Connecting to database...")
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        logger.info("✅ [start_session] Connected to database")
        
        logger.info("🔧 [start_session] Inserting session record...")
        cursor.execute('''
            INSERT INTO sessions (id, sector, job_offer, cv, tone, duration, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, req.sector, req.job_offer, req.cv, req.tone, req.duration, datetime.now()))
        logger.info("✅ [start_session] Session record inserted")
        
        logger.info("🔧 [start_session] Committing changes...")
        conn.commit()
        logger.info("✅ [start_session] Changes committed")
        
        conn.close()
        logger.info("✅ [start_session] Connection closed")
        
        return {"session_id": session_id}
    except Exception as e:
        logger.error(f"❌ [start_session] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/session/answer")
def save_answer(req: AnswerRequest):
    """Sauvegarde une réponse et retourne un score"""
    logger.info(f"📍 [ENDPOINT] /api/session/answer called for session {req.session_id}")
    try:
        client = get_client()
        
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
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO answers (session_id, question_num, question, answer, score, feedback, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (req.session_id, req.question_num, req.question, req.answer, score, feedback, datetime.now()))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ [save_answer] Answer saved with score {score}")
        return {"score": score, "feedback": feedback}
    except Exception as e:
        logger.error(f"❌ [save_answer] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/session/complete")
def complete_session(req: CompleteSessionRequest):
    """Finalise une session et génère le rapport"""
    logger.info(f"📍 [ENDPOINT] /api/session/complete called for session {req.session_id}")
    try:
        client = get_client()
        
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
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
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
        
        logger.info(f"✅ [complete_session] Session completed with score {overall_score}")
        return report
    except Exception as e:
        logger.error(f"❌ [complete_session] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.get("/api/session/history")
def get_history():
    """Retourne l'historique de toutes les sessions"""
    logger.info(f"📍 [ENDPOINT] /api/session/history called")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10')
        sessions = cursor.fetchall()
        conn.close()
        
        logger.info(f"✅ [get_history] Retrieved {len(sessions)} sessions")
        return {"sessions": [dict(s) for s in sessions]}
    except Exception as e:
        logger.error(f"❌ [get_history] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    """Retourne les détails d'une session"""
    logger.info(f"📍 [ENDPOINT] /api/session/{session_id} called")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM sessions WHERE id = ?', (session_id,))
        session = cursor.fetchone()
        
        cursor.execute('SELECT * FROM answers WHERE session_id = ?', (session_id,))
        answers = cursor.fetchall()
        
        conn.close()
        
        logger.info(f"✅ [get_session] Retrieved session with {len(answers)} answers")
        return {"session": dict(session) if session else None, "answers": [dict(a) for a in answers]}
    except Exception as e:
        logger.error(f"❌ [get_session] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.get("/api/session/stats/evolution")
def get_evolution():
    """Retourne l'évolution des scores"""
    logger.info(f"📍 [ENDPOINT] /api/session/stats/evolution called")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM score_history ORDER BY created_at ASC')
        scores = cursor.fetchall()
        conn.close()
        
        logger.info(f"✅ [get_evolution] Retrieved {len(scores)} score records")
        return {"evolution": [dict(s) for s in scores]}
    except Exception as e:
        logger.error(f"❌ [get_evolution] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/tts")
def text_to_speech(request: dict):
    """Convertit du texte en parole avec gTTS"""
    logger.info(f"📍 [ENDPOINT] /api/tts called")
    try:
        text = request.get("text", "")
        lang = request.get("lang", "fr")
        
        if not text:
            logger.warning("⚠️ [tts] No text provided")
            return {"error": "No text provided"}
        
        logger.info(f"🔧 [tts] Converting text to speech (lang={lang})...")
        tts = gTTS(text=text, lang=lang, slow=False)
        audio_buffer = BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        logger.info(f"✅ [tts] Audio generated successfully")
        return {
            "audio": audio_buffer.getvalue().hex(),
            "format": "audio/mpeg"
        }
    except Exception as e:
        logger.error(f"❌ [tts] ERROR: {e}", exc_info=True)
        return {"error": str(e)}

logger.info("\n" + "="*50)
logger.info("✅ ALL INITIALIZATION COMPLETE")
logger.info("="*50 + "\n")

if __name__ == "__main__":
    logger.info("🚀 [MAIN] Starting uvicorn server...")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
