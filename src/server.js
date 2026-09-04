require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const journalRoutes = require('./routes/journalRoutes');
const todoRoutes = require('./routes/todoRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();

// Render and most PaaS put us behind a proxy; without this the rate limiter
// buckets every client under the same address.
app.set('trust proxy', 1);

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => {
  res.send('Lumora Backend is running!');
});

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'That request was too large.' });
  }
  res.status(500).json({ message: 'Something went wrong on our end.' });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

const shutdown = (signal) => async () => {
  console.log(`${signal} received, draining connections...`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
