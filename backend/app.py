from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gtts import gTTS
import anthropic
import sqlite3
import json
from datetime import datetime
import os
import logging
import sys
from io import BytesIO
import uuid

# ==================== LOGGING SETUP ====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)

logger.info("=" * 70)
logger.info("🚀 STARTING INTERVIEW SIMULATOR BACKEND")
logger.info("=" * 70)

# ==================== FASTAPI SETUP ====================
app = FastAPI(title="Interview Simulator", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "https://interview-simulator-production-5cf5.up.railway.app",
    "http://localhost:5173",
    "http://localhost:3000",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("✅ CORS middleware configured")

# ==================== DATABASE SETUP ====================
DB_PATH = "interview_sessions.db"
logger.info(f"📁 Database path: {DB_PATH}")

def init_db():
    """Initialize SQLite database with all tables"""
    logger.info("🔧 Initializing database...")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Sessions table
        logger.info("📝 Creating sessions table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                sector TEXT NOT NULL,
                job_offer TEXT NOT NULL,
                cv TEXT NOT NULL,
                tone TEXT DEFAULT 'professional',
                duration INTEGER DEFAULT 30,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        ''')
        
        # Answers table
        logger.info("📝 Creating answers table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                question_num INTEGER NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                score REAL,
                feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id)
            )
        ''')
        
        # Score history table
        logger.info("📝 Creating score_history table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS score_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                score REAL NOT NULL,
                max_score REAL DEFAULT 100,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(id)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization error: {e}", exc_info=True)
        raise

# Initialize DB on startup
@app.on_event("startup")
async def startup_event():
    logger.info("🔄 Running startup event...")
    init_db()
    logger.info("✅ Startup event complete")

# ==================== ANTHROPIC CLIENT ====================
_client = None

def get_client():
    """Get or create Anthropic client (lazy loading)"""
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            logger.error("❌ ANTHROPIC_API_KEY environment variable not set")
            raise ValueError("ANTHROPIC_API_KEY not set")
        _client = anthropic.Anthropic(api_key=api_key)
        logger.info("✅ Anthropic client created")
    return _client

logger.info("✅ Anthropic setup configured")

# ==================== PYDANTIC MODELS ====================
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

class TextToSpeechRequest(BaseModel):
    text: str
    lang: str = "fr"

logger.info("✅ Pydantic models defined")

# ==================== HEALTH CHECK ====================
@app.get("/api/health")
async def health():
    """Health check endpoint"""
    logger.info("📍 GET /api/health")
    return {
        "status": "ok",
        "service": "interview-backend",
        "server": "hypercorn"
    }

# ==================== QUESTION GENERATION ====================
@app.post("/api/generate-questions")
async def generate_questions(req: GenerateQuestionsRequest):
    """Generate interview questions based on sector, job offer, and CV"""
    logger.info(f"📍 POST /api/generate-questions (sector={req.sector})")
    try:
        client = get_client()
        
        num_questions = min(5, max(3, req.duration // 10))
        
        prompt = f"""Tu es un recruteur expérimenté dans le secteur {req.sector}.

Offre d'emploi: {req.job_offer}

CV du candidat: {req.cv}

Durée de l'entretien: {req.duration} minutes
Ton de l'entretien: {"bienveillant et encourageant" if req.tone == "friendly" else "professionnel et neutre" if req.tone == "professional" else "critique et exigeant"}
Génère exactement {num_questions} questions d'entretien pertinentes et structurées.

Réponds UNIQUEMENT en JSON avec cette structure exacte:
{{"questions": ["question1", "question2", "question3"]}}

Ne réponds RIEN d'autre que le JSON."""
        
        logger.info("🔧 Calling Anthropic API...")
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        logger.info("✅ Anthropic API response received")
        
        try:
            result = json.loads(message.content[0].text)
            logger.info(f"✅ Generated {len(result.get('questions', []))} questions")
            return result
        except json.JSONDecodeError:
            logger.warning("⚠️ Failed to parse JSON response, returning default")
            return {"questions": ["Parlez-moi de votre expérience", "Pourquoi cette offre vous intéresse?"]}
            
    except Exception as e:
        logger.error(f"❌ Error in generate_questions: {e}", exc_info=True)
        return {"error": str(e)}

# ==================== ANSWER ANALYSIS ====================
@app.post("/api/analyze-answer")
async def analyze_answer(req: AnalyzeAnswerRequest):
    """Analyze a candidate's answer and provide score + feedback"""
    logger.info(f"📍 POST /api/analyze-answer")
    try:
        client = get_client()
        
        prompt = f"""Tu es un recruteur évaluant une réponse d'entretien.

Question: {req.question}
Réponse: {req.answer}
Ton attendu: {"bienveillant et encourageant, mets en valeur les points positifs avant les axes d'amélioration" if req.tone == "friendly" else "professionnel et constructif" if req.tone == "professional" else "critique et exigeant, sois direct sur les faiblesses"}

Évalue la réponse sur ces critères:
1. Pertinence et clarté (0-100)
2. Expérience démontrée (0-100)
3. Adaptabilité au ton demandé (0-100)

Calcule un score moyen (0-100).

Réponds UNIQUEMENT en JSON:
{{"score": 85, "feedback": "Excellente réponse car..."}}

Ne réponds RIEN d'autre que le JSON."""
        
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            result = json.loads(message.content[0].text)
            logger.info(f"✅ Answer analyzed (score: {result.get('score')})")
            return result
        except json.JSONDecodeError:
            logger.warning("⚠️ Failed to parse JSON, returning default")
            return {"score": 70, "feedback": "Réponse correcte"}
            
    except Exception as e:
        logger.error(f"❌ Error in analyze_answer: {e}", exc_info=True)
        return {"error": str(e)}

# ==================== SESSION MANAGEMENT ====================
@app.post("/api/session/start")
async def start_session(req: StartSessionRequest):
    """Create a new interview session"""
    logger.info(f"📍 POST /api/session/start (sector={req.sector})")
    try:
        session_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sessions (id, sector, job_offer, cv, tone, duration, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, req.sector, req.job_offer, req.cv, req.tone, req.duration, datetime.now()))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Session created: {session_id}")
        return {"session_id": session_id}
        
    except Exception as e:
        logger.error(f"❌ Error in start_session: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/session/answer")
async def save_answer(req: AnswerRequest):
    """Save an answer and return score"""
    logger.info(f"📍 POST /api/session/answer (session={req.session_id})")
    try:
        client = get_client()
        
        prompt = f"""Évalue rapidement cette réponse d'entretien:

Question: {req.question}
Réponse: {req.answer}

Score de 0 à 100 et feedback court (max 50 mots).

Réponds UNIQUEMENT en JSON:
{{"score": 75, "feedback": "Bonne réponse"}}

Ne réponds RIEN d'autre."""
        
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            analysis = json.loads(message.content[0].text)
            score = analysis.get("score", 70)
            feedback = analysis.get("feedback", "Réponse enregistrée")
        except json.JSONDecodeError:
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
        
        logger.info(f"✅ Answer saved (score: {score})")
        return {"score": score, "feedback": feedback}
        
    except Exception as e:
        logger.error(f"❌ Error in save_answer: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/api/session/complete")
async def complete_session(req: CompleteSessionRequest):
    """Complete a session and generate final report"""
    logger.info(f"📍 POST /api/session/complete (session={req.session_id})")
    try:
        client = get_client()
        
        answers_text = "\n".join([
            f"Q{i+1}: {a.get('question', '')}\nA: {a.get('answer', '')}\nScore: {a.get('score', 'N/A')}"
            for i, a in enumerate(req.answers)
        ])
        
        prompt = f"""Génère un rapport final d'entretien basé sur ces réponses:

{answers_text}

Fournis:
- overall_score (0-100): moyenne générale
- summary (1-2 lignes): résumé global
- strengths (liste): points forts du candidat
- improvements (liste): axes d'amélioration

Réponds UNIQUEMENT en JSON:
{{"overall_score": 78, "summary": "...", "strengths": [...], "improvements": [...]}}

Ne réponds RIEN d'autre."""
        
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            report = json.loads(message.content[0].text)
            overall_score = report.get("overall_score", 75)
        except json.JSONDecodeError:
            report = {"overall_score": 75, "summary": "Session complétée", "strengths": [], "improvements": []}
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
        
        logger.info(f"✅ Session completed (score: {overall_score})")
        return report
        
    except Exception as e:
        logger.error(f"❌ Error in complete_session: {e}", exc_info=True)
        return {"error": str(e)}

@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Get session details and answers"""
    logger.info(f"📍 GET /api/session/{session_id}")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM sessions WHERE id = ?', (session_id,))
        session = cursor.fetchone()
        
        cursor.execute('SELECT * FROM answers WHERE session_id = ?', (session_id,))
        answers = cursor.fetchall()
        
        conn.close()
        
        logger.info(f"✅ Retrieved session with {len(answers)} answers")
        return {
            "session": dict(session) if session else None,
            "answers": [dict(a) for a in answers]
        }
        
    except Exception as e:
        logger.error(f"❌ Error in get_session: {e}", exc_info=True)
        return {"error": str(e)}

@app.get("/api/session/history")
async def get_history():
    """Get history of all sessions"""
    logger.info(f"📍 GET /api/session/history")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10')
        sessions = cursor.fetchall()
        conn.close()
        
        logger.info(f"✅ Retrieved {len(sessions)} sessions")
        return {"sessions": [dict(s) for s in sessions]}
        
    except Exception as e:
        logger.error(f"❌ Error in get_history: {e}", exc_info=True)
        return {"error": str(e)}

# ==================== TEXT-TO-SPEECH ====================
@app.post("/api/tts")
async def text_to_speech(req: TextToSpeechRequest):
    """Convert text to speech using gTTS"""
    logger.info(f"📍 POST /api/tts (lang={req.lang})")
    try:
        if not req.text:
            logger.warning("⚠️ No text provided for TTS")
            return {"error": "No text provided"}
        
        logger.info(f"🔧 Generating audio ({len(req.text)} chars)...")
        tts = gTTS(text=req.text, lang=req.lang, slow=False)
        audio_buffer = BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        audio_hex = audio_buffer.getvalue().hex()
        logger.info(f"✅ Audio generated ({len(audio_hex)//2} bytes)")
        
        return {
            "audio": audio_hex,
            "format": "audio/mpeg"
        }
        
    except Exception as e:
        logger.error(f"❌ Error in text_to_speech: {e}", exc_info=True)
        return {"error": str(e)}

# ==================== STARTUP LOG ====================
logger.info("=" * 70)
logger.info("✅ ALL ROUTES REGISTERED - APP READY")
logger.info("=" * 70)

if __name__ == "__main__":
    import hypercorn.asyncio
    import asyncio
    
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"🚀 Starting Hypercorn on port {port}")
    
    config = hypercorn.Config(bind=f"0.0.0.0:{port}")
    asyncio.run(hypercorn.asyncio.serve(app, config))
