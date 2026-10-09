import { expect, test } from '@playwright/test'

test('account pages are compact, responsive and retain password authentication', async ({ page }) => {
  let loginRequests = 0
  await page.route('http://localhost:8000/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/login') {
      loginRequests++
      return route.fulfill({ status: 401, json: { detail: 'Thông tin đăng nhập không đúng.' } })
    }
    return route.fulfill({ status: 401, json: { detail: 'Not signed in' } })
  })
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Chào mừng bạn trở lại' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tiếp tục với Google' })).toBeDisabled()
    await expect(page.getByText('Google chưa được kích hoạt.', { exact: false })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: 'Tạo tài khoản', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tiếp tục với Google' })).toBeDisabled()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.goto('/login')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  expect(loginRequests).toBe(0)
  await page.getByLabel('Tên đăng nhập hoặc email').fill('test@example.com')
  await page.getByLabel('Mật khẩu', { exact: true }).fill('invalid-password')
  await page.getByRole('button', { name: 'Hiện mật khẩu' }).click()
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Thông tin đăng nhập không đúng.')
  expect(loginRequests).toBe(1)
})
