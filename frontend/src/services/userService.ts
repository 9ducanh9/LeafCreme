// User service for user profile management
import { apiClient } from './api'
import { User } from './authService'

export interface UserUpdateData {
  email?: string
  ho_ten?: string
  so_dien_thoai?: string
  dia_chi?: string
  ngay_sinh?: string // Format: YYYY-MM-DD
  gioi_tinh?: string
  avatar_url?: string | null
}

export async function uploadAvatar(userId: number, file: File): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const token = localStorage.getItem('access_token')
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    
    // Upload file và nhận URL
    const response = await fetch(`${API_BASE_URL}/users/${userId}/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }))
      throw {
        error: 'Upload failed',
        detail: errorData.detail || 'Failed to upload avatar',
        status: response.status,
      }
    }
    
    const data = await response.json()
    return data.avatar_url || ''
  } catch (error) {
    console.error('Error uploading avatar:', error)
    throw error
  }
}

export interface ChangePasswordData {
  mat_khau_cu: string
  mat_khau_moi: string
  xac_nhan_mat_khau_moi: string
}

export async function updateUserProfile(userId: number, data: UserUpdateData): Promise<User> {
  try {
    return await apiClient.put<User>(`/users/${userId}`, data)
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

// Note: Change password endpoint might need to be added to backend
// For now, this is a placeholder
export async function changePassword(_data: ChangePasswordData): Promise<void> {
  try {
    // TODO: Implement when backend endpoint is available
    // await apiClient.post('/auth/change-password', _data)
    throw new Error('Change password endpoint not yet implemented')
  } catch (error) {
    console.error('Error changing password:', error)
    throw error
  }
}


