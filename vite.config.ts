import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from 'path'
import fs from 'fs'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// Check if SSL certificates exist (for local dev)
const keyPath = resolve(projectRoot, '../localhost+2-key.pem')
const certPath = resolve(projectRoot, '../localhost+2.pem')
const hasSSLCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  server: {
    port: 5173,
    ...(hasSSLCerts && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
    // Enable client-side routing fallback
    historyApiFallback: true,
    // Proxy API requests to backend during development
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        // Forward all headers (Authorization and others) to backend
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const headers = req.headers
            const isUserAccountRead = req.url?.startsWith('/api/users/') && !req.url?.startsWith('/api/users/me') && req.method?.toUpperCase() === 'GET'

            // Copy every header from the incoming request to the proxy request
            for (const [key, value] of Object.entries(headers)) {
              if (typeof value !== 'undefined') {
                try {
                  proxyReq.setHeader(key, value as any)
                } catch {
                  // ignore headers that http-proxy disallows setting
                }
              }
            }

            // For user account reads, drop auth headers to avoid backend 500s when auth is unnecessary
            if (isUserAccountRead) {
              proxyReq.removeHeader('authorization')
              proxyReq.removeHeader('x-forwarded-authorization')
            }

            // If Authorization is missing but we have X-Forwarded-Authorization, restore it (unless we purposely stripped for user read)
            const hasAuth = typeof headers['authorization'] !== 'undefined'
            const forwarded = headers['x-forwarded-authorization']
            if (!isUserAccountRead && !hasAuth && typeof forwarded !== 'undefined') {
              try {
                const val = Array.isArray(forwarded) ? forwarded[0] : forwarded
                const finalVal = val?.startsWith('Bearer ') ? val : `Bearer ${val}`
                proxyReq.setHeader('Authorization', finalVal)
              } catch {}
            }
          })
        }
      }
    }
  },
  preview: {
    port: 4173,
    ...(hasSSLCerts && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
    // Proxy API requests to backend in preview mode
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const headers = req.headers
            const isUserAccountRead = req.url?.startsWith('/api/users/') && !req.url?.startsWith('/api/users/me') && req.method?.toUpperCase() === 'GET'
            for (const [key, value] of Object.entries(headers)) {
              if (typeof value !== 'undefined') {
                try {
                  proxyReq.setHeader(key, value as any)
                } catch {
                  // ignore headers that http-proxy disallows setting
                }
              }
            }

            if (isUserAccountRead) {
              proxyReq.removeHeader('authorization')
              proxyReq.removeHeader('x-forwarded-authorization')
            }

            const hasAuth = typeof headers['authorization'] !== 'undefined'
            const forwarded = headers['x-forwarded-authorization']
            if (!isUserAccountRead && !hasAuth && typeof forwarded !== 'undefined') {
              try {
                const val = Array.isArray(forwarded) ? forwarded[0] : forwarded
                const finalVal = val?.startsWith('Bearer ') ? val : `Bearer ${val}`
                proxyReq.setHeader('Authorization', finalVal)
              } catch {}
            }
          })
        }
      }
    }
  },
});
