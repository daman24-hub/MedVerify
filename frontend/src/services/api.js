import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const client = axios.create({
	baseURL: BASE,
	timeout: 12000,
})

export const verifyMedicine = (name) =>
	client.get('/api/verify', { params: { name } })

export const logScan = (lat, lng, medicine, result) =>
	client.post('/api/scan-log', { lat, lng, medicine, result })

export const checkInteractions = (medicines) =>
	client.post('/api/interactions', { medicines })

export const getHeatmap = () => client.get('/api/heatmap')

export { BASE }
