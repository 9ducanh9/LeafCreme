// Cart types and interfaces
export interface CartItem {
  productId: number
  productName: string
  productImage?: string
  variantId?: number
  variantLabel?: string
  price: number
  quantity: number
  sku?: string
  category?: string
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
}


