// Analytics service for Leafie chatbot
import { apiClient } from './api'

export interface BestSeller {
  product_id: number
  name: string
  category: string | null
  base_price: number
  image_url: string | null
  sold_count: number
}

/**
 * Get best-selling products
 * Public endpoint, no auth required
 */
export async function getBestSellers(limit: number = 5): Promise<BestSeller[]> {
  try {
    return await apiClient.get<BestSeller[]>('/analytics/best-sellers', { limit })
  } catch (error) {
    console.error('Error fetching best sellers:', error)
    // Return empty array on error
    return []
  }
}

