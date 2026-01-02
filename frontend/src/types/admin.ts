// Admin panel types and interfaces

// Product & Variant types
export interface ProductVariant {
  id: string
  productId: string
  name: string
  description: string
  category: string // Changed to string to allow any category name
  price: number
  size: 'S' | 'M' | 'L' | 'XL'
  status: 'active' | 'hidden'
  image: string
  sku?: string
}

export interface Product {
  id: string
  name: string
  description: string
  category: 'Mousse' | 'Tiramisu' | 'Bông lan' | 'Bánh kem'
  basePrice: number
  status: 'active' | 'hidden'
  image: string
  sku?: string
  variants: ProductVariant[]
}

// Voucher types
export interface Voucher {
  id: string
  code: string
  type: 'percent' | 'fixed_amount'
  discountValue: number
  appliesTo: 'all' | 'category' | 'product'
  targetId?: string
  minOrderValue?: number
  usageLimit?: number
  expiresAt: string
  status: 'active' | 'inactive'
}

// Pre-order types
export interface PreOrderItem {
  productName: string
  size: string
  quantity: number
  price: number
}

export interface PreOrder {
  id: string
  customerName: string
  phone: string
  pickupDate: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'done' | 'completed' | 'canceled' | 'cancelled'
  notes?: string
  items: PreOrderItem[]
  totalAmount: number
  createdAt: string
  orderCode?: string
  orderType?: string
  address?: string
}

// Sales/Order types
export interface OrderItem {
  productName: string
  size: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  orderType: 'online' | 'pos' | 'preorder'
  customerName: string
  date: string
  items: OrderItem[]
  totalAmount: number
  paymentMethod: string
  status: 'pending' | 'processing' | 'delivering' | 'completed' | 'canceled'
}

// Dashboard/Report types
export interface RevenueData {
  date: string
  revenue: number
}

export interface ProductRevenue {
  productName: string
  revenue: number
  quantity: number
}

export interface BestSeller {
  productName: string
  quantity: number
  revenue: number
}

export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  bestSeller: string
}

