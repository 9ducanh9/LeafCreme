// Authentication service for login, register, token management
import { apiClient } from './api'
import { API_BASE_URL } from '../config/runtimeConfig'
import type { LoginCredentials, RegisterData, AuthResponse, User } from '../types/user'

// Re-export types for backward compatibility
export type { LoginCredentials, RegisterData, AuthResponse, User }

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    // OAuth2PasswordRequestForm expects form data, not JSON
    const formData = new URLSearchParams()
    formData.append('username', credentials.username || credentials.email || '')
    formData.append('password', credentials.password)

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }))
      throw {
        error: 'Login failed',
        detail: errorData.detail || 'Invalid credentials',
        status: response.status,
      }
    }

    const data = await response.json()

    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token || '')
    } else {
      throw {
        error: 'Login failed',
        detail: 'Server did not return access token',
        status: 500,
      }
    }

    return data
  } catch (error) {
    throw error
  }
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/register', data)

    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
    }

    return response
  } catch (error) {
    throw error
  }
}

export async function getCurrentUser(): Promise<User> {
  try {
    return await apiClient.get<User>('/auth/me')
  } catch (error) {
    // Don't log 401 errors - this is expected when user is not authenticated
    const status = error && typeof error === 'object' && 'status' in error
      ? (error as { status?: number }).status
      : undefined

    if (status !== 401) {
      console.error('Error fetching current user:', error)
    }
    throw error
  }
}

export function logout(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('access_token')
}
