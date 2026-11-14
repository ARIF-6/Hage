export const getApiBaseUrl = (): string => {
  // 1. Explicit Vite environment variable (set in Cloudflare / .env)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  // 2. Custom backend override saved in localStorage (allows instant tunnel / cloud connection)
  if (typeof window !== 'undefined') {
    const savedBackend = localStorage.getItem('hage_custom_api_url');
    if (savedBackend) {
      return savedBackend.replace(/\/+$/, '');
    }

    // 3. If deployed on cloud domain, default to relative /api on same origin
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
  }

  // 4. Local development fallback
  return 'http://localhost:5000/api';
};

export const API_BASE = getApiBaseUrl();
export const AUTH_API = `${API_BASE}/auth`;
export const PAYMENTS_API = `${API_BASE}/payments`;
export const JOURNAL_API = `${API_BASE}/journal`;
export const COMMUNITY_API = `${API_BASE}/community`;
