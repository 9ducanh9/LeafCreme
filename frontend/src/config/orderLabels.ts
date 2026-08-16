// Nhãn tiếng Việt + màu hiển thị cho OrderType/OrderStatus.
// Tách riêng khỏi types/admin.ts để bảng nhãn không lẫn vào định nghĩa kiểu,
// và để mọi component (table, filter, detail, form) dùng chung một nguồn.
import type { OrderStatus, OrderType } from '../types/admin'

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  online: 'Trực tuyến',
  dat_truoc: 'Đặt trước',
  pos: 'Thủ công',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  cho: 'Chờ xử lý',
  cho_coc: 'Chờ đặt cọc',
  dang_xu_ly: 'Đang xử lý',
  dang_giao: 'Đang giao',
  hoan_thanh: 'Hoàn thành',
  da_huy: 'Đã hủy',
}

export type ChipColor = 'default' | 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error'

export const ORDER_STATUS_COLOR: Record<OrderStatus, ChipColor> = {
  cho: 'warning',
  cho_coc: 'warning',
  dang_xu_ly: 'info',
  dang_giao: 'primary',
  hoan_thanh: 'success',
  da_huy: 'error',
}

export const ORDER_TYPE_COLOR: Record<OrderType, ChipColor> = {
  online: 'secondary',
  dat_truoc: 'warning',
  pos: 'default',
}

/** Trạng thái cuối — backend chặn chuyển tiếp khỏi các trạng thái này qua endpoint đổi trạng thái chung. */
export const ORDER_TERMINAL_STATUSES: OrderStatus[] = ['hoan_thanh', 'da_huy']

/**
 * Các trạng thái chọn được qua ô đổi trạng thái thông thường. Cố ý KHÔNG có
 * "da_huy" ở đây — hủy đơn phải đi qua nút "Hủy đơn hàng" riêng (gọi
 * POST /orders/{id}/cancel) vì chỉ đường đó mới hoàn lại tồn kho/voucher đã
 * trừ. Trước đây UI cho đổi thẳng trạng thái sang "Đã hủy" qua ô select
 * chung, nghĩa là hủy đơn qua admin chưa bao giờ thực sự hoàn tồn kho.
 */
export const ORDER_STATUS_OPTIONS: OrderStatus[] = ['cho', 'cho_coc', 'dang_xu_ly', 'dang_giao', 'hoan_thanh']
