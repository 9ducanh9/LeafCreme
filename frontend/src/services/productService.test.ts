import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from './api'
import { getBestSellers } from './productService'

vi.mock('./api', () => ({
  apiClient: { get: vi.fn() },
}))

describe('getBestSellers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps ranked backend analytics rows into storefront products', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      {
        product_id: 12,
        name: 'Mousse dâu tươi',
        category: 'Mousse',
        base_price: 190000,
        image_url: 'product/thumbnails/mousse.jpg',
        sold_count: 9,
      },
    ])

    const result = await getBestSellers(4)

    expect(apiClient.get).toHaveBeenCalledWith('/analytics/best-sellers', { limit: 4 })
    expect(result).toEqual([
      expect.objectContaining({
        sanpham_id: 12,
        ten: 'Mousse dâu tươi',
        danh_muc: 'Mousse',
        gia_co_ban: 190000,
        hinh_anh_url: 'product/thumbnails/mousse.jpg',
      }),
    ])
  })
})
