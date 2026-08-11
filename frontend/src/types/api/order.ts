/**
 * Shape của response `/orders` từ backend.
 *
 * Vì sao có file này: `preOrderService` và `salesService` map CÙNG một endpoint
 * nhưng trước đây cả hai đều dùng `any`, nên không có chỗ nào ghi lại contract
 * và hai bên có thể hiểu khác nhau mà TypeScript không phát hiện.
 *
 * Chỉ khai những field thực sự được đọc — không đoán phần còn lại. Field nào
 * backend có thể trả `Decimal` (FastAPI serialize thành string) hoặc `float`
 * (number) thì để `string | number` và đọc qua `toAmount()`.
 */

/** Số tiền: backend trả string (Decimal) hoặc number (float) tuỳ field. */
export type ApiAmount = string | number | null | undefined

/** Parse an toàn cho cả hai dạng. Trả 0 nếu không parse được. */
export function toAmount(value: ApiAmount): number {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export interface BackendOrderItem {
  ten_san_pham?: string | null
  so_luong: number
  gia_ban?: ApiAmount
  gia_don_vi?: ApiAmount
  hop_qua_id?: number | null
  lohang_sanpham_id?: number | null
  bienthe?: {
    kich_co?: string | null
    san_pham?: { ten_san_pham?: string | null } | null
  } | null
}

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
  /** Có ở endpoint chi tiết (`/orders/{id}`) */
  chi_tiet?: BackendOrderItem[] | null
  /** Tên gọi khác của cùng danh sách ở một số response */
  items?: BackendOrderItem[] | null
}
