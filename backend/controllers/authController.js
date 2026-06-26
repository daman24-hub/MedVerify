import User from '../models/User.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export const register = async (req, res) => {
	try {
		const { email, password, name } = req.body

		if (!email || !password || !name) {
			return res.status(400).json({ error: 'Missing required fields' })
		}

		const existingUser = await User.findOne({ email })
		if (existingUser) {
			return res.status(409).json({ error: 'Email already registered' })
		}

		const user = new User({ email, password, name })
		await user.save()

		const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
			expiresIn: '7d',
		})

		res.status(201).json({
			message: 'User registered successfully',
			token,
			user: { id: user._id, email: user.email, name: user.name },
		})
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
}

export const login = async (req, res) => {
	try {
		const { email, password } = req.body

		if (!email || !password) {
			return res.status(400).json({ error: 'Email and password required' })
		}

		const user = await User.findOne({ email })
		if (!user) {
			return res.status(401).json({ error: 'Invalid credentials' })
		}

		const isPasswordValid = await user.comparePassword(password)
		if (!isPasswordValid) {
			return res.status(401).json({ error: 'Invalid credentials' })
		}

		const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
			expiresIn: '7d',
		})

		res.json({
			message: 'Login successful',
			token,
			user: { id: user._id, email: user.email, name: user.name || 'User' },
		})
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
}

export const getCurrentUser = async (req, res) => {
	try {
		const token = req.headers.authorization?.split(' ')[1]
		if (!token) {
			return res.status(401).json({ user: null })
		}

		const decoded = jwt.verify(token, JWT_SECRET)
		const user = await User.findById(decoded.id)

		if (!user) {
			return res.status(401).json({ user: null })
		}

		res.json({
			user: { id: user._id, email: user.email, name: user.name || 'User' },
		})
	} catch (err) {
		res.status(401).json({ user: null })
	}
}
