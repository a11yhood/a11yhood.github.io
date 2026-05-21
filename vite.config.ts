import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";
import { resolve } from 'path'
import fs from 'fs'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// Check if SSL certificates exist (for local dev)
const keyPath = resolve(projectRoot, '../localhost+2-key.pem')
const certPath = resolve(projectRoot, '../localhost+2.pem')
const hasSSLCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

function withApiProxy(target: string) {
  return {
    '/api': {
      target,
      changeOrigin: true,
      secure: false,
      // Forward all headers (Authorization and others) to backend
      configure: (
        proxy: {
          on: (
            event: 'proxyReq',
            handler: (
              proxyReq: { setHeader: (key: string, value: string) => void; removeHeader: (key: string) => void },
              req: { headers: Record<string, string | string[] | undefined>; url?: string; method?: string },
              _res: unknown,
            ) => void,
          ) => void
        },
        _options: unknown,
      ) => {
        proxy.on('proxyReq', (proxyReq, req, _res) => {
          const headers = req.headers
          const isUserAccountRead = req.url?.startsWith('/api/users/') && !req.url?.startsWith('/api/users/me') && req.method?.toUpperCase() === 'GET'

          // Copy every header from the incoming request to the proxy request
          for (const [key, value] of Object.entries(headers)) {
            if (typeof value !== 'undefined') {
              try {
                const normalizedValue = Array.isArray(value) ? value.join(', ') : value
                proxyReq.setHeader(key, normalizedValue)
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
              if (typeof val === 'string' && val.length > 0) {
                const finalVal = val.startsWith('Bearer ') ? val : `Bearer ${val}`
                proxyReq.setHeader('Authorization', finalVal)
              }
            } catch {
              // Ignore header recovery failures for forwarded auth.
            }
          }
        })
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')

  // Prefer GitHub tag version in CI builds so the footer tracks releases
  // even when package.json version is omitted.
  const githubRef = process.env.GITHUB_REF || ''
  const githubRefName = process.env.GITHUB_REF_NAME || ''
  const githubRefType = process.env.GITHUB_REF_TYPE || ''
  const githubTagFromRef = githubRef.startsWith('refs/tags/')
    ? githubRef.replace('refs/tags/', '')
    : ''
  const githubTag =
    githubRefType === 'tag'
      ? githubRefName
      : githubTagFromRef

  const appVersion =
    process.env.VITE_APP_VERSION ||
    githubTag ||
    process.env.npm_package_version ||
    'unknown'
  const apiProxyTarget =
    process.env.VITE_API_URL ||
    env.VITE_API_URL ||
    env.VITE_BACKEND_URL ||
    'http://localhost:8002'

  console.info(`\x1b[36m[a11yhood]\x1b[0m Backend: ${apiProxyTarget}`)

  return {
    base: process.env.VITE_BASE_URL || env.VITE_BASE_URL || '/',
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
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
      proxy: withApiProxy(apiProxyTarget)
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
      proxy: withApiProxy(apiProxyTarget)
    },
  }
})
