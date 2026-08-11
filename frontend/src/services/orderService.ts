// Order service for creating orders
import { apiClient } from './api'

export interface OrderItemCreate {
  bienthe_id?: number
  hop_qua_id?: number
  so_luong: number
}

export interface OrderCreate {
  items: OrderItemCreate[]
  phieu_giam_gia_codes?: string[]
  tien_dat_coc?: number
  ten_khach_hang?: string
  so_dien_thoai_khach?: string
  dia_chi_giao_hang?: string
  ngay_giao_du_kien?: string // ISO datetime string
  ghi_chu?: string
}

export interface OrderItemResponse {
  chitiet_id: number
  lohang_sanpham_id?: number
  lohang_hopqua_id?: number
  hop_qua_id?: number
  so_luong: number
  gia_don_vi: number
  tong_tien_phu: number
  ghi_chu?: string
  trang_thai: string
  // Resolved server-side — product/variant name or gift box name. See
  // app/services/orders/order_service.py OrderService._resolve_item_names.
  product_name: string
}

export interface OrderResponse {
  donhang_id: number
  ma_don_hang: string
  nguoidung_id?: number
  loai_don: string
  tong_tien: number
  tien_giam_gia: number
  tien_thanh_toan: number
  tien_dat_coc: number
  trang_thai: string
  ngay_nhan?: string
  ngay_giao_du_kien?: string
  ghi_chu?: string
  ten_khach_hang?: string
  so_dien_thoai_khach?: string
  dia_chi_giao_hang?: string
  nhan_vien_tao?: number
  ngay_tao: string
  ngay_cap_nhat: string
  items: OrderItemResponse[]
  vouchers: unknown[]
}

export async function createOrder(
  orderData: OrderCreate,
  loaiDon: 'pos' | 'online' | 'dattruoc' = 'online'
): Promise<OrderResponse> {
  try {
    return await apiClient.post<OrderResponse>(`/orders?loai_don=${loaiDon}`, orderData)
  } catch (error) {
    console.error('Error creating order:', error)
    throw error
  }
}

export async function getOrder(orderId: number): Promise<OrderResponse> {
  try {
    return await apiClient.get<OrderResponse>(`/orders/${orderId}`)
  } catch (error) {
    console.error('Error fetching order:', error)
    throw error
  }
}

export interface OrderListItem {
  donhang_id: number
  ma_don_hang: string
  loai_don: string
  tong_tien: number
  tien_giam_gia: number
  tien_thanh_toan: number
  trang_thai: string
  ten_khach_hang?: string
  so_dien_thoai_khach?: string
  dia_chi_giao_hang?: string
  ngay_giao_du_kien?: string
  ghi_chu?: string
  ngay_tao: string
}

export async function listOrders(): Promise<OrderListItem[]> {
  try {
    return await apiClient.get<OrderListItem[]>('/orders')
  } catch (error) {
    console.error('Error listing orders:', error)
    throw error
  }
}

