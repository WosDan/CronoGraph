import axios from 'axios';

<<<<<<< HEAD
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000/api');
=======
// In production this must be the public URL of the separately deployed API.
// Keep localhost as a convenient default for local development.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
>>>>>>> 28faf5c6ae8a3dc654ec47f531a3cde2cf5a2b68

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});
