import { expect, test, type Page } from '@playwright/test'

test('isolated customer logs in, selects a product and completes COD purchase', async ({ page }) => {
  test.skip(process.env.RUN_LIVE_BROWSER !== '1', 'Requires disposable backend harness')
  if (process.env.VITE_API_BASE_URL !== 'http://127.0.0.1:58081' || !process.env.LIVE_BROWSER_PASSWORD) {
    throw new Error('Live login is restricted to the disposable local API')
  }
  await page.goto('/login')
  await page.locator('#username').fill('http-user-0')
  await page.locator('#password').fill('Deliberately-wrong-local-password')
  const rejected = page.waitForResponse(response =>
    response.url() === 'http://127.0.0.1:58081/auth/login' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  expect((await rejected).status()).toBe(401)
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull()
  await page.locator('#password').fill(process.env.LIVE_BROWSER_PASSWORD)
  const accepted = page.waitForResponse(response =>
    response.url() === 'http://127.0.0.1:58081/auth/login' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  expect((await accepted).status()).toBe(200)
  await expect(page).not.toHaveURL(/\/login$/)
  const token = await page.evaluate(() => localStorage.getItem('access_token'))
  expect(token).toBeTruthy()
  const me = await page.request.get('http://127.0.0.1:58081/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(me.status()).toBe(200)
  expect((await me.json()).ten_dang_nhap).toBe('http-user-0')
  await page.goto('/products/6')
  await expect(page.getByRole('heading', { name: 'Synthetic Cake 5', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: '15cm', exact: true }).check()
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click()
  await page.goto('/cart')
  await expect(page.getByText('Synthetic Cake 5', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tiến hành thanh toán', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hoàn tất đơn hàng' })).toBeVisible()
  await page.locator('#so_dien_thoai_khach').fill('0901234567')
  await page.locator('#dia_chi_giao_hang').fill('Disposable journey address')
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  await page.locator('#ngay_giao_du_kien').fill(`${tomorrow}T12:00`)
  const checkout = page.waitForResponse(response =>
    response.url() === 'http://127.0.0.1:58081/orders/checkout' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Đặt hàng', exact: true }).click()
  const orderResponse = await checkout
  expect(orderResponse.status()).toBe(201)
  const order = await orderResponse.json()
  expect(order.payment_status).toBe('unpaid')
  expect(Number(order.order.tien_thanh_toan)).toBe(100000)
  await expect(page).toHaveURL(new RegExp(`/orders/${order.order.donhang_id}/success\\?payment_status=unpaid$`))
  await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible()
  const userId = (await me.json()).nguoidung_id
  expect(await page.evaluate(userId =>
    JSON.parse(localStorage.getItem(`leaf_creme_cart_user_${userId}`)!).items, userId)).toEqual([])
})

async function prepareCheckout(page: Page, variantId: number) {
  test.skip(process.env.RUN_LIVE_BROWSER !== '1', 'Requires disposable backend harness')
  const token = process.env.LIVE_BROWSER_TOKEN
  if (!token || process.env.VITE_API_BASE_URL !== 'http://127.0.0.1:58081') {
    throw new Error('Live browser test is restricted to the disposable local API')
  }
  const userId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub
  await page.addInitScript(({ token, userId, variantId }) => {
    localStorage.setItem('access_token', token)
    if (!localStorage.getItem(`leaf_creme_cart_user_${userId}`)) {
      localStorage.setItem(`leaf_creme_cart_user_${userId}`, JSON.stringify({ items: [
        { productId: 3, variantId, productName: 'Synthetic Cake 2', price: 100000, quantity: 2 },
      ] }))
    }
  }, { token, userId, variantId })
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Hoàn tất đơn hàng' })).toBeVisible()
  await page.locator('#ten_khach_hang').fill('Synthetic Browser Customer')
  await page.locator('#so_dien_thoai_khach').fill('0901234567')
  await page.locator('#dia_chi_giao_hang').fill('Disposable test address')
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  await page.locator('#ngay_giao_du_kien').fill(`${tomorrow}T12:00`)
  return userId
}

test('isolated live backend commits COD checkout and clears browser cart', async ({ page }) => {
  const userId = await prepareCheckout(page, 7)
  const committed = page.waitForResponse(response =>
    response.url() === 'http://127.0.0.1:58081/orders/checkout' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Đặt hàng', exact: true }).click()
  const response = await committed
  expect(response.status()).toBe(201)
  const body = await response.json()
  expect(body.payment_status).toBe('unpaid')
  expect(Number(body.order.tien_thanh_toan)).toBe(200000)
  await expect(page).toHaveURL(new RegExp(`/orders/${body.order.donhang_id}/success\\?payment_status=unpaid$`))
  await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible()
  expect(await page.evaluate(userId =>
    JSON.parse(localStorage.getItem(`leaf_creme_cart_user_${userId}`)!).items, userId)).toEqual([])
})

test('lost live checkout response reloads and replays the same committed order', async ({ page }) => {
  const userId = await prepareCheckout(page, 8)
  const attempts: { key: string; body: unknown }[] = []
  let committedOrderId: number | undefined
  await page.route('http://127.0.0.1:58081/orders/checkout', async route => {
    attempts.push({ key: route.request().headers()['idempotency-key'], body: route.request().postDataJSON() })
    if (attempts.length === 1) {
      const response = await route.fetch()
      expect(response.status()).toBe(201)
      committedOrderId = (await response.json()).order.donhang_id
      await route.abort('failed')
    } else {
      await route.continue()
    }
  })
  await page.getByRole('button', { name: 'Đặt hàng', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Tiếp tục checkout' })).toBeEnabled()
  await page.reload()
  const replay = page.waitForResponse(response =>
    response.url() === 'http://127.0.0.1:58081/orders/checkout' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Tiếp tục checkout' }).click()
  const response = await replay
  expect(response.status()).toBe(201)
  expect((await response.json()).order.donhang_id).toBe(committedOrderId)
  expect(attempts).toHaveLength(2)
  expect(attempts[0].key).toBeTruthy()
  expect(attempts[1]).toEqual(attempts[0])
  await expect(page).toHaveURL(new RegExp(`/orders/${committedOrderId}/success\\?payment_status=unpaid$`))
  expect(await page.evaluate(userId => localStorage.getItem(`leaf_creme_checkout_v1_${userId}`), userId)).toBeNull()
})

test('live QR checkout remains pending until authenticated synthetic callback', async ({ page }) => {
  await page.route('**/*', route => {
    const host = new URL(route.request().url()).hostname
    return host === '127.0.0.1' || host === 'localhost' ? route.continue() : route.abort()
  })
  const userId = await prepareCheckout(page, 9)
  await page.getByRole('radio', { name: /Chuyển khoản QR/ }).check()
  const checkout = page.waitForResponse(response =>
    response.url() === 'http://127.0.0.1:58081/orders/checkout' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Đặt hàng', exact: true }).click()
  const response = await checkout
  expect(response.status()).toBe(201)
  const body = await response.json()
  expect(body.payment_status).toBe('pending')
  await expect(page).toHaveURL(new RegExp(`/orders/${body.order.donhang_id}/payment-qr$`))
  const payment = body.payment_info
  const token = process.env.LIVE_BROWSER_TOKEN!
  const pending = await page.request.get(`http://127.0.0.1:58081/payments/${payment.payment_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(pending.status()).toBe(200)
  expect((await pending.json()).trang_thai).toBe('dang_xu_ly')
  const callback = {
    id: 543210, gateway: 'MBBank', transactionDate: '2026-10-06 12:00:00',
    accountNumber: '0123456789', transferType: 'in', transferAmount: Number(payment.amount),
    code: payment.transfer_content,
  }
  const rejected = await page.request.post('http://127.0.0.1:58081/payments/sepay/webhook', {
    headers: { Authorization: 'Apikey wrong' }, data: callback,
  })
  expect(rejected.status()).toBe(401)
  for (let attempt = 0; attempt < 2; attempt++) {
    const accepted = await page.request.post('http://127.0.0.1:58081/payments/sepay/webhook', {
      headers: { Authorization: 'Apikey isolated-webhook-test-key' }, data: callback,
    })
    expect(accepted.status()).toBe(200)
  }
  await expect(page).toHaveURL(new RegExp(`/orders/${body.order.donhang_id}/success\\?payment_status=success`))
  expect(await page.evaluate(userId =>
    JSON.parse(localStorage.getItem(`leaf_creme_cart_user_${userId}`)!).items, userId)).toEqual([])
})
