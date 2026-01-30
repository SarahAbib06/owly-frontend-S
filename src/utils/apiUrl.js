// frontend/src/utils/apiUrl.js
export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL 
    || (import.meta.env.MODE === 'production'
        ? 'https://owly-backend-production.up.railway.app/api'
        : 'http://localhost:5000/api');
};

export const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL?.replace('/api', '')
    || (import.meta.env.MODE === 'production'
        ? 'https://owly-backend-production.up.railway.app'
        : 'http://localhost:5000');
};