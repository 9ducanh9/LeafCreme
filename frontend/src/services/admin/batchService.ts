import { apiClient } from '../api'
import type { Page } from '../../types/page'

export interface BatchPageItem {
  lohang_id: number
  ma_lo: string
  ngay_nhap: string
  ngay_het_han: string
  so_luong: number
  so_luong_hien_tai?: number | null
  so_luong_da_ban?: number | null
  so_luong_da_su_dung?: number | null
  trang_thai: string
  bienthe_sanpham_id?: number
  linh_kien_id?: number
  hop_qua_id?: number
}

export type BatchListKind = 'products' | 'components' | 'gift-boxes'

export async function getBatchPage(
  kind: BatchListKind,
  params: { skip: number; limit: number; sort_by: string; sort_dir: 'asc' | 'desc'; search?: string; trang_thai?: string },
) {
  return apiClient.get<Page<BatchPageItem>>(`/batches/${kind}`, { ...params, search: params.search || null, trang_thai: params.trang_thai || null })
}

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
