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
  trang_thai: 'dang_xu_ly' | 'thanh_cong' | 'that_bai' | 'da_hoan_tien'
}

export async function createSePayPayment(orderId: number): Promise<SePayPaymentInfo> {
  return await apiClient.post<SePayPaymentInfo>('/payments/sepay/create', {
    donhang_id: orderId,
  })
}

export async function getPaymentStatus(paymentId: number): Promise<PaymentStatus> {
  return await apiClient.get<PaymentStatus>(`/payments/${paymentId}`)
}
