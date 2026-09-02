// Product service for fetching products from backend API
import { apiClient } from './api'
import type { Product, ProductAvailability, ProductFilters, ProductVariant } from '../types/product'

// Re-export types for backward compatibility
export type { Product, ProductFilters, ProductVariant }

export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  return await apiClient.get<Product[]>('/products', filters as Record<string, string | number | boolean | null>)
}

export async function getProductById(productId: number): Promise<Product> {
  return await apiClient.get<Product>(`/products/${productId}`)
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  return getProducts({ danh_muc: category, dang_hoat_dong: true })
}

export async function getBestSellers(limit: number = 3): Promise<Product[]> {
  const rows = await apiClient.get<Array<{
    product_id: number
    name: string
    category?: string
    base_price: number
    image_url?: string
  }>>('/analytics/best-sellers', { limit })

  return rows.map((row) => ({
    sanpham_id: row.product_id,
    ten: row.name,
    sku: '',
    loai: 'don',
    gia_co_ban: Number(row.base_price),
    hinh_anh_url: row.image_url,
    danh_muc: row.category,
    dang_hoat_dong: true,
    ngay_tao: '',
  }))
}

export async function getProductVariants(productId: number): Promise<ProductVariant[]> {
  return await apiClient.get<ProductVariant[]>(`/products/${productId}/variants`)
}

export async function getProductAvailability(productId: number): Promise<ProductAvailability[]> {
  return await apiClient.get<ProductAvailability[]>(`/products/${productId}/availability`)
}

