// FIXED: single API instance — import this everywhere, never use raw fetch
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000'), // FIXED: use relative path in DEV to leverage Vite proxy and bypass CORS preflight check
  timeout: 15000, // FIXED: timeout
  headers: { 'Content-Type': 'application/json' } // FIXED: headers
});

// FIXED: request interceptor to attach Authorization header dynamically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// FIXED: Global response interceptor — normalize errors
api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('authToken'); // FIXED: remove token on 401
    }
    const message =
      err.response?.data?.error ||
      err.message ||
      'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
