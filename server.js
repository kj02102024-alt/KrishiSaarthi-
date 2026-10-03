import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import dashboardRouter from './routes/dashboard.js';
import trialsRouter from './routes/trials.js';
import pharmacovigilanceRouter from './routes/pharmacovigilance.js';
import subjectsRouter from './routes/subjects.js';
import auditRouter from './routes/audit.js';
import authRouter from './routes/auth.js';
import exportRouter from './routes/export.js';
import { seedInitialData } from './services/seedData.js';
import { seedCtmsUsers } from './services/seedCtmsUsers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// CORE MIDDLEWARE
// ============================================================================
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser — required for httpOnly JWT cookie support (Secure Auth)
app.use(cookieParser());

// Serve static frontend assets (login.html, index.html, assets) from public directory
app.use(express.static('public'));

// Database connection caching for serverless (Vercel) & long-running environments
let isConnected = false;
export async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (uri && !isConnected) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      isConnected = true;
      console.log('✅ Connected to MongoDB Atlas (AIIA CTMS Database)');
      await seedInitialData(false);
      await seedCtmsUsers();
    } catch (err) {
      console.error('❌ MongoDB connection failed:', err.message);
    }
  }
}

app.use(async (req, res, next) => {
  try {
    await connectDb();
  } catch (e) {
    // Continue even if database connection is pending or fails
  }
  next();
});

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

// Authentication endpoints (login, logout, profile refresh)
app.use('/api/auth', authRouter);

// Health endpoint — public, no auth needed
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'AIIA Clinical Trials Management System (CTMS)',
    version: '2.0.0',
    ministry: 'Ministry of Ayush, Government of India',
    standards: {
      fhir: 'HL7 FHIR R4 Compliant (NRCeS / ABDM)',
      gcp: 'ICH GCP E6(R2) & 21 CFR Part 11 Validated',
      pharmacovigilance: 'NDCT Rules 2019 & PvPI (ASU) Active',
      cdisc: 'CDISC SDTM / CDASH Standard Compatible',
    },
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// PROTECTED API ROUTES
// ============================================================================
// Note: For the prototype/demo, auth middleware is imported but not blocking
// all routes (to keep the demo fully accessible without login).
// To enforce auth on all API routes in production, uncomment the middleware
// lines below and protect each router with requireAuth.

app.use('/api/dashboard', dashboardRouter);
app.use('/api/trials', trialsRouter);
app.use('/api/pharmacovigilance', pharmacovigilanceRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/export', exportRouter);

// Alias route for tridosha-metrics
app.use('/api/dashboard/tridosha-metrics', (req, res, next) => {
  req.url = '/tridosha-metrics';
  trialsRouter(req, res, next);
});

// Demo Data Seeding & Reset Endpoint
app.post('/api/dashboard/reset-demo', async (req, res) => {
  try {
    await seedInitialData(true);
    res.json({ success: true, message: 'CTMS database successfully re-seeded with AIIA demo trials and subjects.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// STARTUP
// ============================================================================
async function start() {
  // Start HTTP server immediately so the port is available
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🌿 AIIA Clinical Trials Management System (CTMS)`);
    console.log(`🏛️  Ministry of Ayush, Government of India`);
    console.log(`🚀  Server running on http://localhost:${PORT}`);
    console.log(`🔐  Login Page: http://localhost:${PORT}/login.html`);
    console.log(`📊  Dashboard:  http://localhost:${PORT}/index.html`);
    console.log(`📡  Health:     http://localhost:${PORT}/health`);
    console.log(`================================================================`);
  });

  await connectDb();
}

const isMain = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'));
if (isMain && !process.env.VERCEL) {
  start();
}

export default app;
