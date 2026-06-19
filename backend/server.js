import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import apiRoutes from './routes/apiRoutes.js'
import { connectDB } from './config/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = Number(process.env.PORT || 5000)
const MAX_PORT_ATTEMPTS = Number(process.env.PORT_FALLBACK_ATTEMPTS || 15)

app.use(cors())
app.use(express.json())

await connectDB()

app.get('/', (_req, res) => {
	res.status(200).json({ message: 'Welcome to DawaCheck Backend API!' })
})

app.get('/health', (_req, res) => {
	res.status(200).json({ ok: true, service: 'dawacheck-backend' })
})

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

startServer(PORT)
