from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import anthropic
import json
from pydantic import BaseModel
from pathlib import Path

app = FastAPI()

# CORS middleware pour permettre les requêtes depuis le frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialiser le client Anthropic
client = anthropic.Anthropic()

class GenerateQuestionsRequest(BaseModel):
    sector: str
    job_offer: str
    cv: str
    duration: int

class AnalyzeAnswerRequest(BaseModel):
    question: str
    answer: str

class GenerateReportRequest(BaseModel):
    sector: str
    job_offer: str
    cv: str
    answers: list

@app.post("/api/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    """Génère des questions d'entretien personnalisées"""
    try:
        num_questions = {5: 1, 10: 3, 15: 5}.get(request.duration, 3)
        
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": f"""Tu es un recruteur senior avec 15 ans d'expérience. Génère {num_questions} questions d'entretien d'embauche basées sur ces informations:

SECTEUR/POSTE: {request.sector}

OFFRE D'EMPLOI:
{request.job_offer[:500]}...

CV DU CANDIDAT:
{request.cv[:500]}...

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
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": f"""En tant qu'expert RH, évalue cette réponse d'entretien et donne un feedback court:

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
        answers_text = "\n\n".join([
            f"Q: {qa['question']}\nR: {qa['answer']}"
            for qa in request.answers
        ])
        
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": f"""Tu es un expert RH senior. Analyse cet entretien d'embauche et génère un rapport détaillé.

SECTEUR/POSTE: {request.sector}

OFFRE D'EMPLOI:
{request.job_offer[:500]}...

CV DU CANDIDAT:
{request.cv[:500]}...

QUESTIONS ET RÉPONSES:
{answers_text}

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

if __name__ == "__main__":
    import uvicorn
    print("🚀 Serveur démarré sur http://localhost:8000")
    print("📱 Frontend disponible sur http://localhost:3000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
