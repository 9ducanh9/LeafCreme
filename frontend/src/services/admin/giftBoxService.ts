// Admin Gift Box Service - API calls for gift box management
import { apiClient } from '../api'
import { BackendGiftBox, BomItem } from '../../types/giftBox'

export interface GiftBoxCreate {
  ten_hop_qua: string
  sku?: string
  gia_ban: number
  mo_ta?: string
  hinh_anh_url?: string
  kich_thuoc?: string
  trong_luong?: number
  dang_hoat_dong?: boolean
}

export interface GiftBoxUpdate {
  ten_hop_qua?: string
  sku?: string
  gia_ban?: number
  mo_ta?: string
  hinh_anh_url?: string
  kich_thuoc?: string
  trong_luong?: number
  dang_hoat_dong?: boolean
}

export interface GiftBoxFilters {
  search?: string
  dang_hoat_dong?: boolean
  min_price?: number
  max_price?: number
}

/**
 * Get all gift boxes
 */
export async function getGiftBoxes(filters?: GiftBoxFilters): Promise<BackendGiftBox[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.dang_hoat_dong !== undefined) params.append('dang_hoat_dong', String(filters.dang_hoat_dong))
    if (filters?.min_price) params.append('min_price', String(filters.min_price))
    if (filters?.max_price) params.append('max_price', String(filters.max_price))
    
    const queryString = params.toString()
    const url = `/admin/gift-boxes${queryString ? `?${queryString}` : ''}`
    const response = await apiClient.get<BackendGiftBox[]>(url)
    return response
  } catch (error) {
    console.error('Error fetching gift boxes:', error)
    throw error
  }
}

/**
 * Get single gift box by ID
 */
export async function getGiftBoxById(id: number): Promise<BackendGiftBox> {
  try {
    const response = await apiClient.get<BackendGiftBox>(`/admin/gift-boxes/${id}`)
    return response
  } catch (error) {
    console.error('Error fetching gift box:', error)
    throw error
  }
}

/**
 * Create new gift box
 */
export async function createGiftBox(data: GiftBoxCreate): Promise<BackendGiftBox> {
  try {
    const response = await apiClient.post<BackendGiftBox>('/admin/gift-boxes', data)
    return response
  } catch (error) {
    console.error('Error creating gift box:', error)
    throw error
  }
}

/**
 * Update gift box
 */
export async function updateGiftBox(id: number, data: GiftBoxUpdate): Promise<BackendGiftBox> {
  try {
    const response = await apiClient.put<BackendGiftBox>(`/admin/gift-boxes/${id}`, data)
    return response
  } catch (error) {
    console.error('Error updating gift box:', error)
    throw error
  }
}

/**
 * Delete gift box
 */
export async function deleteGiftBox(id: number): Promise<void> {
  try {
    await apiClient.delete(`/admin/gift-boxes/${id}`)
  } catch (error) {
    console.error('Error deleting gift box:', error)
    throw error
  }
}

/**
 * Get BOM for a gift box
 */
export async function getGiftBoxBom(giftBoxId: number): Promise<BomItem[]> {
  try {
    const response = await apiClient.get<BomItem[]>(`/admin/gift-boxes/${giftBoxId}/bom`)
    return response
  } catch (error) {
    console.error('Error fetching BOM:', error)
    throw error
  }
}

/**
 * Add BOM item
 */
export async function addBomItem(giftBoxId: number, bienthe_id: number, so_luong: number): Promise<BomItem> {
  try {
    const response = await apiClient.post<BomItem>(`/admin/gift-boxes/${giftBoxId}/bom`, {
      bienthe_id,
      so_luong,
    })
    return response
  } catch (error) {
    console.error('Error adding BOM item:', error)
    throw error
  }
}

/**
 * Update BOM item quantity
 */
export async function updateBomItem(giftBoxId: number, bomId: number, so_luong: number): Promise<BomItem> {
  try {
    const response = await apiClient.put<BomItem>(`/admin/gift-boxes/${giftBoxId}/bom/${bomId}`, {
      so_luong,
    })
    return response
  } catch (error) {
    console.error('Error updating BOM item:', error)
    throw error
  }
}

/**
 * Delete BOM item
 */
export async function deleteBomItem(giftBoxId: number, bomId: number): Promise<void> {
  try {
    await apiClient.delete(`/admin/gift-boxes/${giftBoxId}/bom/${bomId}`)
  } catch (error) {
    console.error('Error deleting BOM item:', error)
    throw error
  }
}













