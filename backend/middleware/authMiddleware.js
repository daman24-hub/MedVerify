import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dawacheck_jwt_secret'

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = String(req.headers.authorization || '')
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null
    if (!token) {
      return res.status(401).json({ error: 'Missing auth token.' })
    }

    let payload
    try {
      payload = jwt.verify(token, JWT_SECRET)
    } catch {
      return res.status(401).json({ error: 'Invalid auth token.' })
    }

    const user = await User.findById(payload.sub).lean()
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}
