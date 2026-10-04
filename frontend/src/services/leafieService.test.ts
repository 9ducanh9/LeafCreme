import { afterEach, expect, it, vi } from 'vitest'
import { askLeafie } from './leafieService'

afterEach(() => vi.unstubAllGlobals())

it('sends only bounded conversation fields to the application backend', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: 'Mình giúp bạn chọn bánh nhé.', products: [], suggestions: [] })))
  vi.stubGlobal('fetch', fetcher)
  const history = [{ role: 'user' as const, content: 'Tôi thích chocolate' }]
  expect((await askLeafie('Bánh đó còn không?', history)).message).toContain('chọn bánh')
  expect(fetcher.mock.calls[0][0]).toMatch(/\/leafie\/ask$/)
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ message: 'Bánh đó còn không?', conversationHistory: history })
})

it.each([429, 502, 503, 504])('throws on HTTP %s instead of inventing an assistant reply', async (status) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })))
  await expect(askLeafie('hello', [])).rejects.toThrow()
})

it('rejects an empty model reply', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"output":" "}')))
  await expect(askLeafie('hello', [])).rejects.toThrow()
})
