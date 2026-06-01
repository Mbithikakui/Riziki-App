const isProduction = process.env.NODE_ENV === 'production';

export const API_BASE_URL = isProduction
  ? 'https://riziki-backend-7of1.onrender.com/api'
  : 'http://localhost:8000/api';