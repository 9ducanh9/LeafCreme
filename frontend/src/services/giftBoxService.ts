// Gift Box service - API-first with fallback to static data
import { apiClient } from './api'
import { GiftBox, GiftBoxFilters, BackendGiftBox, BomItem } from '../types/giftBox'
import { FALLBACK_GIFT_BOXES } from '../data/giftBoxes'

/**
 * Convert backend gift box to frontend format
 */
function mapBackendToFrontend(backend: BackendGiftBox, bomItems?: BomItem[]): GiftBox {
  // Map BOM items to includedItems
  const includedItems = (bomItems || []).map((item) => ({
    name: item.variant_name || item.product_name || `Sản phẩm #${item.bienthe_id}`,
    quantity: item.so_luong,
  }))

  return {
    id: backend.hop_qua_id.toString(),
    name: backend.ten_hop_qua,
    subtitle: backend.mo_ta || '',
    description: backend.mo_ta || '',
    story: backend.mo_ta || '',
    price: Number(backend.gia_ban),
    tags: [],
    occasions: [],
    includedItems,
    status: backend.dang_hoat_dong ? 'active' : 'hidden',
    imageUrl: backend.hinh_anh_url || undefined,
    // Store SKU for reference (can be used in cart/orders)
    sku: backend.sku || undefined,
  } as GiftBox & { sku?: string }
}

export async function getGiftBoxes(filters?: GiftBoxFilters): Promise<GiftBox[]> {
  try {
    // Try API first
    const params: Record<string, string | number | boolean | null> = {
      dang_hoat_dong: true, // Only active boxes for customer-facing
    }
    if (filters?.search) params.search = filters.search
    if (filters?.minPrice) params.min_price = filters.minPrice
    if (filters?.maxPrice) params.max_price = filters.maxPrice

    // Use public endpoint for customer-facing page (no auth required)
    const backendBoxes = await apiClient.get<BackendGiftBox[]>('/gift-boxes', params)
    
    // Convert to frontend format
    return backendBoxes.map((box) => mapBackendToFrontend(box))
  } catch (error: unknown) {
    console.warn('Gift box API not available, using fallback data:', error)
    // Fallback to static data
    let filtered = [...FALLBACK_GIFT_BOXES]

    if (filters?.occasion) {
      filtered = filtered.filter((box) => box.occasions.includes(filters.occasion!))
    }

    if (filters?.tag) {
      filtered = filtered.filter((box) => box.tags.includes(filters.tag!))
    }

    if (filters?.minPrice !== undefined) {
      filtered = filtered.filter((box) => box.price >= filters.minPrice!)
    }

    if (filters?.maxPrice !== undefined) {
      filtered = filtered.filter((box) => box.price <= filters.maxPrice!)
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (box) =>
          box.name.toLowerCase().includes(searchLower) ||
          box.subtitle.toLowerCase().includes(searchLower) ||
          box.description.toLowerCase().includes(searchLower)
      )
    }

    return filtered.filter((box) => box.status === 'active')
  }
}

export async function getGiftBoxById(id: string): Promise<GiftBox> {
  try {
    // Try API first - use public endpoint
    const giftBoxId = parseInt(id)
    const [backendBox, bomItems] = await Promise.all([
      apiClient.get<BackendGiftBox>(`/gift-boxes/${giftBoxId}`),
      apiClient.get<BomItem[]>(`/gift-boxes/${giftBoxId}/bom`).catch(() => []), // BOM is optional, don't fail if it errors
    ])

    return mapBackendToFrontend(backendBox, bomItems)
  } catch (error: unknown) {
    console.warn('Gift box API not available, using fallback data:', error)
    // Fallback to static data
    const giftBox = FALLBACK_GIFT_BOXES.find((box) => box.id === id)
    if (!giftBox) {
      throw new Error('Gift box not found')
    }
    return giftBox
  }
}

