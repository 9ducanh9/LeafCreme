import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './api'

vi.mock('../config/runtimeConfig', () => ({ API_BASE_URL: 'http://localhost:8000' }))
vi.mock('../config/cognito', () => ({ cognitoEnabled: false }))

describe('API requests after token refresh', () => {
  let tokens: Map<string, string>
  const fetchMock = vi.fn()

  beforeEach(() => {
    tokens = new Map([['access_token', 'expired'], ['refresh_token', 'refresh']])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => tokens.get(key) ?? null,
      setItem: (key: string, value: string) => tokens.set(key, value),
      removeItem: (key: string) => tokens.delete(key),
    })
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Expired' }, { status: 401 }))
    fetchMock.mockResolvedValueOnce(Response.json({ access_token: 'renewed', refresh_token: 'rotated' }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it.each([403, 500, 503])('preserves refreshed tokens and the actual %s error on replay', async (status) => {
    fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Replay failed' }, { status }))

    await expect(apiClient.get('/products')).rejects.toMatchObject({ status, detail: 'Replay failed' })
    expect(tokens.get('access_token')).toBe('renewed')
    expect(tokens.get('refresh_token')).toBe('rotated')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('preserves refreshed tokens when the replay loses connectivity', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(apiClient.get('/products')).rejects.toMatchObject({ error: 'Network error' })
    expect(tokens.get('access_token')).toBe('renewed')
    expect(tokens.get('refresh_token')).toBe('rotated')
  })

  it('uses the refreshed token on a successful replay', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ id: 1 }]))

    await expect(apiClient.get('/products')).resolves.toEqual([{ id: 1 }])
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer renewed')
  })

  it('clears tokens if the replay also returns 401 without refreshing again', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Unauthorized' }, { status: 401 }))

    await expect(apiClient.get('/products')).rejects.toMatchObject({ status: 401 })
    expect(tokens.size).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('clears tokens when the refresh itself is rejected', async () => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Expired' }, { status: 401 }))
    fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Invalid refresh' }, { status: 401 }))

    await expect(apiClient.get('/products')).rejects.toMatchObject({ status: 401 })
    expect(tokens.size).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
