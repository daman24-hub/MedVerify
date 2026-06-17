import axios from 'axios'
import { getToken, clearToken } from './auth'
import { showToast } from './toast'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const client = axios.create({
  baseURL: BASE,
  timeout: 12000,
})

client.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      showToast('Network error. Check your connection.', 'error')
    } else if (error.response.status === 401) {
      clearToken()
      showToast('Session expired. Please log in again.', 'error')
    }
    return Promise.reject(error)
  },
)

export const loginUser = (credentials) => client.post('/api/auth/login', credentials)
export const registerUser = (credentials) => client.post('/api/auth/register', credentials)
export const getUserProfile = () => client.get('/api/auth/profile')
export const updateUserProfile = (body) => client.put('/api/auth/profile', body)
export const verifyMedicine = (name) => client.get('/api/verify', { params: { name } })
export const logScan = (lat, lng, medicine, result) =>
  client.post('/api/scan-log', { lat, lng, medicine, result })
export const checkInteractions = (medicines) => client.post('/api/interactions', { medicines })
export const getHeatmap = () => client.get('/api/heatmap')

export async function verifyMedicineByName(name) {
  const response = await client.get('/api/verify', { params: { name } })
  return response
}

export { BASE }
