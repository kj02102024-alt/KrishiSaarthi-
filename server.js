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

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
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

  app.listen(PORT, () => {
    console.log(`KrishiSarthi backend running on port ${PORT}`);
    console.log(`WhatsApp webhook: GET/POST http://localhost:${PORT}/webhook`);
  });
}

start();
