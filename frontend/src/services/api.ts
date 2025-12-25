// API client configuration and base utilities
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface ApiError {
  error: string
  detail?: string | string[]
  status?: number
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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

    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log(`🌐 ${options.method || 'GET'} ${endpoint}`, {
        url,
        hasToken: !!token,
      })
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })
      
      // Log response (only in development)
      if (import.meta.env.DEV) {
        console.log(`📥 Response for ${endpoint}:`, {
          status: response.status,
          statusText: response.statusText,
        })
      }

      if (!response.ok) {
        // Handle 401 Unauthorized - clear invalid tokens
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

      // Handle empty responses
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

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
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
}

export const apiClient = new ApiClient(API_BASE_URL)

