/**
 * Application entry point.
 * 
 * Sets up React root with error boundary, router, and auth context.
 * Console logs help trace initialization sequence and detect loading issues.
 * Dev mode detection logs auth strategy (SQLite test mode vs Supabase production).
 */
import './lib/logger'

import { createRoot } from 'react-dom/client'

import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from 'react-router-dom'

import App from './App.tsx'

import { ErrorFallback } from './ErrorFallback.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { NotificationProvider } from './contexts/NotificationContext.tsx'

import "./styles/main.css"

console.debug('🚀 [main.tsx] Starting application...')
const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
console.debug(`✓ [main.tsx] Auth mode: ${isDevMode ? 'DEV (SQLite)' : 'PRODUCTION (Supabase)'}`)
const apiUrl = import.meta.env.VITE_API_URL || '(relative — using Vite proxy)'
console.debug(`🔌 [main.tsx] Backend: ${apiUrl}`)

if (isDevMode) {
  const devUser = import.meta.env.VITE_DEV_USER || 'admin'
  console.debug(`🔧 Dev Mode: Using test user "${devUser}"`)
}

console.debug('🎨 [main.tsx] Rendering app...')
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <NotificationProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  </ErrorBoundary>
)
console.debug('✓ [main.tsx] Render call completed')
