import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import apiRoutes from './routes/apiRoutes.js'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = Number(process.env.PORT || 5000)

// FIXED: configured CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json())

mongoose.connection.on('connected', () => {
	console.log('✅ MongoDB connected')
})

mongoose.connection.on('disconnected', () => {
	console.warn('⚠️ MongoDB disconnected')
})

mongoose.connection.on('error', (error) => {
	console.error('❌ MongoDB connection error:', error?.message || String(error))
})

app.get('/', (_req, res) => {
	res.status(200).json({ message: 'Welcome to DawaCheck Backend API!' })
})

app.get('/health', (_req, res) => {
	res.status(200).json({ ok: true, service: 'dawacheck-backend' })
})

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

const startServer = (port) => {
	const server = app.listen(port, () => {
		console.log(`DawaCheck backend running on port ${port}`)
	})

	server.on('error', (error) => {
		if (error?.code === 'EADDRINUSE') {
			console.error(`Failed to start backend: Port ${port} is already in use.`)
			return process.exit(1)
		}

		console.error(`Failed to start backend: ${error?.message || 'Unknown error'}`)
		process.exit(1)
	})
}

const required = ['MONGO_URI', 'GROQ_API_KEY'];
required.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
});
console.log('✅ All required env variables present');

connectDB()
  .then(() => startServer(PORT))
  .catch((error) => {
    console.error(`❌ Failed to connect to MongoDB: ${error?.message || 'Unknown error'}`)
    process.exit(1)
  })

/*
CURL TESTS FOR SERVER.JS:

Test /api/health endpoint:
curl.exe -s http://localhost:5000/api/health
Output:
{"status":"ok","db":"connected","uptime":103.1000556}
*/
