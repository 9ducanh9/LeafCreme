import { apiClient } from '../api'

export interface SupplierItem {
  ncc_id: number
  ten_ncc: string
  ma_ncc?: string | null
  dang_hoat_dong: boolean
}

export async function getSuppliers(params?: {
  search?: string
  dang_hoat_dong?: boolean
}): Promise<SupplierItem[]> {
  return await apiClient.get<SupplierItem[]>('/suppliers', {
    search: params?.search || null,
    dang_hoat_dong: params?.dang_hoat_dong ?? null,
    limit: 200,
  })
}
