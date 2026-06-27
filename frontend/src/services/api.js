import api from '../api'

export const register = (email, password, name) =>
  api.post('/api/auth/register', { email, password, name })

export const login = (email, password) =>
  api.post('/api/auth/login', { email, password })

export const getCurrentUser = () =>
  api.get('/api/auth/me')

export const verifyMedicine = (name) =>
  api.get('/api/verify', { params: { name } })

export const loginUser = (credentials) =>
  api.post('/api/auth/login', credentials)

export const registerUser = (credentials) =>
  api.post('/api/auth/register', credentials)

export const getUserProfile = () =>
  api.get('/api/auth/profile')

export const updateUserProfile = (body) =>
  api.put('/api/auth/profile', body)

export const logScan = (lat, lng, medicine, result) =>
  api.post('/api/scan-log', { lat, lng, medicine, result })

export const checkInteractions = (medicines) =>
  api.post('/api/interactions', { medicines })

export const getHeatmapData = () =>
  api.get('/api/heatmap')

export const getHeatmap = getHeatmapData

export const getHealthStatus = () =>
  api.get('/api/health')

export const verifyMedicineByName = verifyMedicine

export const saveOcrResult = (userId, text) =>
  api.post('/api/ocr', { userId, text })

export const getOcrResults = () =>
  api.get('/api/ocr')

export const updateVerifyStatus = (id, verified) =>
  api.post('/api/verify', { id, verified })

export const verifyMedicineByImage = (base64Image, userId = 'guest') =>
  api.post('/api/verify-image', { image: base64Image, userId })

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export { BASE_URL as BASE }
