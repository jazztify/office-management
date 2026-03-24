import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
});

// Inject auth token and tenant context on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const tenantSubdomain = localStorage.getItem('tenantSubdomain');

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantSubdomain) {
    config.headers['x-tenant-id'] = tenantSubdomain;
  }

  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes('/api/auth');
    
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('tenantSubdomain');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
