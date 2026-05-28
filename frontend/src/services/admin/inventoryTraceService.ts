import { apiClient } from '../api'

export type BatchType = 'sanpham' | 'linhkien' | 'hopqua'
export type MovementType = 'nhap' | 'xuat' | 'dieu_chuyen' | 'kiem_ke' | 'huy'

export interface StockLedgerRow {
  ledger_id: number
  item_type: BatchType
  batch_id: number
  movement_type: MovementType
  quantity: number
  quantity_before: number
  quantity_after: number
  reason?: string | null
  order_id?: number | null
  actor_user_id?: number | null
  timestamp: string
}

export interface InventoryLedgerFilters {
  item_type?: BatchType
  batch_id?: number
  movement_type?: MovementType
  order_id?: number
  date_from?: string
  date_to?: string
  skip?: number
  limit?: number
}

export interface BatchTraceMetadata {
  batch_type: BatchType
  batch_id: number
  batch_code: string
  item_id: number
  item_name: string
  variant_id?: number | null
  variant_name?: string | null
  imported_quantity: number
  current_quantity: number
  sold_or_used_quantity: number
  expires_at: string
  status: string
}

export interface BatchAllocationRow {
  allocation_id: number
  order_id: number
  order_item_id: number
  quantity: number
  created_at: string
}

export interface BatchTraceResponse {
  batch: BatchTraceMetadata
  movements: StockLedgerRow[]
  allocations: BatchAllocationRow[]
}

export const getInventoryLedger = (filters: InventoryLedgerFilters = {}) => {
  const params: Record<string, string | number | boolean | null> = {}
  Object.entries({ ...filters, limit: filters.limit ?? 100 }).forEach(([key, value]) => {
    if (value !== undefined) {
      params[key] = value
    }
  })
  return apiClient.get<StockLedgerRow[]>('/inventory-ledger', params)
}

export const getBatchTrace = (batchType: BatchType, batchId: number) => {
  return apiClient.get<BatchTraceResponse>(`/batch-trace/${batchType}/${batchId}`)
}

export const getBatchTypeLabel = (batchType: BatchType) => {
  switch (batchType) {
    case 'sanpham':
      return 'Sản phẩm'
    case 'linhkien':
      return 'Linh kiện'
    case 'hopqua':
      return 'Hộp quà'
    default:
      return batchType
  }
}

export const getMovementTypeLabel = (movementType: MovementType) => {
  switch (movementType) {
    case 'nhap':
      return 'Nhập'
    case 'xuat':
      return 'Xuất'
    case 'dieu_chuyen':
      return 'Điều chuyển'
    case 'kiem_ke':
      return 'Kiểm kê'
    case 'huy':
      return 'Hủy'
    default:
      return movementType
  }
}
