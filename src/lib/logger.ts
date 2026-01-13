/**
 * Centralized logging utility.
 *
 * - Normalizes console output to use level-aware methods.
 * - Defaults to "debug" but can be raised via VITE_LOG_LEVEL in env.
 * - Re-routes console.log to the debug level so verbose traces do not show
 *   when the log level is set to "info" or higher.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

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

const shouldLog = (level: LogLevel) => levelRank[level] >= levelRank[resolvedLevel]

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
    fallback(...args)
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

export const currentLogLevel = resolvedLevel
export const isDebugEnabled = shouldLog('debug')
