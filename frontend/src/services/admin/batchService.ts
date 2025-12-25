import { apiClient } from '../api'

export interface ProductBatchCreate {
  bienthe_sanpham_id: number
  ncc_id?: number | null
  ma_lo: string
  ngay_het_han: string
  so_luong: number
  gia_don_vi: number
  trang_thai?: 'hoatdong' | 'hethan' | 'huy'
  ma_qr?: string | null
  ghi_chu?: string | null
}

export interface ComponentBatchCreate {
  linh_kien_id: number
  ncc_id?: number | null
  ma_lo: string
  ngay_het_han: string
  so_luong: number
  gia_don_vi: number
  trang_thai?: 'hoatdong' | 'hethan' | 'huy'
  ma_qr?: string | null
  ghi_chu?: string | null
}

export interface GiftBoxBatchCreate {
  hop_qua_id: number
  ncc_id?: number | null
  ma_lo: string
  ngay_het_han: string
  so_luong: number
  gia_don_vi: number
  trang_thai?: 'hoatdong' | 'hethan' | 'huy'
  ma_qr?: string | null
  ghi_chu?: string | null
}

export async function createProductBatch(payload: ProductBatchCreate) {
  return await apiClient.post('/batches/products', payload)
}

export async function createComponentBatch(payload: ComponentBatchCreate) {
  return await apiClient.post('/batches/components', payload)
}

export async function createGiftBoxBatch(payload: GiftBoxBatchCreate) {
  return await apiClient.post('/batches/gift-boxes', payload)
}
