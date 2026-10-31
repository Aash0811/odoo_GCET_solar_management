import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token and handle multipart FormData
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sunpower_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If request payload is FormData, remove Content-Type so browser/axios sets multipart boundary properly
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for clear 4xx error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('sunpower_token');
      localStorage.removeItem('sunpower_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
