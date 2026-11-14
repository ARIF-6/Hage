// Centralized API configuration for HAGE Trading Journal

const RENDER_BACKEND_URL = 'https://hage-1.onrender.com/api';

export const getApiBaseUrl = (): string => {
  // 1. Explicit Vite environment variable (set in Netlify / Render / .env)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  // 2. Custom backend override saved in localStorage (allows instant testing)
  if (typeof window !== 'undefined') {
    const savedBackend = localStorage.getItem('hage_custom_api_url');
    if (savedBackend) {
      return savedBackend.replace(/\/+$/, '');
    }

    // 3. When deployed on cloud (Netlify, Cloudflare, etc.)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // If hosted directly on the Render backend, use same-origin relative /api
      if (window.location.hostname.includes('onrender.com')) {
        return `${window.location.origin}/api`;
      }
      // When hosted on Netlify (or any other domain), connect to the Render production backend
      return RENDER_BACKEND_URL;
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
