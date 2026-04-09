# 🚀 Déployer sur Render (GRATUIT & FACILE)

Guide complet pour déployer ton app d'interview RH sur Render.com

---

## ✨ Avantages de Render

- ✅ **100% gratuit** (avec quelques limites mineures)
- ✅ **Pas de terminal complexe** après la première config
- ✅ **Déploiement automatique** depuis GitHub
- ✅ **SSL/HTTPS inclus**
- ✅ **URL personnalisée possible**
- ✅ **Support Python + Node.js**

---

## 📋 Prérequis

1. **GitHub account** (gratuit sur github.com)
2. **Render account** (gratuit sur render.com)
3. **Clé API Anthropic**

---

## 🎯 Plan d'action (15 minutes)

### **Étape 1 : Préparation du code**

**A. Créer un dossier vide sur ton ordi :**
```
interview-simulator/
```

**B. Copier tous ces fichiers dans ce dossier :**
- `app.py` (le backend)
- `requirements.txt`
- `frontend_render.jsx` → **renommer en** `frontend.jsx`
- `package_render.json` → **renommer en** `package.json`
- `render.yaml`
- `.gitignore`
- `public_index.html` → créer `public/index.html`

**C. Structure finale :**
```
interview-simulator/
├── app.py
├── requirements.txt
├── render.yaml
├── .gitignore
├── package.json
├── src/
│   ├── index.js
│   ├── App.jsx
│   └── components/
│       └── InterviewApp.jsx (c'est ton frontend.jsx)
└── public/
    └── index.html
```

---

### **Étape 2 : Mettre le code sur GitHub**

**A. Créer un repo GitHub :**

1. Va sur https://github.com/new
2. Nom du repo : `interview-simulator`
3. Description : "Simulateur d'entretien RH avec IA"
4. ✅ Clique "Create repository"

**B. Mettre ton code sur GitHub (sans terminal complexe) :**

**Méthode 1 - Interface web (la plus facile) :**

1. Sur GitHub, clique "Upload files"
2. Sélectionne tous tes fichiers et dossiers
3. Clique "Commit changes"

**Méthode 2 - Avec Git (un peu plus rapide) :**

```bash
cd interview-simulator
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TONNOM/interview-simulator.git
git push -u origin main
```

(Remplace `TONNOM` par ton username GitHub)

---

### **Étape 3 : Configurer Render**

**A. Créer un compte Render :**

1. Va sur https://render.com
2. Clique "Sign up"
3. Connecte-toi avec ton compte GitHub (c'est plus facile)

**B. Lier ton repo GitHub :**

1. Va sur https://dashboard.render.com
2. Clique "+ New"
3. Sélectionne "Web Service"
4. Sélectionne ton repo `interview-simulator`
5. Clique "Connect"

**C. Configurer le backend (FastAPI) :**

Render va demander :

- **Name** : `interview-backend` ✓
- **Runtime** : `Python 3` ✓
- **Region** : `Frankfurt (eu-central-1)` (plus rapide pour l'Europe)
- **Branch** : `main` ✓
- **Build command** : `pip install -r requirements.txt`
- **Start command** : `uvicorn app:app --host 0.0.0.0 --port 8000`

Puis, ajoute les variables d'environnement :
- **Key** : `ANTHROPIC_API_KEY`
- **Value** : `ta-clé-api-anthropic`

Clique "Create Web Service"

**Attends ~5 minutes** que le backend soit déployé ✅

---

### **Étape 4 : Déployer le frontend React**

**A. Dupliquer le service pour le frontend :**

1. Va sur https://dashboard.render.com
2. Clique "+ New" → "Web Service"
3. Sélectionne ton repo `interview-simulator`

**B. Configurer le frontend :**

- **Name** : `interview-frontend` ✓
- **Runtime** : `Node` ✓
- **Region** : `Frankfurt` (même que backend)
- **Branch** : `main` ✓
- **Build command** : `npm install && npm run build`
- **Start command** : `npm run serve`

Puis, ajoute la variable d'environnement :
- **Key** : `REACT_APP_API_URL`
- **Value** : (Render te donnera l'URL du backend, quelque chose comme `https://interview-backend-xyz.onrender.com`)

Clique "Create Web Service"

**Attends ~10 minutes** 

✅ C'est déployé !

---

## 🎉 C'est fini !

Ton app est maintenant accessible à une URL comme :

```
https://interview-frontend-xyz.onrender.com
```

Tu peux voir l'URL dans le dashboard Render.

---

## 🌐 Ajouter un domaine personnalisé (optionnel)

Si tu veux `https://monentretien.com` au lieu de `render.com` :

1. Va dans les settings du service Render
2. Clique "Custom Domain"
3. Ajoute ton domaine (que tu dois avoir chez IONOS ou ailleurs)
4. Suis les instructions pour pointer ton domaine

---

## ⚙️ Limitations du plan gratuit Render

- ⏱️ **Inactivité** : Les services s'endorment après 15 min d'inactivité (redémarrent instantanément)
- 📊 **Limite de requêtes** : ~100 par jour (suffisant pour toi)
- 💾 **Stockage** : Aucun stockage permanent (OK pour toi, pas besoin)

**Le reste est illimité !**

---

## 🔄 Mises à jour futures

Si tu veux mettre à jour ton app :

1. Fais les changements localement
2. `git add . && git commit -m "Description" && git push`
3. Render détecte automatiquement et redéploie !

---

## 🆘 Troubleshooting

### "Build failed"
- Vérifiez les logs Render (clique sur le service)
- Vérifiez `requirements.txt` et `package.json`
- Vérifiez que tous les fichiers sont sur GitHub

### "Cannot connect to API"
- Vérifiez que le backend est en "Live"
- Vérifiez la variable `REACT_APP_API_URL` dans le frontend
- Vérifiez votre clé API Anthropic

### "Frontend/Backend not connecting"
- Les URLs doivent correspondre exactement
- Attendez que les deux services soient "Live"
- Rechargez la page

---

## 📞 Support

- **Render support** : https://render.com/docs
- **Anthropic docs** : https://docs.anthropic.com
- **GitHub issues** : Ouvre une issue si tu as des problèmes

---

## 💰 Coût total

| Service | Coût |
|---------|------|
| Render (backend + frontend) | **GRATUIT** 🎉 |
| Anthropic API | Payant à l'usage (~0,01€ par entretien) |
| Domaine personnalisé | €0-15/an |
| **TOTAL** | **GRATUIT +** API usage |

**C'est clairement moins cher que n'importe quel hébergement traditionnel !**

---

## ✅ Résumé

1. ✓ Prépare ton code localement
2. ✓ Push sur GitHub
3. ✓ Connecte Render à GitHub
4. ✓ Configure backend (FastAPI)
5. ✓ Configure frontend (React)
6. ✓ Attends 15 minutes
7. ✓ Accède à `https://interview-frontend-xyz.onrender.com`

**C'est tout ! L'app est en ligne ! 🚀**
