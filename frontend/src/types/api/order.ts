/**
 * Shape của response `/orders` từ backend (xem app/routers/orders.py).
 *
 * Vì sao có file này: trước đây `preOrderService` và `salesService` map
 * CÙNG một endpoint bằng `any` ở 2 chỗ khác nhau, không có gì ghi lại
 * contract nên hai bên hiểu khác nhau mà TypeScript không phát hiện được
 * (một bên còn đọc field `chi_tiet` mà backend không bao giờ trả — chỉ có
 * `items`). Giờ chỉ còn một service (`admin/adminOrderService.ts`) dùng
 * file này.
 *
 * Chỉ khai những field thực sự được đọc — không đoán phần còn lại. Field
 * nào backend có thể trả `Decimal` (FastAPI serialize thành string) hoặc
 * `float` (number) thì để `ApiAmount` và đọc qua `toAmount()`.
 */

/** Số tiền: backend trả string (Decimal) hoặc number (float) tuỳ field. */
export type ApiAmount = string | number | null | undefined

/** Parse an toàn cho cả hai dạng. Trả 0 nếu không parse được. */
export function toAmount(value: ApiAmount): number {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Khớp với `OrderItemResponse` trong app/routers/orders.py. */
export interface BackendOrderItem {
  chitiet_id?: number
  so_luong: number
  gia_don_vi?: ApiAmount
  tong_tien_phu?: ApiAmount
  hop_qua_id?: number | null
  lohang_sanpham_id?: number | null
  lohang_hopqua_id?: number | null
  ghi_chu?: string | null
  trang_thai?: string | null
  /** Tên sản phẩm/hộp quà resolve sẵn ở server — xem OrderService._resolve_item_names. */
  product_name?: string | null
}

/**
 * Khớp với `OrderResponse` (chi tiết, có `items`) VÀ `OrderListResponse`
 * (danh sách, KHÔNG có `items`/`tien_dat_coc`) — tất cả field optional để
 * dùng chung cho cả hai; UI không được giả định `items` luôn có mặt.
 */
export interface BackendOrder {
  donhang_id: number
  ma_don_hang?: string | null
  loai_don?: string | null
  trang_thai?: string | null
  ten_khach_hang?: string | null
  so_dien_thoai_khach?: string | null
  dia_chi_giao_hang?: string | null
  ghi_chu?: string | null
  ngay_tao: string
  ngay_giao_du_kien?: string | null
  tien_thanh_toan?: ApiAmount
  tong_tien?: ApiAmount
  tien_giam_gia?: ApiAmount
  /** Chỉ có ở endpoint chi tiết (`GET /orders/{id}`), không có ở danh sách. */
  tien_dat_coc?: ApiAmount
  /** Chỉ có ở endpoint chi tiết (`GET /orders/{id}`), không có ở danh sách. */
  items?: BackendOrderItem[] | null
}
