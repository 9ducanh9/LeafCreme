import { expect, test, type Page } from '@playwright/test'

const order = {
  donhang_id: 42, ma_don_hang: 'ONL-BROWSER-TEST', nguoidung_id: 7, loai_don: 'online',
  tong_tien: 200000, tien_giam_gia: 0, tien_thanh_toan: 200000, tien_dat_coc: 0,
  trang_thai: 'dang_xu_ly', ten_khach_hang: 'Checkout Test', so_dien_thoai_khach: '0901234567',
  dia_chi_giao_hang: 'Test address', ngay_tao: '2026-09-30T00:00:00Z', ngay_cap_nhat: '2026-09-30T00:00:00Z',
  items: [{ chitiet_id: 1, product_name: 'Test cake', so_luong: 2, gia_don_vi: 100000, tong_tien_phu: 200000, trang_thai: 'dang_xu_ly' }], vouchers: [],
}
const payment = { payment_id: 1, method: 'sepay', bank_account: '0123456789', bank_code: 'MB', account_name: 'TEST', amount: 200000, transfer_content: 'LC1', qr_image: 'http://localhost:8000/test-qr.svg' }

async function setup(page: Page, options: { loseFirstResponse?: boolean; terminal?: boolean } = {}) {
  const attempts: { key: string; body: unknown }[] = []
  const committed = new Set<string>()
  let polls = 0
  await page.addInitScript(() => {
    const token = `test.${btoa(JSON.stringify({ sub: '7' }))}.test`
    if (!localStorage.getItem('access_token')) localStorage.setItem('access_token', token)
    if (!localStorage.getItem('leaf_creme_cart_user_7')) localStorage.setItem('leaf_creme_cart_user_7', JSON.stringify({ items: [{ productId: 1, variantId: 1, productName: 'Test cake', price: 100000, quantity: 2 }] }))
  })
  await page.route('http://localhost:8000/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/me') return route.fulfill({ json: { nguoidung_id: 7, ten_dang_nhap: 'checkout-test', ho_ten: 'Checkout Test', so_dien_thoai: '0901234567', dia_chi: 'Test address', dang_hoat_dong: true, capabilities: [], vaitro: { ten_vai_tro: 'customer' } } })
    if (path === '/orders/checkout') {
      const key = route.request().headers()['idempotency-key']
      const body = route.request().postDataJSON()
      attempts.push({ key, body })
      committed.add(key)
      if (options.loseFirstResponse && attempts.length === 1) return route.abort('failed')
      return route.fulfill({ status: 201, json: { order, payment_info: body.payment_method === 'sepay_qr' ? payment : null } })
    }
    if (path === '/payments/1') {
      polls++
      return route.fulfill({ json: { thanhtoan_id: 1, donhang_id: 42, trang_thai: options.terminal ? 'that_bai' : polls >= 2 ? 'thanh_cong' : 'dang_xu_ly', order_status: options.terminal ? 'da_huy' : polls >= 2 ? 'hoan_thanh' : 'dang_xu_ly', reconciliation_status: options.terminal ? 'refund_required' : 'none' } })
    }
    if (path === '/orders/42') return route.fulfill({ json: { ...order, trang_thai: polls >= 2 ? 'hoan_thanh' : 'dang_xu_ly' } })
    if (path === '/test-qr.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>' })
    return route.fulfill({ status: 404, json: { detail: 'Not mocked' } })
  })
  return { attempts, committed, polls: () => polls }
}

async function fillCheckout(page: Page, sepay: boolean) {
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Hoàn tất đơn hàng' })).toBeVisible()
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  await page.locator('#ngay_giao_du_kien').fill(`${tomorrow}T12:00`)
  if (sepay) await page.getByRole('radio', { name: /Chuyển khoản QR/ }).check()
}

test('COD checkout creates one order and clears the cart after confirmation', async ({ page }) => {
  const state = await setup(page)
  await fillCheckout(page, false)
  await page.getByRole('button', { name: 'Đặt hàng', exact: true }).click()
  await expect(page).toHaveURL(/\/orders\/42\/success$/)
  await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible()
  expect(state.committed.size).toBe(1)
  expect(state.attempts[0].key).toBeTruthy()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('leaf_creme_cart_user_7')!).items)).toEqual([])
})

test('lost checkout response survives reload and retries the same request', async ({ page }) => {
  const state = await setup(page, { loseFirstResponse: true })
  await fillCheckout(page, true)
  await page.getByRole('button', { name: 'Đặt hàng', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Tiếp tục checkout' })).toBeEnabled()
  await page.reload()
  await page.getByRole('button', { name: 'Tiếp tục checkout' }).click()
  await expect(page).toHaveURL(/\/orders\/42\/success\?payment_status=success/)
  expect(state.attempts).toHaveLength(2)
  expect(state.attempts[0]).toEqual(state.attempts[1])
  expect(state.committed.size).toBe(1)
  expect(await page.evaluate(() => localStorage.getItem('leaf_creme_checkout_v1_7'))).toBeNull()
})

test('late payment shows reconciliation and removes the expired QR', async ({ page }) => {
  const state = await setup(page, { terminal: true })
  await fillCheckout(page, true)
  await page.getByRole('button', { name: 'Đặt hàng', exact: true }).click()
  await expect(page.getByText('Khoản chuyển tiền đang được đối soát để hoàn tiền.', { exact: false })).toBeVisible()
  await expect(page.getByAltText('Mã VietQR thanh toán đơn hàng')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Kiểm tra lại' })).toBeDisabled()
  const polls = state.polls()
  await page.waitForTimeout(3500)
  expect(state.polls()).toBe(polls)
})
