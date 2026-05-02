export function normalizeBackendBase(rawUrl: string): string {
  const trimmed = rawUrl.replace(/\/$/, '')
  // CI secrets sometimes store an API base URL; tests expect service root.
  return trimmed.replace(/\/api$/i, '')
}