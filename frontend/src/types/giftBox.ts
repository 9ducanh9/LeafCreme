// Gift Box types and interfaces
export type GiftBoxOccasion = 'birthday' | 'thanks' | 'love' | 'holiday' | 'self_care'
export type GiftBoxTag = 'limited' | 'best_gift' | 'new'
export type GiftBoxStatus = 'active' | 'hidden' | 'sold_out'

export interface GiftBoxItem {
  name: string
  quantity: number
}

export interface GiftBox {
  id: string
  name: string
  subtitle: string
  description: string
  story: string
  price: number
  tags: GiftBoxTag[]
  occasions: GiftBoxOccasion[]
  includedItems: GiftBoxItem[]
  status: GiftBoxStatus
  imageKey?: string
  imageUrl?: string
}

export interface GiftBoxFilters {
  occasion?: GiftBoxOccasion
  tag?: GiftBoxTag
  minPrice?: number
  maxPrice?: number
  search?: string
}

