// FIXED: all API calls go through this file — never inline fetch in components
import api from '../api' // FIXED: use api instance

export const register = (email, password, name) =>
  api.post('/api/auth/register', { email, password, name }) // FIXED: use api instance

export const login = (email, password) =>
  api.post('/api/auth/login', { email, password }) // FIXED: use api instance

export const getCurrentUser = () =>
  api.get('/api/auth/me') // FIXED: use api instance

export const verifyMedicine = (name) =>
  api.get(`/api/verify`, { params: { name } }) // FIXED: use api instance

export const loginUser = (credentials) =>
  api.post('/api/auth/login', credentials) // FIXED: use api instance

export const registerUser = (credentials) =>
  api.post('/api/auth/register', credentials) // FIXED: use api instance

export const getUserProfile = () =>
  api.get('/api/auth/profile') // FIXED: use api instance

export const updateUserProfile = (body) =>
  api.put('/api/auth/profile', body) // FIXED: use api instance

export const logScan = (lat, lng, medicine, result) =>
  api.post('/api/scan-log', { lat, lng, medicine, result }) // FIXED: use api instance

export const checkInteractions = (medicines) =>
  api.post('/api/interactions', { medicines }) // FIXED: use api instance

export const getHeatmapData = () =>
  api.get('/api/heatmap') // FIXED: use api instance

export const getHeatmap = getHeatmapData

export const getHealthStatus = () =>
  api.get('/api/health') // FIXED: use api instance

export const verifyMedicineByName = verifyMedicine

export const saveOcrResult = (userId, text) =>
  api.post('/api/ocr', { userId, text }) // FIXED: save OCR result

export const getOcrResults = () =>
  api.get('/api/ocr') // FIXED: get OCR results

export const updateVerifyStatus = (id, verified) =>
  api.post('/api/verify', { id, verified }) // FIXED: update verify status

export const verifyMedicineByImage = (base64Image, userId = 'guest') =>
  api.post('/api/verify-image', { image: base64Image, userId })

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export { BASE_URL as BASE }
