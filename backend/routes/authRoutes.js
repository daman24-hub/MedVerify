import { Router } from 'express'
import {
  getUserProfile,
  loginUser,
  registerUser,
  updateUserProfile,
} from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/profile', requireAuth, getUserProfile)
router.put('/profile', requireAuth, updateUserProfile)

export default router
