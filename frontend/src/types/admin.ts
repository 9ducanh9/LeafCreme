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

// Order types — unified "Đơn hàng" (trực tuyến / đặt trước / thủ công).
//
// Trước đây có 2 model tách rời (Order cho "Bán tại quầy" + PreOrder cho
// "Đơn đặt trước") map cùng một endpoint /orders bằng 2 bộ enum tự chế
// khác nhau (và khác cả bảng enum thật trong Postgres), nên lọc theo loại
// đơn hoặc theo một số trạng thái luôn âm thầm trả rỗng. Model dưới đây
// dùng thẳng string enum thật của backend (xem app/models.py) làm khoá —
// không còn lớp map hai chiều nào có thể lệch khỏi DB nữa. Nhãn tiếng Việt
// hiển thị nằm ở frontend/src/config/orderLabels.ts.
export type OrderType = 'pos' | 'online' | 'dat_truoc'
export type OrderStatus = 'cho' | 'cho_coc' | 'dang_xu_ly' | 'dang_giao' | 'hoan_thanh' | 'da_huy'

export interface OrderItem {
  productName: string
  size: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  orderCode: string
  orderType: OrderType
  status: OrderStatus
  customerName: string
  phone: string
  address?: string
  /** ngay_tao */
  date: string
  /** ngay_giao_du_kien — ngày giao (giao hàng) hoặc ngày hẹn lấy (tại quầy). */
  expectedDate?: string
  /** Chỉ có ở chi tiết đơn (GET /orders/{id}), rỗng ở danh sách. */
  items: OrderItem[]
  /** tien_thanh_toan — số tiền phải trả sau khi trừ giảm giá. */
  totalAmount: number
  /** tong_tien — tổng tiền hàng trước giảm giá. */
  subtotal: number
  /** tien_giam_gia */
  discount: number
  /** tien_dat_coc — chỉ có ý nghĩa với đơn đặt trước. Chỉ có ở chi tiết đơn. */
  deposit: number
  notes?: string
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

