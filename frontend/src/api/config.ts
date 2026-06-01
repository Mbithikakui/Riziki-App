const isProduction = process.env.NODE_ENV === 'production';

export const API_BASE_URL = isProduction
  ? 'https://riziki-backend.onrender.com/api'
  : 'http://localhost:8000/api';