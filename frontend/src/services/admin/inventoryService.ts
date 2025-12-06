// Inventory service for admin panel
import { apiClient } from '../api'

// Mock data storage key
const STORAGE_KEY_PRODUCTS = 'leaf_creme_mock_inventory_products'
const STORAGE_KEY_COMPONENTS = 'leaf_creme_mock_inventory_components'
const STORAGE_KEY_GIFTBOXES = 'leaf_creme_mock_inventory_giftboxes'

export interface ProductInventoryItem {
  lohang_id: number
  ma_lo: string
  bienthe_id: number
  sanpham_id?: number
  ten_sanpham?: string
  huong_vi: string
  kich_thuoc?: string
  so_luong_hien_tai: number
  so_luong_da_ban: number
  ngay_het_han: string
}

export interface ComponentInventoryItem {
  lohang_id: number
  ma_lo: string
  linh_kien_id: number
  ten_linh_kien: string
  so_luong_hien_tai: number
  so_luong_da_su_dung: number
  ngay_het_han: string
}

export interface GiftBoxInventoryItem {
  lohang_id: number
  ma_lo: string
  hop_qua_id: number
  ten_hop_qua: string
  so_luong_hien_tai: number
  so_luong_da_ban: number
  ngay_het_han: string
}

// Helper functions for mock data
function getMockProductInventory(): ProductInventoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRODUCTS)
    if (stored) {
      return JSON.parse(stored)
    }
    return []
  } catch {
    return []
  }
}

function getMockComponentInventory(): ComponentInventoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COMPONENTS)
    if (stored) {
      return JSON.parse(stored)
    }
    return []
  } catch {
    return []
  }
}

function getMockGiftBoxInventory(): GiftBoxInventoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_GIFTBOXES)
    if (stored) {
      return JSON.parse(stored)
    }
    return []
  } catch {
    return []
  }
}

export async function getProductInventory(bienthe_id?: number): Promise<ProductInventoryItem[]> {
  try {
    const data = await apiClient.get<ProductInventoryItem[]>('/batches/inventory/products', {
      bienthe_id: bienthe_id || null,
    })
    // Save to localStorage as cache
    if (data && data.length > 0) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(data))
    }
    return data
  } catch (error: any) {
    console.warn('Failed to fetch product inventory from API, using cached data:', error)
    // Fallback to mock/cached data
    const cached = getMockProductInventory()
    if (bienthe_id) {
      return cached.filter(item => item.bienthe_id === bienthe_id)
    }
    return cached
  }
}

export async function getComponentInventory(linh_kien_id?: number): Promise<ComponentInventoryItem[]> {
  try {
    const data = await apiClient.get<ComponentInventoryItem[]>('/batches/inventory/components', {
      linh_kien_id: linh_kien_id || null,
    })
    // Save to localStorage as cache
    if (data && data.length > 0) {
      localStorage.setItem(STORAGE_KEY_COMPONENTS, JSON.stringify(data))
    }
    return data
  } catch (error: any) {
    console.warn('Failed to fetch component inventory from API, using cached data:', error)
    // Fallback to mock/cached data
    const cached = getMockComponentInventory()
    if (linh_kien_id) {
      return cached.filter(item => item.linh_kien_id === linh_kien_id)
    }
    return cached
  }
}

export async function getGiftBoxInventory(hop_qua_id?: number): Promise<GiftBoxInventoryItem[]> {
  try {
    const data = await apiClient.get<GiftBoxInventoryItem[]>('/batches/inventory/gift-boxes', {
      hop_qua_id: hop_qua_id || null,
    })
    // Save to localStorage as cache
    if (data && data.length > 0) {
      localStorage.setItem(STORAGE_KEY_GIFTBOXES, JSON.stringify(data))
    }
    return data
  } catch (error: any) {
    console.warn('Failed to fetch gift box inventory from API, using cached data:', error)
    // Fallback to mock/cached data
    const cached = getMockGiftBoxInventory()
    if (hop_qua_id) {
      return cached.filter(item => item.hop_qua_id === hop_qua_id)
    }
    return cached
  }
}

