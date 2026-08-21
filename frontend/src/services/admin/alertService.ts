// Alert Service - API calls for inventory alerts
import { apiClient } from '../api'
import type { Page } from '../../types/page'

export interface Alert {
  canhbao_id: number
  loai_canh_bao: 'ton_kho_thap' | 'sap_het_han' | 'het_han' | 'qua_han'
  muc_do_nghiem_trong: 'thap' | 'binh_thuong' | 'cao'
  ngay_canh_bao: string
  trang_thai: 'chua_xu_ly' | 'dang_xu_ly' | 'da_xu_ly' | 'bo_qua'
  nguoi_xu_ly?: number
  ngay_xu_ly?: string
  ghi_chu?: string
  lohang_id?: number
  loai_lohang?: 'sanpham' | 'linhkien' | 'hopqua'
  ten_san_pham?: string
  ma_lo?: string
  ngay_het_han?: string
  so_luong_hien_tai?: number
}

export interface AlertSummary {
  total: number
  pending: number
  processing: number
  resolved: number
  by_type: Record<string, number>
  by_severity: Record<string, number>
}

export interface GenerateAlertsResult {
  low_stock_created: number
  expiring_created: number
  expired_created: number
  total_created: number
}

export interface AlertFilters {
  loai_canh_bao?: string
  muc_do?: string
  trang_thai?: string
  skip?: number
  limit?: number
}

export interface AlertUpdate {
  trang_thai?: 'chua_xu_ly' | 'dang_xu_ly' | 'da_xu_ly' | 'bo_qua'
  ghi_chu?: string
}

// Get all alerts with optional filters
export async function getAlerts(filters?: AlertFilters & { sort_by?: string; sort_dir?: 'asc' | 'desc' }): Promise<Page<Alert>> {
  return await apiClient.get<Page<Alert>>('/alerts', {
    loai_canh_bao: filters?.loai_canh_bao,
    muc_do: filters?.muc_do,
    trang_thai: filters?.trang_thai,
    skip: filters?.skip ?? 0,
    limit: filters?.limit ?? 50,
    paginated: true,
    sort_by: filters?.sort_by ?? 'ngay_tao',
    sort_dir: filters?.sort_dir ?? 'desc',
  })
}

// Get alerts summary for dashboard
export async function getAlertsSummary(): Promise<AlertSummary> {
  return await apiClient.get<AlertSummary>('/alerts/summary')
}

// Generate new alerts based on current stock
export async function generateAlerts(
  lowStockThreshold: number = 10,
  expiringDays: number = 7
): Promise<GenerateAlertsResult> {
  return await apiClient.post<GenerateAlertsResult>(
    `/alerts/generate?low_stock_threshold=${lowStockThreshold}&expiring_days=${expiringDays}`
  )
}

// Update alert status
export async function updateAlert(alertId: number, data: AlertUpdate): Promise<Alert> {
  return await apiClient.patch<Alert>(`/alerts/${alertId}`, data)
}

// Delete single alert
export async function deleteAlert(alertId: number): Promise<void> {
  await apiClient.delete(`/alerts/${alertId}`)
}

// Clear all resolved alerts
export async function clearResolvedAlerts(): Promise<{ deleted_count: number }> {
  return await apiClient.delete<{ deleted_count: number }>('/alerts/resolved/clear')
}

// Helper function to get Vietnamese labels
export function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ton_kho_thap: 'Tồn kho thấp',
    sap_het_han: 'Sắp hết hạn',
    het_han: 'Đã hết hạn',
    qua_han: 'Quá hạn'
  }
  return labels[type] || type
}

export function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    thap: 'Thấp',
    binh_thuong: 'Bình thường',
    cao: 'Cao'
  }
  return labels[severity] || severity
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    chua_xu_ly: 'Chưa xử lý',
    dang_xu_ly: 'Đang xử lý',
    da_xu_ly: 'Đã xử lý',
    bo_qua: 'Bỏ qua'
  }
  return labels[status] || status
}

export function getBatchTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    sanpham: 'Sản phẩm',
    linhkien: 'Linh kiện',
    hopqua: 'Hộp quà'
  }
  return labels[type] || type
}

