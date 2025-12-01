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
export async function changePassword(data: ChangePasswordData): Promise<void> {
  try {
    // TODO: Implement when backend endpoint is available
    // await apiClient.post('/auth/change-password', data)
    throw new Error('Change password endpoint not yet implemented')
  } catch (error) {
    console.error('Error changing password:', error)
    throw error
  }
}


