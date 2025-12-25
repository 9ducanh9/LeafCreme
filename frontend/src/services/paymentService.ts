import { apiClient } from './api'

export interface VnpayCreatePaymentResponse {
  payment_id: number
  payment_url: string
}

export async function createVnpayPayment(orderId: number): Promise<VnpayCreatePaymentResponse> {
  return await apiClient.post<VnpayCreatePaymentResponse>('/payments/vnpay/create', {
    donhang_id: orderId,
  })
}
