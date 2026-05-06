/**
 * Centralized logging utility.
 *
 * - Normalizes console output to use level-aware methods.
 * - Defaults to "debug" but can be raised via VITE_LOG_LEVEL in env.
 * - Re-routes console.log to the debug level so verbose traces do not show
 *   when the log level is set to "info" or higher.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const REDACTED = '[REDACTED]'

const SENSITIVE_KEY_PATTERN =
  /^(?:token|secret|apikey|api[_-]?key|x-api-key|authorization|access[_-]?token|refresh[_-]?token|provider[_-]?token|password|jwt|service[_-]?role)$/i

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /sb_(?:publishable|secret|service_role)_[A-Za-z0-9._-]+/gi,
  /\bBearer\s+[A-Za-z0-9._~+\-/]+=*\b/gi,
  /([?&#](?:access_token|refresh_token|provider_token|token|apikey|api_key|key|secret|authorization)=)([^&#\s]+)/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
]

const sanitizeString = (input: string): string => {
  let output = input
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    output = output.replace(pattern, (_match, prefix) => {
      if (typeof prefix === 'string') {
        return `${prefix}${REDACTED}`
      }
      return REDACTED
    })
  }
  return output
}

const sanitizeForLogging = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (typeof value === 'string') {
    return sanitizeString(value)
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message || ''),
      stack: sanitizeString(value.stack || ''),
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForLogging(entry, seen))
  }

  if (value && typeof value === 'object') {
    const asObject = value as Record<string, unknown>
    if (seen.has(asObject)) {
      return '[Circular]'
    }
    seen.add(asObject)

    const redacted: Record<string, unknown> = {}
    for (const [key, nestedValue] of Object.entries(asObject)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        redacted[key] = REDACTED
      } else {
        redacted[key] = sanitizeForLogging(nestedValue, seen)
      }
    }
    return redacted
  }

  return value
}

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent']
const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
}

const rawLevel = String(import.meta.env?.VITE_LOG_LEVEL ?? 'debug').toLowerCase()
const resolvedLevel: LogLevel = LEVELS.includes(rawLevel as LogLevel)
  ? (rawLevel as LogLevel)
  : 'debug'

let runtimeOverrideLevel: LogLevel | null = null

const getEffectiveLevel = (): LogLevel => runtimeOverrideLevel ?? resolvedLevel

const shouldLog = (level: LogLevel) => levelRank[level] >= levelRank[getEffectiveLevel()]

const originalConsole = {
  log: console.log.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

const createLoggerMethod = (
  level: LogLevel,
  fallback: (...args: unknown[]) => void,
) =>
  (...args: unknown[]) => {
    if (!shouldLog(level)) return
    const sanitizedArgs = args.map((arg) => sanitizeForLogging(arg))
    fallback(...sanitizedArgs)
  }

export const logger = {
  debug: createLoggerMethod('debug', originalConsole.debug ?? originalConsole.log),
  info: createLoggerMethod('info', originalConsole.info ?? originalConsole.log),
  warn: createLoggerMethod('warn', originalConsole.warn),
  error: createLoggerMethod('error', originalConsole.error),
}

// Route console methods through the level-aware logger to keep existing call sites.
console.log = logger.debug
console.debug = logger.debug
console.info = logger.info
console.warn = logger.warn
console.error = logger.error

// Log the active level once using the original console to avoid filtering itself.
originalConsole.info(`[logger] Log level set to "${resolvedLevel}" (VITE_LOG_LEVEL)`)

export const setRuntimeLogLevel = (level: LogLevel | null): void => {
  runtimeOverrideLevel = level
  const effectiveLevel = getEffectiveLevel()
  if (level === null) {
    originalConsole.info(`[logger] Runtime override cleared; effective level is "${effectiveLevel}"`)
    return
  }
  originalConsole.info(`[logger] Runtime override set to "${level}"; effective level is "${effectiveLevel}"`)
}

export const currentLogLevel = resolvedLevel
export const isDebugEnabled = shouldLog('debug')
