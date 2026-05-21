const express = require('express');
const { handleNearbyPresence } = require('./nearbyPresence');
const { handleNearbySocial } = require('./nearbySocial');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'walky-api' });
});

app.post('/api/nearby/presence', handleNearbyPresence);
app.post('/api/nearby/social', handleNearbySocial);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Walky API listening on http://0.0.0.0:${PORT}`);
});
