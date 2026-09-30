import { apiClient } from './api'

export interface SePayPaymentInfo {
  payment_id: number
  method: 'sepay'
  bank_account: string
  bank_code: string
  account_name: string
  amount: number
  transfer_content: string
  qr_image: string
}

export interface PaymentStatus {
  thanhtoan_id: number
  donhang_id: number
  phuong_thuc: 'tien_mat' | 'chuyen_khoan' | 'the_tin_dung' | 'vi_dien_tu'
  so_tien: number
  ma_giao_dich?: string | null
  trang_thai: 'dang_xu_ly' | 'thanh_cong' | 'that_bai' | 'da_hoan_tien'
  reconciliation_status: 'none' | 'refund_required' | 'refunded'
  order_status: string
}

export async function createSePayPayment(orderId: number): Promise<SePayPaymentInfo> {
  return await apiClient.post<SePayPaymentInfo>('/payments/sepay/create', {
    donhang_id: orderId,
  })
}

export async function getPaymentStatus(paymentId: number): Promise<PaymentStatus> {
  return await apiClient.get<PaymentStatus>(`/payments/${paymentId}`)
}

export async function getOrderPayments(orderId: number): Promise<PaymentStatus[]> {
  return await apiClient.get<PaymentStatus[]>(`/payments/orders/${orderId}`)
}

export async function recordCashPayment(orderId: number, amount: number): Promise<PaymentStatus> {
  return await apiClient.post<PaymentStatus>('/payments', {
    donhang_id: orderId,
    phuong_thuc: 'tien_mat',
    so_tien: amount,
  })
}
