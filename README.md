# 🎤 Simulateur d'Entretien RH avec IA

Une application complète pour pratiquer les entretiens d'embauche avec enregistrement audio et analyse par IA Claude.

## ✨ Fonctionnalités

- 🎙️ **Enregistrement audio** en temps réel avec transcription
- 🤖 **Questions générées par IA** basées sur votre profil et l'offre d'emploi
- 📊 **Analyse intelligente** de chaque réponse par un expert RH IA
- 📈 **Rapport détaillé** avec scores et recommandations
- ⏱️ **Durées flexibles** : 5, 10 ou 15 minutes

## 📋 Prérequis

- **Python 3.8+**
- **Node.js 16+** et npm
- **Clé API Anthropic** (https://console.anthropic.com)

## 🚀 Installation

### 1. Cloner le projet

```bash
# Créer un dossier pour le projet
mkdir interview-simulator
cd interview-simulator

# Copier tous les fichiers dans ce dossier
```

### 2. Configuration du backend (Python)

```bash
# Créer un environnement virtuel
python -m venv venv

# L'activer
# Sur Windows :
venv\Scripts\activate
# Sur macOS/Linux :
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer votre clé API Anthropic
export ANTHROPIC_API_KEY="votre-clé-api"
# Ou sur Windows :
set ANTHROPIC_API_KEY=votre-clé-api
```

### 3. Configuration du frontend (React)

```bash
# Dans un nouveau terminal, se placer dans le dossier du projet
cd interview-simulator

# Créer la structure React
mkdir -p src/components public

# Copier les fichiers
# - Copier `public_index.html` → `public/index.html`
# - Copier `src_index.js` → `src/index.js`
# - Copier `src_App.jsx` → `src/App.jsx`
# - Copier `frontend.jsx` → `src/components/InterviewApp.jsx`

# Installer les dépendances React
npm install
```

## ▶️ Démarrage

### Terminal 1 - Backend (Port 8000)

```bash
# Depuis le dossier principal avec l'env virtuel activé
python app.py
```

Vous devriez voir :
```
🚀 Serveur démarré sur http://localhost:8000
📱 Frontend disponible sur http://localhost:3000
```

### Terminal 2 - Frontend (Port 3000)

```bash
# Depuis le dossier principal
npm start
```

L'application devrait s'ouvrir automatiquement sur http://localhost:3000

## 📚 Utilisation

1. **Remplissez vos informations :**
   - Secteur/Poste recherché
   - Offre d'emploi (collez le texte)
   - Votre CV (résumé ou texte)
   - Durée souhaitée (5, 10 ou 15 min)

2. **Démarrez l'entretien :**
   - L'IA génère des questions personnalisées
   - Autorisez l'accès au microphone
   - Cliquez "Démarrer l'enregistrement"

3. **Répondez aux questions :**
   - Parlez naturellement
   - Votre réponse est transcrite en direct
   - Cliquez "Réponse terminée" quand vous avez fini

4. **Obtenez votre rapport :**
   - Après toutes les questions, l'IA analyse vos réponses
   - Vous recevez un score global et des recommandations
   - Vous pouvez recommencer autant de fois que vous voulez

## 🔑 Obtenir votre clé API Anthropic

1. Allez sur https://console.anthropic.com
2. Créez un compte ou connectez-vous
3. Accédez à la section "API Keys"
4. Générez une nouvelle clé
5. Copiez-la et utilisez-la comme `ANTHROPIC_API_KEY`

## 🐛 Troubleshooting

### "Impossible d'accéder au microphone"
- Vérifiez les permissions du microphone dans votre navigateur
- Allez dans les paramètres du navigateur et autorisez l'accès au microphone
- Assurez-vous que votre microphone fonctionne

### "Erreur lors de la génération des questions"
- Vérifiez que le serveur backend est bien lancé (`python app.py`)
- Vérifiez votre clé API Anthropic
- Vérifiez votre connexion internet

### "CORS error"
- Assurez-vous que le backend est lancé sur le port 8000
- Le frontend doit être sur un port différent (3000)

### "Module not found"
- Backend : `pip install -r requirements.txt`
- Frontend : `npm install`

## 📝 Notes

- L'app utilise **Claude Opus 4.6** pour les meilleures performances
- Les questions sont générées selon votre profil spécifique
- L'analyse est basée sur les connaissances RH de Claude
- Vos données ne sont pas stockées (sauf sur les serveurs Anthropic)

## 📧 Support

Pour les problèmes ou questions :
- Vérifiez la console du navigateur (F12 → Console)
- Vérifiez les logs du serveur Python
- Assurez-vous que tous les services sont lancés

## 🎉 Prêt à commencer ?

```bash
# Terminal 1 - Backend
python app.py

# Terminal 2 - Frontend
npm start

# Ouvrez http://localhost:3000 dans votre navigateur
```

Bonne chance pour vos entretiens ! 🚀
