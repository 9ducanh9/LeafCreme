// User types and interfaces
export interface User {
  nguoidung_id: number
  ten_dang_nhap: string
  email: string
  ho_ten: string
  so_dien_thoai?: string
  dia_chi?: string
  ngay_sinh?: string
  gioi_tinh?: string
  avatar_url?: string
  dang_hoat_dong: boolean
  vaitro?: {
    vaitro_id: number
    ten_vai_tro: string
    mo_ta?: string
  }
}

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

export interface UserUpdateData {
  email?: string
  ho_ten?: string
  so_dien_thoai?: string
  dia_chi?: string
  ngay_sinh?: string // Format: YYYY-MM-DD
  gioi_tinh?: string
  avatar_url?: string | null
}

export interface ChangePasswordData {
  mat_khau_cu: string
  mat_khau_moi: string
  xac_nhan_mat_khau_moi: string
}

