import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Servir les fichiers statiques du build Vite
app.use(express.static(join(__dirname, 'dist')));

// Rediriger toutes les routes vers index.html (pour React Router)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🎤 Frontend Interview Simulator running on port ${port}`);
});
