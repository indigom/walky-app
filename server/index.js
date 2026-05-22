const express = require('express');
const { handleNearbyPresence } = require('./nearbyPresence');
const { handleNearbySocial } = require('./nearbySocial');
const {
  profileUploadMiddleware,
  handleProfilePost,
  handleProfileGet,
  handleAdminSftpTest,
  handleAdminProfiles,
} = require('./profile');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-walky-admin-key'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'walky-api', port: PORT });
});

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'walky-api', health: '/health' });
});

app.post('/api/nearby/presence', handleNearbyPresence);
app.post('/api/nearby/social', handleNearbySocial);

app.post('/api/profile', profileUploadMiddleware, handleProfilePost);
app.get('/api/profile', handleProfileGet);
app.get('/api/admin/sftp-test', handleAdminSftpTest);
app.get('/api/admin/profiles', handleAdminProfiles);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Walky API listening on http://0.0.0.0:${PORT}`);
});
