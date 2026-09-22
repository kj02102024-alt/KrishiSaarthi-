import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import webhookRouter from '../routes/webhook.js';
import chatRouter from '../routes/chat.js';
import listingsRouter from '../routes/listings.js';
import translateRouter from '../routes/translate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

function webhookJsonType(req) {
  const type = String(req.headers['content-type'] || '').toLowerCase();
  return (
    type.includes('json') ||
    type.includes('text/plain') ||
    type === '' ||
    req.path === '/webhook' ||
    req.path.startsWith('/webhook/')
  );
}

app.use(express.json({
  limit: '20mb',
  type: webhookJsonType,
}));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.path === '/webhook' || req.path.startsWith('/webhook')) {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ct=${req.headers['content-type'] || '(none)'}`);
  }
  next();
});

app.use(express.static('.'));

// WhatsApp Cloud API: GET /webhook (verify) and POST /webhook (events)
app.use('/', webhookRouter);
app.use('/api', chatRouter);
app.use('/api', listingsRouter);
app.use('/api/translate', translateRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'KrishiSarthi Backend',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

async function start() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log('Connected to MongoDB Atlas');
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
    }
  } else {
    console.warn('MONGODB_URI is not set. WhatsApp listings will not persist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KrishiSarthi backend running on port ${PORT}`);
    console.log(`WhatsApp webhook: GET/POST http://0.0.0.0:${PORT}/webhook`);
  });
}

start();
