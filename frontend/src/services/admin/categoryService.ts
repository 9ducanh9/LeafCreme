// Category Service - Manage product categories
const STORAGE_KEY = 'leaf_creme_categories'

// Default categories
const DEFAULT_CATEGORIES = ['Bánh kem', 'Bông lan', 'Mousse', 'Tiramisu']

// Get categories from localStorage or use default
export function getCategories(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    // First time: save default categories
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES))
    return DEFAULT_CATEGORIES
  } catch {
    return DEFAULT_CATEGORIES
  }
}

// Save categories to localStorage
function saveCategories(categories: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
  } catch (error) {
    console.error('Failed to save categories to localStorage:', error)
  }
}

// Add a new category
export function addCategory(category: string): void {
  if (!category.trim()) return
  
  const categories = getCategories()
  const normalizedCategory = category.trim()
  
  // Check if category already exists (case-insensitive)
  if (categories.some(c => c.toLowerCase() === normalizedCategory.toLowerCase())) {
    throw new Error('Danh mục đã tồn tại')
  }
  
  categories.push(normalizedCategory)
  saveCategories(categories)
}

// Delete a category
export function deleteCategory(category: string): void {
  const categories = getCategories()
  const filtered = categories.filter(c => c !== category)
  saveCategories(filtered)
}

// Check if category is in use (has products)
export function isCategoryInUse(category: string): boolean {
  try {
    const products = JSON.parse(localStorage.getItem('leaf_creme_mock_products') || '[]') as unknown
    if (!Array.isArray(products)) return false
    return (products as Array<{ category?: string }>).some((p) => p.category === category)
  } catch {
    return false
  }
}



