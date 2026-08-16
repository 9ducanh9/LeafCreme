// API client configuration and base utilities
import { API_BASE_URL } from '../config/runtimeConfig'
import { cognitoEnabled } from '../config/cognito'
import { refreshCognitoSession } from './cognitoService'

export interface ApiError {
  error: string
  detail?: string | string[]
  status?: number
}

// Endpoints that must never trigger a silent-refresh attempt on 401 — the
// refresh endpoint itself (avoids an infinite loop) and the endpoints
// silent refresh exists to route around (login/register 401s are real
// "wrong password" failures, not "token expired" — refreshing wouldn't
// help and would just delay a "wrong password" error by a round trip).
const _NO_REFRESH_ENDPOINTS = new Set(['/auth/refresh', '/auth/login', '/auth/register', '/auth/cognito/session'])

// A 401 on any other endpoint could mean "access token expired" (recoverable
// via the refresh token, transparently) rather than "not authenticated at
// all". Previously every 401 immediately nuked both tokens and forced the
// user to log in again — including mid-session, e.g. 30 minutes into
// browsing with a perfectly valid 7-day refresh token sitting unused. See
// docs/specs/01-auth-access-control.md follow-up note.
//
// Concurrent requests that all 401 at once (e.g. a page firing several API
// calls together) must not each independently call /auth/refresh — that
// would burn through concurrent refresh attempts and race on writing
// localStorage. All callers share one in-flight refresh promise instead.
let _refreshPromise: Promise<string> | null = null

async function _performRefresh(baseURL: string): Promise<string> {
  if (cognitoEnabled) {
    return refreshCognitoSession()
  }

  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(`${baseURL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) {
    throw new Error('Refresh token invalid or expired')
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error('Refresh response missing access_token')
  }

  localStorage.setItem('access_token', data.access_token)
  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token)
  }
  return data.access_token
}

function _refreshAccessToken(baseURL: string): Promise<string> {
  if (!_refreshPromise) {
    _refreshPromise = _performRefresh(baseURL).finally(() => {
      _refreshPromise = null
    })
  }
  return _refreshPromise
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    _isRetryAfterRefresh = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    // Get auth token from localStorage if available
    const token = localStorage.getItem('access_token')

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }

    // Only add Content-Type for non-form-data requests
    if (!(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
    }

    // Add Authorization header if token exists
    if (token) {
      const trimmedToken = token.trim()
      headers['Authorization'] = `Bearer ${trimmedToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        // 401 + we have a refresh token + haven't already retried once for
        // this call + this isn't one of the endpoints refresh doesn't apply
        // to -> try a silent refresh and replay the original request once.
        const canAttemptRefresh =
          response.status === 401 &&
          !_isRetryAfterRefresh &&
          !_NO_REFRESH_ENDPOINTS.has(endpoint) &&
          !!localStorage.getItem('refresh_token')

        if (canAttemptRefresh) {
          try {
            await _refreshAccessToken(this.baseURL)
            return await this.request<T>(endpoint, options, true)
          } catch {
            // Refresh token itself is invalid/expired — fall through to the
            // normal "clear tokens" 401 handling below.
          }
        }

        // Handle 401 Unauthorized - clear invalid tokens (refresh either
        // wasn't attempted or didn't work)
        if (response.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }

        const errorData = await response.json().catch(() => ({
          error: 'An error occurred',
          detail: response.statusText,
        }))

        // Don't log 401 errors for /auth/me - this is expected when not authenticated
        const isAuthMeEndpoint = endpoint === '/auth/me'
        const is401 = response.status === 401

        if (!(isAuthMeEndpoint && is401)) {
          // Only log non-401 errors or non-/auth/me endpoints
          if (import.meta.env.DEV) {
            console.error(`❌ ${options.method || 'GET'} ${endpoint} failed:`, {
              status: response.status,
              error: errorData.error || 'Request failed',
              detail: errorData.detail,
            })
          }
        }

        throw {
          error: errorData.error || 'Request failed',
          detail: errorData.detail,
          status: response.status,
        } as ApiError
      }

      // Handle empty responses (e.g., 204 No Content)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }

      return {} as T
    } catch (error) {
      if (error && typeof error === 'object' && 'error' in error) {
        throw error
      }
      throw {
        error: 'Network error',
        detail: 'Unable to connect to the server',
      } as ApiError
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | null>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([key, value]) => [key, String(value)])
        ).toString()
      : ''
    
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    })
  }

  async post<T>(endpoint: string, data?: unknown, options?: { params?: Record<string, string | number | boolean | null> }): Promise<T> {
    let url = endpoint
    if (options?.params) {
      const queryString = new URLSearchParams(
        Object.entries(options.params)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString()
      url = `${endpoint}?${queryString}`
    }
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  async patch<T>(endpoint: string, data?: unknown, options?: { params?: Record<string, string | number | boolean | null> }): Promise<T> {
    let url = endpoint
    if (options?.params) {
      const queryString = new URLSearchParams(
        Object.entries(options.params)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString()
      url = `${endpoint}?${queryString}`
    }
    return this.request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

