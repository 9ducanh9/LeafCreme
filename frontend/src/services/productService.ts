// Product service for fetching products from backend API
import { apiClient } from './api'

export interface Product {
  sanpham_id: number
  ten: string
  sku: string
  loai: 'don' | 'bien_the' | 'hop_qua'
  gia_co_ban: number
  mo_ta?: string
  hinh_anh_url?: string
  danh_muc?: string
  don_vi_tinh?: string
  dang_hoat_dong: boolean
  ngay_tao: string
}

export interface ProductFilters {
  search?: string
  danh_muc?: string
  loai?: 'don' | 'bien_the' | 'hop_qua'
  dang_hoat_dong?: boolean
  skip?: number
  limit?: number
}

export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  try {
    return await apiClient.get<Product[]>('/products', filters)
  } catch (error) {
    console.error('Error fetching products:', error)
    throw error
  }
}

export async function getProductById(productId: number): Promise<Product> {
  try {
    return await apiClient.get<Product>(`/products/${productId}`)
  } catch (error) {
    console.error('Error fetching product:', error)
    throw error
  }
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  return getProducts({ danh_muc: category, dang_hoat_dong: true })
}

export async function getBestSellers(limit: number = 3): Promise<Product[]> {
  // For now, get active products and take first N
  // Later can be enhanced with backend endpoint for best sellers
  const products = await getProducts({ 
    dang_hoat_dong: true, 
    limit 
  })
  return products.slice(0, limit)
}

export interface ProductVariant {
  bienthe_id: number
  sanpham_id: number
  huong_vi: string
  kich_thuoc?: string
  gia_bienthe: number
  sku_bienthe?: string
  muc_gioi_han_ton: number
  dang_hoat_dong: boolean
  ngay_tao: string
}

export async function getProductVariants(productId: number): Promise<ProductVariant[]> {
  try {
    return await apiClient.get<ProductVariant[]>(`/products/${productId}/variants`)
  } catch (error) {
    console.error('Error fetching product variants:', error)
    throw error
  }
}

