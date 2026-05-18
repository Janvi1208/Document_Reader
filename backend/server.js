require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, ensureUsersTable } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


app.get('/api/provider', (req, res) => {
  const { getProviderInfo } = require('./middleware/extraction');
  res.json(getProviderInfo());
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  console.log('Initializing database...');
  await initDb();
  await ensureUsersTable();
  console.log('Database ready.');

  const { requireAuth } = require('./routes/auth');

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/uploads', requireAuth, require('./routes/uploads'));
  app.use('/api/records', requireAuth, require('./routes/records'));
  app.use('/api/analytics', requireAuth, require('./routes/analytics'));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
  }

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`\n BiztelAI Workflow Server → http://localhost:${PORT}`);
    const { detectProvider } = require('./middleware/extraction');
    if (!detectProvider()) console.warn('\n WARNING: No AI key set. Add ANTHROPIC_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY to backend/.env\n');
    else console.log(` AI Provider: ${detectProvider().toUpperCase()}`);
  });
}

start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
// Already appended after the fact — provider info is in the route below
