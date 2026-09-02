import { expect, Page, test } from '@playwright/test'

const products = [
  {
    sanpham_id: 1,
    ten: 'Bánh kem chocolate',
    sku: 'CRM01-20',
    loai: 'bien_the',
    gia_co_ban: 260000,
    mo_ta: 'Bánh kem chocolate.',
    danh_muc: 'Bánh kem',
    dang_hoat_dong: true,
    ngay_tao: '2026-01-01T00:00:00Z',
  },
]

async function mockPublicApi(page: Page) {
  await page.route('http://localhost:8000/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/uploads/')) {
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"/>',
      })
      return
    }
    if (url.pathname === '/analytics/best-sellers') {
      await route.fulfill({
        json: [{
          product_id: 1,
          name: 'Bánh kem chocolate',
          category: 'Bánh kem',
          base_price: 260000,
          sold_count: 5,
        }],
      })
      return
    }
    if (url.pathname === '/products') {
      await route.fulfill({ json: products })
      return
    }
    await route.fulfill({ status: 404, json: { detail: 'Not mocked' } })
  })
}

test('homepage loads lazy routes and ranked products without application errors', async ({ page }) => {
  const appErrors: string[] = []
  page.on('pageerror', (error) => appErrors.push(error.message))
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('http://localhost:8000')) {
      appErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`)
    }
  })
  page.on('response', (response) => {
    if (response.url().startsWith('http://localhost:8000') && response.status() >= 400) {
      appErrors.push(`${response.status()} ${response.url()}`)
    }
  })
  await mockPublicApi(page)

  await page.goto('/')

  await expect(page).toHaveTitle(/Leaf Creme/)
  await expect(page.getByRole('heading', { name: 'Best sellers' })).toBeVisible()
  await expect(page.getByText('Bánh kem chocolate', { exact: true })).toBeVisible()
  expect(appErrors).toEqual([])
})

test('protected checkout redirects an anonymous user to login', async ({ page }) => {
  await mockPublicApi(page)

  await page.goto('/checkout')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Chào mừng bạn trở lại' })).toBeVisible()
  await expect(page.getByLabel('Tên đăng nhập hoặc email')).toBeVisible()
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toBeVisible()
})

test('authenticated local user can change password from profile', async ({ page }) => {
  let submittedPassword: unknown

  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'browser-smoke-token')
  })
  await page.route('http://localhost:8000/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/auth/me') {
      await route.fulfill({
        json: {
          nguoidung_id: 7,
          ten_dang_nhap: 'browser-smoke',
          email: 'browser-smoke@example.com',
          ho_ten: 'Browser Smoke',
          dang_hoat_dong: true,
          capabilities: [],
        },
      })
      return
    }
    if (url.pathname === '/auth/change-password') {
      submittedPassword = route.request().postDataJSON()
      await route.fulfill({ status: 204 })
      return
    }
    await route.fulfill({ status: 404, json: { detail: 'Not mocked' } })
  })

  await page.goto('/profile')
  await page.getByRole('button', { name: 'Đổi mật khẩu' }).first().click()
  await page.getByLabel('Mật khẩu hiện tại').fill('old-password')
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('new-password')
  await page.getByLabel('Xác nhận mật khẩu mới').fill('new-password')
  await page.getByRole('button', { name: 'Đổi mật khẩu' }).last().click()

  await expect(page.getByText('Đổi mật khẩu thành công!')).toBeVisible()
  expect(submittedPassword).toEqual({
    mat_khau_cu: 'old-password',
    mat_khau_moi: 'new-password',
    xac_nhan_mat_khau_moi: 'new-password',
  })
})
