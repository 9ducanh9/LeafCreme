import { apiClient } from './api'

export interface ScanLookupResponse {
  type: 'variant' | 'product' | 'product_batch' | 'component_batch' | 'giftbox_batch'
  product_id?: number | null
  product_name?: string | null
  product_image?: string | null
  variant_id?: number | null
  variant_label?: string | null
  price?: number | null
  sku?: string | null
  batch_id?: number | null
  ma_lo?: string | null
  ma_qr?: string | null
}

export async function scanLookup(code: string): Promise<ScanLookupResponse> {
  return await apiClient.get<ScanLookupResponse>('/lookup/scan', { code })
}
