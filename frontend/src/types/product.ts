// Product types and interfaces
export interface Product {
  sanpham_id: number
  ten: string
  sku: string
  loai: 'don' | 'bien_the' | 'hop_qua'
  gia_co_ban: number
  mo_ta?: string
  hinh_anh_url?: string
  danh_muc?: string
  don_vi_tinh?: string
  dang_hoat_dong: boolean
  ngay_tao: string
}

export interface ProductFilters {
  search?: string
  danh_muc?: string
  loai?: 'don' | 'bien_the' | 'hop_qua'
  dang_hoat_dong?: boolean
  skip?: number
  limit?: number
}

export interface ProductVariant {
  bienthe_id: number
  sanpham_id: number
  huong_vi: string
  kich_thuoc?: string
  gia_bienthe: number
  sku_bienthe?: string
  muc_gioi_han_ton: number
  dang_hoat_dong: boolean
  ngay_tao: string
}

