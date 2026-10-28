import { expect, test } from '@playwright/test'

for (const width of [360, 390, 430]) {
  test(`mobile storefront at ${width}px keeps navigation and content usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() => sessionStorage.setItem('leaf_creme_cart_guest', JSON.stringify({ items: [{ productId: 101, productName: 'Bánh kiểm thử', price: 200000, quantity: 2 }] })))
    await page.route(/^http:\/\/(localhost|127\.0\.0\.1):8000\//, async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/analytics/best-sellers') return route.fulfill({ json: [
        { product_id: 101, name: 'Bánh kiểm thử', category: 'Bánh kem', base_price: 200000, image_url: '/seasonal/halloween-velvet-cake.jpg' },
        { product_id: 102, name: 'Mousse kiểm thử', category: 'Mousse', base_price: 220000, image_url: '/seasonal/halloween-amber-mousse.jpg' },
      ] })
      if (path === '/products') return route.fulfill({ json: [] })
      return route.fulfill({ status: 401, json: { detail: 'Local test' } })
    })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Điều hướng điện thoại' })
    await expect(nav).toBeVisible()
    await expect(nav.locator('a, button')).toHaveCount(6)
    await expect(page.locator('header')).toBeHidden()
    await expect(page.locator('.halloween-leafie-launcher')).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const media = await page.locator('.halloween-hero-media').boundingBox()
    const copy = await page.locator('.halloween-hero-content').boundingBox()
    expect(media).not.toBeNull()
    expect(copy!.y).toBeGreaterThanOrEqual(media!.y + media!.height - 1)
    expect(media!.width / media!.height).toBeCloseTo(16 / 9, 1)
    expect(await page.locator('.halloween-hero-video').evaluate(el => getComputedStyle(el).objectFit)).toBe('contain')
    for (const id of ['halloween-specials', 'best-sellers']) {
      const cards = page.locator(`#${id} .halloween-product-card`)
      await expect(cards.first()).toBeVisible()
      const [first, second] = await cards.evaluateAll(elements => elements.slice(0, 2).map(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, height: r.height } }))
      expect(second.y).toBeGreaterThan(first.y + first.height)
      expect(second.x).toBeCloseTo(first.x, 0)
    }
    await nav.getByRole('button', { name: 'Giỏ hàng, 2 sản phẩm' }).click()
    const cart = page.getByRole('dialog', { name: 'Giỏ hàng', exact: true })
    await expect(cart).toBeVisible()
    await expect(cart.getByText('Bánh kiểm thử', { exact: true })).toBeVisible()
    await cart.getByRole('button', { name: 'Đóng giỏ hàng', exact: true }).click()
    await expect(cart).toBeHidden()
    await nav.getByRole('button', { name: 'Mở Leafie', exact: true }).click()
    const leafie = page.getByRole('dialog', { name: 'Leafie', exact: true })
    await expect(leafie).toBeVisible()
    const bounds = await leafie.boundingBox()
    expect(bounds!.width).toBeLessThanOrEqual(width)
    expect(bounds!.y).toBe(0)
    expect(bounds!.height).toBe(844)
    await page.keyboard.press('Escape')
    await expect(leafie).toBeHidden()
    for (const [name, path] of [['Tìm bánh', '/search'], ['Hộp quà', '/gift-boxes'], ['Liên hệ', '/contact'], ['Trang chủ', '/']]) {
      await nav.getByRole('link', { name, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page')
    }
  })
}

test('desktop retains its header, overlay banner and multiple product columns', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('header')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Điều hướng điện thoại' })).toBeHidden()
  expect(await page.locator('.halloween-hero-media').evaluate(el => getComputedStyle(el).display)).toBe('contents')
  const cards = page.locator('#halloween-specials .halloween-product-card')
  const first = await cards.nth(0).boundingBox()
  const second = await cards.nth(1).boundingBox()
  expect(second!.y).toBeCloseTo(first!.y, 0)
  expect(second!.x).toBeGreaterThan(first!.x)
})
