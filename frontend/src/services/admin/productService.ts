// Admin Product Service - API calls for product management
import { Product, ProductVariant } from '../../types/admin'
import apiClient from '../api'

// Mock data storage key
const STORAGE_KEY = 'leaf_creme_mock_products'

// Initial mock data
const INITIAL_MOCK_PRODUCTS: ProductVariant[] = [
  {
    id: '1',
    productId: 'p1',
    name: 'Tiramisu Classic',
    description: 'Bánh tiramisu cổ điển với vị cà phê đậm đà',
    category: 'Tiramisu',
    price: 250000,
    size: 'M',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80',
    sku: 'TIR-M-001',
  },
  {
    id: '2',
    productId: 'p1',
    name: 'Tiramisu Classic',
    description: 'Bánh tiramisu cổ điển với vị cà phê đậm đà',
    category: 'Tiramisu',
    price: 350000,
    size: 'L',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80',
    sku: 'TIR-L-001',
  },
  {
    id: '3',
    productId: 'p2',
    name: 'Mousse Chocolate',
    description: 'Bánh mousse chocolate mịn màng, thanh nhẹ',
    category: 'Mousse',
    price: 200000,
    size: 'S',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
    sku: 'MOU-S-001',
  },
]

// Get mock products from localStorage or use initial data
function getMockProducts(): ProductVariant[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    // First time: save initial data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_PRODUCTS))
    return INITIAL_MOCK_PRODUCTS
  } catch {
    return INITIAL_MOCK_PRODUCTS
  }
}

// Save mock products to localStorage
function saveMockProducts(products: ProductVariant[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  } catch (error) {
    console.error('Failed to save products to localStorage:', error)
  }
}

export async function getProductVariants(filters?: {
  category?: string
  size?: string
  search?: string
}): Promise<ProductVariant[]> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/products/variants', { params: filters })
  // return response.data

  const MOCK_PRODUCTS = getMockProducts()
  let filtered = [...MOCK_PRODUCTS]

  if (filters?.category) {
    filtered = filtered.filter((p) => p.category === filters.category)
  }

  if (filters?.size) {
    filtered = filtered.filter((p) => p.size === filters.size)
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
    )
  }

  return filtered
}

export async function getProductVariantById(id: string): Promise<ProductVariant> {
  // TODO: Replace with real API call
  const MOCK_PRODUCTS = getMockProducts()
  const variant = MOCK_PRODUCTS.find((p) => p.id === id)
  if (!variant) throw new Error('Product variant not found')
  return variant
}

export async function createProductVariant(data: Omit<ProductVariant, 'id'>): Promise<ProductVariant> {
  // TODO: Replace with real API call
  // const response = await apiClient.post('/admin/products/variants', data)
  // return response.data

  const MOCK_PRODUCTS = getMockProducts()
  const newVariant: ProductVariant = {
    ...data,
    id: Date.now().toString(),
  }
  MOCK_PRODUCTS.push(newVariant)
  saveMockProducts(MOCK_PRODUCTS)
  return newVariant
}

export async function updateProductVariant(
  id: string,
  data: Partial<ProductVariant>
): Promise<ProductVariant> {
  // TODO: Replace with real API call
  // const response = await apiClient.put(`/admin/products/variants/${id}`, data)
  // return response.data

  const MOCK_PRODUCTS = getMockProducts()
  const index = MOCK_PRODUCTS.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Product variant not found')

  MOCK_PRODUCTS[index] = { ...MOCK_PRODUCTS[index], ...data }
  saveMockProducts(MOCK_PRODUCTS)
  return MOCK_PRODUCTS[index]
}

export async function deleteProductVariant(id: string): Promise<void> {
  // TODO: Replace with real API call
  // await apiClient.delete(`/admin/products/variants/${id}`)

  const MOCK_PRODUCTS = getMockProducts()
  const index = MOCK_PRODUCTS.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Product variant not found')
  MOCK_PRODUCTS.splice(index, 1)
  saveMockProducts(MOCK_PRODUCTS)
}

