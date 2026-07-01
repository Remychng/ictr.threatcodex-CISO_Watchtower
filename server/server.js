import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDataSource } from './dataSource.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;
const app = express();
const data = createDataSource();

// Small helper so route handlers can stay flat and still surface errors.
const wrap = (handler) => (req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });
};

// --- API ----------------------------------------------------------------
const api = express.Router();

api.get('/stats', wrap(async (_req, res) => {
  res.json(await data.getStats());
}));

api.get('/actors', wrap(async (_req, res) => {
  res.json(await data.getActors());
}));

api.get('/countries', wrap(async (_req, res) => {
  res.json(await data.getOriginCountries());
}));

api.get('/countries/:country/actors', wrap(async (req, res) => {
  res.json(await data.getActorsByCountry(req.params.country));
}));

api.get('/search', wrap(async (req, res) => {
  res.json(await data.search(req.query.q));
}));

api.get('/actors/:id', wrap(async (req, res) => {
  const actor = await data.getActor(req.params.id);
  if (!actor) return res.status(404).json({ error: 'Actor not found' });
  res.json(actor);
}));

app.use('/api', api);

// --- Static frontend ----------------------------------------------------
app.use(express.static(path.join(ROOT, 'public')));

app.listen(PORT, () => {
  console.log(`ThreatCodex running at http://localhost:${PORT}`);
});
