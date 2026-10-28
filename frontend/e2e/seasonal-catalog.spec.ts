import { expect, test } from '@playwright/test'

const products = [
  { sanpham_id: 904, sku: 'HAL04', ten: 'Việt quất mới từ kho dữ liệu', gia_co_ban: 245000, danh_muc: 'Mousse', hinh_anh_url: '/seasonal/halloween-berry-mousse.jpg', mo_ta: 'Mô tả từ database.', dang_hoat_dong: true },
  { sanpham_id: 903, sku: 'HAL03', ten: 'Oreo đã tạm ẩn', gia_co_ban: 280000, danh_muc: 'Bánh kem', dang_hoat_dong: false },
  { sanpham_id: 901, sku: 'HAL01', ten: 'Nhung tím mới từ kho dữ liệu', gia_co_ban: 325000, danh_muc: 'Bánh kem', hinh_anh_url: '/seasonal/halloween-velvet-cake.jpg', mo_ta: 'Nội dung sản phẩm thật.', dang_hoat_dong: true },
]

test('Halloween cards use database ids and prices and exclude hidden products', async ({ page }) => {
  await page.route(/^http:\/\/(localhost|127\.0\.0\.1):8000\//, route => route.fulfill({ json: new URL(route.request().url()).pathname === '/products' ? products : [] }))
  await page.goto('/')
  const section = page.locator('#halloween-specials')
  const cards = section.locator('.halloween-product-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0).getByRole('heading')).toHaveText(products[2].ten)
  await expect(cards.nth(0).getByRole('link', { name: products[2].ten, exact: true })).toHaveAttribute('href', '/products/901')
  await expect(cards.nth(0)).toContainText('325.000')
  await expect(cards.nth(1).getByRole('link', { name: products[0].ten, exact: true })).toHaveAttribute('href', '/products/904')
  await expect(section.getByText('Oreo đã tạm ẩn', { exact: true })).toHaveCount(0)
})

test('a failed seasonal catalog request can be retried without showing invented cards', async ({ page }) => {
  let failed = true
  await page.route(/^http:\/\/(localhost|127\.0\.0\.1):8000\//, route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/products' && url.searchParams.get('limit') === '200') {
      return failed ? route.fulfill({ status: 503, json: { detail: 'Catalog unavailable' } }) : route.fulfill({ json: products })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto('/')
  const section = page.locator('#halloween-specials')
  await expect(section.getByRole('alert')).toBeVisible()
  await expect(section.locator('.halloween-product-card')).toHaveCount(0)
  failed = false
  await section.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(section.locator('.halloween-product-card')).toHaveCount(2)
  await expect(section.getByRole('alert')).toHaveCount(0)
})
