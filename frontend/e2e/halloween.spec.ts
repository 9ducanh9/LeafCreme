import { expect, test, type Page } from '@playwright/test'

const product = {
  sanpham_id: 101, ten: 'Bánh từ API kiểm thử', sku: 'TEST101', loai: 'bien_the',
  gia_co_ban: 246000, mo_ta: 'Mô tả từ API kiểm thử', danh_muc: 'Bánh kem',
  hinh_anh_url: '/seasonal/halloween-hero.png', dang_hoat_dong: true, ngay_tao: '2026-10-08',
}

async function mockApi(page: Page, admin = false) {
  if (admin) await page.addInitScript(() => localStorage.setItem('access_token', `test.${btoa(JSON.stringify({ sub: '7' }))}.test`))
  const chatMessages: string[] = []
  await page.route('http://localhost:8000/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/me') return admin
      ? route.fulfill({ json: { nguoidung_id: 7, ho_ten: 'Test admin', dang_hoat_dong: true, capabilities: ['admin.access', 'orders.read.own_created', 'orders.read.all'], vaitro: { ten_vai_tro: 'admin' } } })
      : route.fulfill({ status: 401, json: { detail: 'Not signed in' } })
    if (path === '/auth/refresh') return route.fulfill({ status: 401, json: { detail: 'No session' } })
    if (path === '/analytics/best-sellers') return route.fulfill({ json: [{ product_id: 101, name: product.ten, category: product.danh_muc, base_price: product.gia_co_ban, image_url: product.hinh_anh_url }] })
    if (path === '/products') return route.fulfill({ json: [product] })
    if (path === '/products/101') return route.fulfill({ json: product })
    if (path === '/products/101/variants') return route.fulfill({ json: [
      { bienthe_id: 11, sanpham_id: 101, huong_vi: 'Chocolate', kich_thuoc: '15 cm', gia_bienthe: 246000, muc_gioi_han_ton: 3, dang_hoat_dong: true, ngay_tao: '' },
      { bienthe_id: 12, sanpham_id: 101, huong_vi: 'Chocolate', kich_thuoc: '20 cm', gia_bienthe: 357000, muc_gioi_han_ton: 3, dang_hoat_dong: true, ngay_tao: '' },
    ] })
    if (path === '/products/101/availability') return route.fulfill({ json: [{ bienthe_id: 11, so_luong_con: 3, dang_ban_duoc: true }, { bienthe_id: 12, so_luong_con: 0, dang_ban_duoc: false }] })
    if (path === '/leafie/ask') {
      chatMessages.push(route.request().postDataJSON().message)
      return route.fulfill({ json: { output: 'Dạ, đây là câu trả lời từ endpoint Leafie kiểm thử.', products: [], suggestions: [] } })
    }
    if (path === '/orders') return route.fulfill({ json: { items: [], total: 0, skip: 0, limit: 50 } })
    return route.fulfill({ status: 404, json: { detail: 'Not mocked' } })
  })
  return chatMessages
}

test('seasonal storefront preserves API prices, variant stock and cart behavior', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Câu chuyện Leaf Creme' })).toBeVisible()
  await expect(page.locator('picture img').first()).toHaveAttribute('src', '/banners/leaf-creme-01.jpg')
  await expect(page.locator('.halloween-hero-image')).toHaveCount(0)
  await expect(page.getByText('246.000 ₫', { exact: true })).toBeVisible()
  await page.goto('/products/101')
  await expect(page.getByRole('heading', { name: product.ten, exact: true })).toBeVisible()
  await expect(page.locator('#main-content')).toHaveClass(/halloween-product/)
  await page.getByRole('radio', { name: /20 cm/ }).check()
  await expect(page.getByText('357.000 ₫', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true })).toBeDisabled()
  await page.getByRole('radio', { name: /15 cm/ }).check()
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click()
  await page.getByRole('button', { name: /Giỏ hàng, 1 sản phẩm/ }).click()
  const cart = page.getByRole('dialog', { name: 'Giỏ hàng', exact: true })
  await expect(cart.getByText(product.ten, { exact: true })).toBeVisible()
  await expect(cart.getByText('15 cm', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mở Leafie', exact: true })).toBeHidden()
})

test('mobile seasonal chat sends to the existing Leafie endpoint without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const messages = await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Câu chuyện Leaf Creme' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Mở Leafie', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Leafie', exact: true })
  await expect(dialog.getByText('Dạ, mình chọn bánh cho Halloween nhé?')).toBeVisible()
  await dialog.getByRole('button', { name: 'Bánh chocolate nào đang còn hàng?', exact: true }).click()
  await expect(dialog.getByText('Dạ, đây là câu trả lời từ endpoint Leafie kiểm thử.')).toBeVisible()
  expect(messages).toEqual(['Bánh chocolate nào đang còn hàng?'])
  const bounds = await dialog.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.width).toBeLessThanOrEqual(320)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('admin uses seasonal accents without storefront banner or Leafie launcher', async ({ page }) => {
  await mockApi(page, true)
  await page.goto('/admin/orders')
  await expect(page.getByRole('heading', { name: 'Đơn hàng', level: 1 })).toBeVisible()
  await expect(page.locator('.halloween-storefront')).toHaveCount(0)
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand-bg').trim())).toBe('#285744')
  await expect(page.locator('.MuiAppBar-root')).toHaveCSS('background-color', 'rgb(245, 250, 244)')
  await expect(page.locator('.halloween-hero')).toHaveCount(0)
  await expect(page.locator('.halloween-leafie-launcher')).toHaveCount(0)
})
