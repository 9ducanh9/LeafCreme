export interface LeafieProduct {
  id: number
  kind: 'product' | 'gift_box'
  name: string
  price: number
  available: boolean | null
  href: string
  variants: Array<{ id: number; size: string | null; price: number; available: boolean }>
}

export interface LeafieMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  products?: LeafieProduct[]
  suggestions?: string[]
}
