// Category Service
// Dedicated backend category CRUD endpoints do not exist yet in this repository.
// Local category writes are demo/dev-only and disabled by default.
const DEMO_STORAGE_KEY = 'leaf_creme_demo_categories'
const DEMO_CATEGORY_WRITE_ENABLED = import.meta.env.VITE_ENABLE_DEMO_CATEGORY_MANAGEMENT === 'true'
const DEMO_CATEGORY_WRITE_ERROR =
  'Category management is demo/dev-only. Set VITE_ENABLE_DEMO_CATEGORY_MANAGEMENT=true to enable local demo edits.'

const DEFAULT_CATEGORIES = ['Bánh kem', 'Bông lan', 'Mousse', 'Tiramisu']

export function getCategories(): string[] {
  if (!DEMO_CATEGORY_WRITE_ENABLED) {
    return DEFAULT_CATEGORIES
  }

  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES))
    return DEFAULT_CATEGORIES
  } catch {
    return DEFAULT_CATEGORIES
  }
}

function saveCategories(categories: string[]): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(categories))
  } catch {
    /* localStorage không khả dụng (private mode / hết quota) — bỏ qua, không chặn luồng */
  }
}

export function addCategory(category: string): void {
  if (!DEMO_CATEGORY_WRITE_ENABLED) {
    throw new Error(DEMO_CATEGORY_WRITE_ERROR)
  }
  if (!category.trim()) return

  const categories = getCategories()
  const normalizedCategory = category.trim()
  if (categories.some((item) => item.toLowerCase() === normalizedCategory.toLowerCase())) {
    throw new Error('Danh mục đã tồn tại')
  }

  categories.push(normalizedCategory)
  saveCategories(categories)
}

export function deleteCategory(category: string): void {
  if (!DEMO_CATEGORY_WRITE_ENABLED) {
    throw new Error(DEMO_CATEGORY_WRITE_ERROR)
  }
  const categories = getCategories()
  const filtered = categories.filter((item) => item !== category)
  saveCategories(filtered)
}

export function isCategoryInUse(category: string): boolean {
  if (!DEMO_CATEGORY_WRITE_ENABLED) {
    return true
  }
  try {
    const products = JSON.parse(localStorage.getItem('leaf_creme_mock_products') || '[]') as unknown
    if (!Array.isArray(products)) return false
    return (products as Array<{ category?: string }>).some((item) => item.category === category)
  } catch {
    return false
  }
}
