const DEV_API_BASE_URL = 'http://localhost:8000'

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return normalizeBaseUrl(fromEnv.trim())
  }

  if (import.meta.env.DEV) {
    return DEV_API_BASE_URL
  }

  throw new Error('Missing VITE_API_BASE_URL. Set it in frontend environment configuration.')
}

export const API_BASE_URL = resolveApiBaseUrl()

export const LEAFIE_BACKEND_URL =
  (typeof import.meta.env.VITE_LEAFIE_BACKEND_URL === 'string' &&
    import.meta.env.VITE_LEAFIE_BACKEND_URL.trim())
    ? import.meta.env.VITE_LEAFIE_BACKEND_URL.trim()
    : `${API_BASE_URL}/leafie/ask`
