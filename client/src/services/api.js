import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
});

// Inject auth token and tenant context on every request
api.interceptors.request.use((config) => {
  // Prefer URL params (impersonation) over localStorage (session)
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  const urlSub = params.get('subdomain');

  console.log(`[API Interceptor] URL Token: ${!!urlToken}, URL Sub: ${urlSub}`);

  const token = urlToken || localStorage.getItem('token');
  const tenantSubdomain = urlSub || localStorage.getItem('tenantSubdomain');

  console.log(`[API Interceptor] Selected Token: ${token ? 'YES' : 'NO'}, Selected Tenant: ${tenantSubdomain}`);

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
