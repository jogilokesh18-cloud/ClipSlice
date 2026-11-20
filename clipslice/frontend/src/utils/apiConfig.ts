// Base URL for API requests. In unified full-stack hosting (Docker/Render/Local), this is empty.
// When hosting the frontend on Vercel, users can connect their Render backend URL via settings or VITE_API_URL.
const getStoredApi = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('CLIPSLICE_API_URL') || '';
  }
  return '';
};

export const API_BASE = (getStoredApi() || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const saveApiBase = (url: string) => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('CLIPSLICE_API_URL', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('CLIPSLICE_API_URL');
    }
    window.location.reload();
  }
};
