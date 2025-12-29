// Leafie types and interfaces
export interface LeafieMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/**
 * Base context without sessionId - used by buildLeafieContext
 */
export interface LeafieContextBase {
  // All products (not just best sellers)
  allProducts: Array<{
    id: number
    name: string
    price: number
    category?: string
    type: 'don' | 'bien_the' | 'hop_qua'
    description?: string
    variantCount?: number // Number of variants for bien_the products
    phu_hop_dip?: string[] // Danh sách dịp phù hợp (đồng bộ với GiftBoxOccasion): birthday, thanks, love, holiday, self_care
  }>
  // Statistics
  stats: {
    totalProducts: number
    totalVariants: number
    totalCategories: number
    totalGiftBoxes: number
    totalVouchers: number
  }
  categories: Array<{
    id: number
    name: string
    productCount?: number
  }>
  sizeGuide: Array<{
    size: string
    diameter: string
    peopleMin: number
    peopleMax: number
    recommendedSize: string
  }>
  giftBoxes?: Array<{
    id: number
    name: string
    price: number
    description?: string
    occasions?: string[]
  }>
  vouchers?: Array<{
    code: string
    type: 'percent' | 'fixed_amount'
    value: number
    appliesTo: 'all' | 'product' | 'category'
    minOrderValue?: number
    expiresAt?: string
  }>
}

/**
 * Full context with sessionId - used when sending to API
 * ⚠️ QUAN TRỌNG: sessionId PHẢI giữ nguyên trong suốt 1 cuộc chat để n8n memory hoạt động đúng
 */
export interface LeafieContext extends LeafieContextBase {
  // Session ID for n8n memory - MUST stay constant throughout conversation
  sessionId: string
}

export interface LeafieReply {
  message: string
  suggestions?: string[]
}

