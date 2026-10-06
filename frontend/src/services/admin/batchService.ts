import { apiClient } from '../api'
import type { Page } from '../../types/page'
import { batchCalendarDateTime } from '../../utils/admin/validateBatch'

export interface BatchPageItem {
  lohang_id: number
  ma_lo: string
  ngay_nhap: string
  ngay_san_xuat?: string
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
export type BatchCodeKind = 'products' | 'components' | 'gift_boxes'

export async function getProductBatch(batchId: number) {
  return apiClient.get<BatchPageItem>(`/batches/products/${batchId}`)
}

export async function updateProductBatchDates(batchId: number, produced: string, expires: string, restore = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(produced) || !/^\d{4}-\d{2}-\d{2}$/.test(expires) || expires <= produced) {
    throw new Error('Ngày hết hạn phải sau ngày sản xuất')
  }
  return apiClient.put<BatchPageItem>(`/batches/products/${batchId}`, {
    ngay_san_xuat: batchCalendarDateTime(produced),
    ngay_het_han: batchCalendarDateTime(expires),
    ...(restore ? { trang_thai: 'hoatdong' } : {}),
  })
}

export async function pauseBatch(kind: BatchListKind, batch: BatchPageItem) {
  return apiClient.put<BatchPageItem>(`/batches/${kind}/${batch.lohang_id}`, { trang_thai: 'tamdung' })
}

export async function disposeExpiredBatch(kind: BatchListKind, batch: BatchPageItem, reason: string) {
  return apiClient.post<BatchPageItem>(`/batches/${kind}/${batch.lohang_id}/dispose-expired`, {
    expected_quantity: batch.so_luong_hien_tai,
    reason,
  })
}

export async function getBatchPage(
  kind: BatchListKind,
  params: { skip: number; limit: number; sort_by: string; sort_dir: 'asc' | 'desc'; search?: string; trang_thai?: string },
) {
  return apiClient.get<Page<BatchPageItem>>(`/batches/${kind}`, { ...params, search: params.search || null, trang_thai: params.trang_thai || null })
}

export interface ProductBatchCreate {
  bienthe_sanpham_id: number
  ncc_id?: number | null
  ma_lo?: string | null
  ngay_san_xuat: string
  ngay_het_han?: string | null
  so_luong: number
  gia_don_vi: number
  trang_thai?: 'hoatdong' | 'hethan' | 'huy'
  ma_qr?: string | null
  ghi_chu?: string | null
}

export interface ComponentBatchCreate {
  linh_kien_id: number
  ncc_id?: number | null
  ma_lo?: string | null
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
  ma_lo?: string | null
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

export async function suggestBatchCode(kind: BatchCodeKind, itemId: number, referenceDate?: string) {
  return await apiClient.get<{ ma_lo: string }>('/batches/suggest-code', {
    kind,
    item_id: itemId,
    reference_date: referenceDate || null,
  })
}

export interface ExpiringBatchItem {
  lohang_id: number
  ma_lo: string
  ngay_het_han: string
  so_luong_hien_tai: number
  ten: string
}

export interface ExpiringBatches {
  products: ExpiringBatchItem[]
  components: ExpiringBatchItem[]
  gift_boxes: ExpiringBatchItem[]
}

export async function getExpiringBatches(days: number = 2) {
  return apiClient.get<ExpiringBatches>('/batches/expiring', { days })
}
