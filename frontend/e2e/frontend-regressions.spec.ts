import { expect, test } from '@playwright/test'

test('search normalizes invalid pages and keeps the displayed page consistent', async ({ page }) => {
  await page.route('http://localhost:8000/products**', (route) => route.fulfill({
    json: Array.from({ length: 13 }, (_, index) => ({
      sanpham_id: index + 1,
      ten: `Bánh ${String(index + 1).padStart(2, '0')}`,
      gia_co_ban: 100000,
      danh_muc: 'Bánh kem',
      dang_hoat_dong: true,
      loai: 'bien_the',
    })),
  }))

  for (const invalidPage of ['abc', '1.5', '-1', 'Infinity']) {
    await page.goto(`/search?page=${invalidPage}`)
    await expect(page.getByText('Bánh 01', { exact: true })).toBeVisible()
    await expect(page.getByText('Trang 1 / 2', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Trước', exact: true })).toBeDisabled()
  }

  await page.goto('/search?page=999')
  await expect(page.getByText('Bánh 13', { exact: true })).toBeVisible()
  await expect(page.getByText('Trang 2 / 2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Trước', exact: true }).click()
  await expect(page.getByText('Trang 1 / 2', { exact: true })).toBeVisible()
})

test('staff opening the admin dashboard lands on their permitted orders page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('access_token', 'staff-token'))
  await page.route('http://localhost:8000/**', (route) => {
    const path = new URL(route.request().url()).pathname
    return route.fulfill({ json: path === '/auth/me' ? {
      nguoidung_id: 8,
      ten_dang_nhap: 'staff',
      ho_ten: 'Staff',
      email: 'staff@example.com',
      dang_hoat_dong: true,
      capabilities: ['admin.access', 'orders.read.own_created'],
    } : [] })
  })

  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/orders$/)
  await expect(page.getByRole('heading', { name: 'Đơn hàng', exact: true, level: 1 })).toBeVisible()
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/admin\/orders$/)
})
