import type { CheckoutCreate } from './orderService'

export interface CheckoutAttempt {
  version: 1
  key: string
  payload: CheckoutCreate
}

const storageKey = (userId: number) => `leaf_creme_checkout_v1_${userId}`

export function isDefinitiveCheckoutRejection(status: number): boolean {
  // A server/proxy failure does not prove that checkout was rolled back.
  return status === 400 || status === 422
}

export function readCheckoutAttempt(userId: number): CheckoutAttempt | null {
  const stored = localStorage.getItem(storageKey(userId))
  if (!stored) return null
  try {
    const value = JSON.parse(stored) as CheckoutAttempt
    if (value.version === 1 && typeof value.key === 'string' && value.key && Array.isArray(value.payload?.items) && ['pay_later', 'sepay_qr'].includes(value.payload.payment_method)) return value
  } catch { /* An invalid local record has never been sent by this client. */ }
  throw new Error('Không đọc được lần checkout đang xử lý. Vui lòng liên hệ cửa hàng để kiểm tra đơn.')
}

export async function getOrCreateCheckoutAttempt(userId: number, payload: CheckoutCreate): Promise<CheckoutAttempt> {
  const create = () => {
    const existing = readCheckoutAttempt(userId)
    if (existing) return existing
    const attempt: CheckoutAttempt = { version: 1, key: crypto.randomUUID(), payload }
    // Persist before sending; a storage failure must not create an unresumable order.
    localStorage.setItem(storageKey(userId), JSON.stringify(attempt))
    return attempt
  }
  return navigator.locks ? navigator.locks.request(storageKey(userId), create) : create()
}

export function clearCheckoutAttempt(userId: number, key: string): void {
  if (readCheckoutAttempt(userId)?.key === key) localStorage.removeItem(storageKey(userId))
}
