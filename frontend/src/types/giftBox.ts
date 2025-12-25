// Gift Box types and interfaces
export type GiftBoxOccasion = 'birthday' | 'thanks' | 'love' | 'holiday' | 'self_care'
export type GiftBoxTag = 'limited' | 'best_gift' | 'new'
export type GiftBoxStatus = 'active' | 'hidden' | 'sold_out'

export interface GiftBoxItem {
  name: string
  quantity: number
}

// Backend Gift Box structure (from API)
export interface BackendGiftBox {
  hop_qua_id: number
  ten_hop_qua: string
  sku: string | null
  gia_ban: number
  mo_ta: string | null
  hinh_anh_url: string | null
  kich_thuoc: string | null
  trong_luong: number | null
  dang_hoat_dong: boolean
  ngay_tao: string
}

// Frontend Gift Box (with computed fields for display)
export interface GiftBox {
  id: string
  name: string
  subtitle: string
  description: string
  story: string
  price: number
  tags: GiftBoxTag[]
  occasions: GiftBoxOccasion[]
  includedItems: GiftBoxItem[]
  status: GiftBoxStatus
  imageKey?: string
  imageUrl?: string
  sku?: string // SKU from backend for synchronization
}

// BOM Item structure
export interface BomItem {
  bom_id: number
  hop_qua_id: number
  bienthe_id: number
  so_luong: number
  ngay_tao: string
  variant_name?: string | null
  variant_price?: number | null
  product_name?: string | null
  product_category?: string | null
  variant_active?: boolean | null
}

export interface GiftBoxFilters {
  occasion?: GiftBoxOccasion
  tag?: GiftBoxTag
  minPrice?: number
  maxPrice?: number
  search?: string
}

