// User service for user profile management
import { apiClient } from './api'
import { API_BASE_URL } from '../config/runtimeConfig'
import type { User, UserUpdateData, ChangePasswordData } from '../types/user'
import { cognitoEnabled } from '../config/cognito'
import { changeCognitoPassword } from './cognitoService'

export type { UserUpdateData, ChangePasswordData }

export async function uploadAvatar(userId: number, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const token = localStorage.getItem('access_token')
  const response = await fetch(`${API_BASE_URL}/users/${userId}/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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
}

export async function updateUserProfile(userId: number, data: UserUpdateData): Promise<User> {
  return apiClient.put<User>(`/users/${userId}`, data)
}

export async function changePassword(data: ChangePasswordData): Promise<void> {
  if (cognitoEnabled) {
    await changeCognitoPassword(data.mat_khau_cu, data.mat_khau_moi)
    return
  }
  await apiClient.post('/auth/change-password', data)
}
