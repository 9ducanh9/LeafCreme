import { apiClient } from './api'

export interface MomoQRPaymentInfo {
  payment_id: number
  method: string
  phone_number: string
  account_name: string
  amount: number
  transfer_content: string
  qr_code?: string
  qr_image?: string
  instructions: string[]
}

export async function createMomoQRPayment(orderId: number): Promise<MomoQRPaymentInfo> {
  return await apiClient.post<MomoQRPaymentInfo>('/payments/momo-qr/create', {
    donhang_id: orderId,
  })
}
