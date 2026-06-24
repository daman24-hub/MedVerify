import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import apiRoutes from './routes/apiRoutes.js'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = Number(process.env.PORT || 5000)
const MAX_PORT_ATTEMPTS = Number(process.env.PORT_FALLBACK_ATTEMPTS || 15)

// FIXED: configured CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json())

// FIXED: Add MongoDB reconnect logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    setTimeout(connectDB, 5000); // FIXED: retry after 5 seconds
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected — retrying...');
  setTimeout(connectDB, 5000);
});

connectDB();

app.get('/', (_req, res) => {
	res.status(200).json({ message: 'Welcome to DawaCheck Backend API!' })
})

app.get('/health', (_req, res) => {
	res.status(200).json({ ok: true, service: 'dawacheck-backend' })
})

// FIXED: health-check route so you can verify DB status without checking logs
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    db: states[dbState],
    uptime: process.uptime()
  });
});

app.use('/api', apiRoutes)

app.use((req, res) => {
	res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
})

app.use((err, _req, res, _next) => {
	res.status(500).json({ error: 'Internal server error', details: err?.message })
})

const startServer = (port, attemptsLeft = MAX_PORT_ATTEMPTS) => {
	const server = app.listen(port, () => {
		console.log(`DawaCheck backend running on port ${port}`)
	})

	server.on('error', (error) => {
		if (error?.code === 'EADDRINUSE' && attemptsLeft > 1) {
			const nextPort = port + 1
			console.warn(`Port ${port} is busy. Retrying on ${nextPort}...`)
			startServer(nextPort, attemptsLeft - 1)
			return
		}

		console.error(`Failed to start backend: ${error?.message || 'Unknown error'}`)
		process.exit(1)
	})
}

// FIXED: .env validation on startup before app.listen
const required = ['MONGO_URI', 'GEMINI_API_KEY'];
required.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
});
console.log('✅ All required env variables present');

startServer(PORT)

/*
CURL TESTS FOR SERVER.JS:

Test /api/health endpoint:
curl.exe -s http://localhost:5000/api/health
Output:
{"status":"ok","db":"connected","uptime":103.1000556}
*/
