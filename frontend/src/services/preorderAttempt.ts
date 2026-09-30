import type { PreorderCheckoutPayload } from './admin/adminOrderService'

export interface PreorderAttempt {
  version: 1
  key: string
  payload: PreorderCheckoutPayload
}

const storageKey = (userId: number) => `leaf_creme_preorder_v1_${userId}`

export function readPreorderAttempt(userId: number): PreorderAttempt | null {
  const stored = localStorage.getItem(storageKey(userId))
  if (!stored) return null
  try {
    const value = JSON.parse(stored) as PreorderAttempt
    if (value.version === 1 && typeof value.key === 'string' && value.key && Array.isArray(value.payload?.items)) return value
  } catch { /* Invalid local data was never sent to the API. */ }
  throw new Error('Không đọc được lần đặt trước đang chờ. Vui lòng kiểm tra đơn hàng trước khi tạo đơn mới.')
}

export async function getOrCreatePreorderAttempt(userId: number, payload: PreorderCheckoutPayload): Promise<PreorderAttempt> {
  const key = storageKey(userId)
  const create = () => {
    const existing = readPreorderAttempt(userId)
    if (existing) return existing
    const attempt: PreorderAttempt = { version: 1, key: crypto.randomUUID(), payload }
    localStorage.setItem(key, JSON.stringify(attempt))
    return attempt
  }
  return navigator.locks ? navigator.locks.request(key, create) : create()
}

export function clearPreorderAttempt(userId: number, key: string): void {
  if (readPreorderAttempt(userId)?.key === key) localStorage.removeItem(storageKey(userId))
}
