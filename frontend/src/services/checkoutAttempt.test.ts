import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCheckoutAttempt, getOrCreateCheckoutAttempt, readCheckoutAttempt, isDefinitiveCheckoutRejection } from './checkoutAttempt'

const payload = { items: [{ bienthe_id: 1, so_luong: 2 }], payment_method: 'sepay_qr' as const }

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) })
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, callback: () => unknown) => callback() } })
})

describe('durable checkout attempt', () => {
  it.each([0, 500, 502, 503, 504, 401, 409])('retains the attempt for uncertain response %s', (status) => {
    expect(isDefinitiveCheckoutRejection(status)).toBe(false)
  })
  it.each([400, 422])('allows correction after definitive rejection %s', (status) => {
    expect(isDefinitiveCheckoutRejection(status)).toBe(true)
  })
  it('retries the same key and exact payload even after form edits', async () => {
    const first = await getOrCreateCheckoutAttempt(7, payload)
    const retry = await getOrCreateCheckoutAttempt(7, { ...payload, items: [{ bienthe_id: 2, so_luong: 1 }] })
    expect(retry).toEqual(first)
    expect(readCheckoutAttempt(7)).toEqual(first)
  })
  it('scopes attempts to the account and only clears the matching attempt', async () => {
    const first = await getOrCreateCheckoutAttempt(7, payload)
    const other = await getOrCreateCheckoutAttempt(8, payload)
    clearCheckoutAttempt(7, 'wrong-key')
    expect(readCheckoutAttempt(7)).toEqual(first)
    clearCheckoutAttempt(7, first.key)
    expect(readCheckoutAttempt(7)).toBeNull()
    expect(readCheckoutAttempt(8)).toEqual(other)
  })
  it('fails before sending if durable storage is unavailable', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('storage full') })
    await expect(getOrCreateCheckoutAttempt(7, payload)).rejects.toThrow('storage full')
  })
})
