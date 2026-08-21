import { apiClient } from '../api'

/** Categories are derived from active products; there is no parallel catalog. */
export async function getCategories(): Promise<string[]> {
  return apiClient.get<string[]>('/products/categories')
}
