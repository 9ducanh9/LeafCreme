// Authentication service for login, register, token management
import { apiClient } from './api'

export interface LoginCredentials {
  username?: string
  email?: string
  password: string
}

export interface RegisterData {
  ten_dang_nhap: string
  email: string
  mat_khau: string
  ho_ten: string
  vaitro_id: number
  so_dien_thoai?: string
  dia_chi?: string
  ngay_sinh?: string
  gioi_tinh?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  nguoidung_id: number
  ten_dang_nhap: string
  email: string
  ho_ten: string
  so_dien_thoai?: string
  dia_chi?: string
  ngay_sinh?: string
  gioi_tinh?: string
  dang_hoat_dong: boolean
  vaitro?: {
    vaitro_id: number
    ten_vai_tro: string
    mo_ta?: string
  }
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    // OAuth2PasswordRequestForm expects form data, not JSON
    const formData = new URLSearchParams()
    formData.append('username', credentials.username || credentials.email || '')
    formData.append('password', credentials.password)
    
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/auth/login`, {
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
    
    // Store tokens
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token || '')
      console.log('✅ Login successful, token stored:', {
        tokenLength: data.access_token.length,
        tokenPreview: data.access_token.substring(0, 50) + '...',
        userId: data.user_id,
        username: data.ten_dang_nhap
      })
    } else {
      console.error('❌ Login response missing access_token:', data)
      throw {
        error: 'Login failed',
        detail: 'Server did not return access token',
        status: 500,
      }
    }
    
    return data
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/register', data)
    
    // Store tokens
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
    }
    
    return response
  } catch (error) {
    console.error('Register error:', error)
    throw error
  }
}

export async function getCurrentUser(): Promise<User> {
  try {
    return await apiClient.get<User>('/auth/me')
  } catch (error) {
    console.error('Error fetching current user:', error)
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

