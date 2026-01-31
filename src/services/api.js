import axios from 'axios';

// 🔥 DÉTECTION AUTOMATIQUE DE L'ENVIRONNEMENT
const API_BASE_URL = import.meta.env.VITE_API_URL 
  || (import.meta.env.MODE === 'production' 
      ? 'https://owly-backend-1.onrender.com/api'  // ← TON URL RENDER
      : 'http://localhost:5000/api');

console.log('🌐 Environment:', import.meta.env.MODE);
console.log('🌐 API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
   
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => {
    
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;