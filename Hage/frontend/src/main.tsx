import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

// Wake up the Render backend immediately on page load.
// Free-tier Render services sleep after inactivity — this silent ping
// starts the wake-up process so the backend is ready by the time the
// user clicks Login or Register. Never blocks rendering.
(function wakeUpBackend() {
  const backendUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : 'https://hage-1.onrender.com';
  fetch(`${backendUrl}/api/health`, { method: 'GET', cache: 'no-store' })
    .then(() => console.log('[WAKE] Backend is ready.'))
    .catch(() => console.log('[WAKE] Backend starting up...'));
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="379985610512-kdfemm9fnmcpkm6vc3lgagj9ldtq1ifh.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
