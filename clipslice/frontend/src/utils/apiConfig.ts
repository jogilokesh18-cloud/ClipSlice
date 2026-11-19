// Base URL for API requests. In unified full-stack hosting, this is empty (relative).
// When deploying the frontend on Vercel and the backend on Render/Railway, set VITE_API_URL.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
