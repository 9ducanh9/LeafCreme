import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPreorderAttempt, getOrCreatePreorderAttempt, readPreorderAttempt } from './preorderAttempt'

const payload = { items: [{ bienthe_id: 4, so_luong: 1 }], ten_khach_hang: 'Test' }

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  })
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, callback: () => unknown) => callback() } })
  vi.stubGlobal('crypto', { randomUUID: () => 'preorder-idempotency-key' })
})

describe('durable pre-order attempt', () => {
  it('persists and retries the same key and original payload', async () => {
    const first = await getOrCreatePreorderAttempt(12, payload)
    const retry = await getOrCreatePreorderAttempt(12, { items: [{ bienthe_id: 9, so_luong: 2 }] })
    expect(retry).toEqual(first)
    expect(readPreorderAttempt(12)).toEqual(first)
  })

  it('scopes attempts by staff account and clears only the matching key', async () => {
    const first = await getOrCreatePreorderAttempt(12, payload)
    const other = await getOrCreatePreorderAttempt(13, payload)
    clearPreorderAttempt(12, 'wrong-key')
    expect(readPreorderAttempt(12)).toEqual(first)
    clearPreorderAttempt(12, first.key)
    expect(readPreorderAttempt(12)).toBeNull()
    expect(readPreorderAttempt(13)).toEqual(other)
  })

  it('does not issue an attempt if durable storage fails', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('storage full') })
    await expect(getOrCreatePreorderAttempt(12, payload)).rejects.toThrow('storage full')
  })
})
