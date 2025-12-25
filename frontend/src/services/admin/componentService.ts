import { apiClient } from '../api'

export interface ComponentItem {
  linh_kien_id: number
  ten_linh_kien: string
  sku?: string | null
  don_vi_tinh?: string | null
  gia_don_vi: number
  dang_hoat_dong: boolean
}

export async function getComponents(params?: {
  search?: string
  dang_hoat_dong?: boolean
}): Promise<ComponentItem[]> {
  return await apiClient.get<ComponentItem[]>('/components', {
    search: params?.search || null,
    dang_hoat_dong: params?.dang_hoat_dong ?? null,
  })
}
