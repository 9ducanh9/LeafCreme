// Leafie types and interfaces
export interface LeafieMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface LeafieContext {
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

export interface LeafieReply {
  message: string
  suggestions?: string[]
}

