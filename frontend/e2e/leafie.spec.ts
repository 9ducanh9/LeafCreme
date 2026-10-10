import { expect, test } from '@playwright/test'

for (const mobile of [false, true]) {
  test(`Leafie context, cards, retry and layout (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const requests: { message: string; conversationHistory: { role: string; content: string }[] }[] = []
    await page.route('http://localhost:8000/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/branding/liceria.png') {
        await route.fulfill({ path: 'public/branding/liceria.png', contentType: 'image/png' })
        return
      }
      if (path === '/products/7') {
        await route.fulfill({ json: { hinh_anh_url: '/branding/liceria.png' } })
        return
      }
      if (path === '/leafie/ask') {
        requests.push(route.request().postDataJSON())
        if (requests.length === 2) {
          await route.fulfill({ status: 502, json: { detail: 'Retryable provider failure' } })
          return
        }
        await route.fulfill({ json: {
          output: 'Mình gợi ý bánh chocolate trên thẻ nhé.', suggestions: ['Bánh đó còn không?'],
          products: [{ id: 7, kind: 'product', name: 'Chocolate test', price: 190000, available: true, href: '/products/7', variants: [{ id: 8, size: '20cm', price: 260000, available: true }, { id: 9, size: '18cm', price: 190000, available: false }] }],
        } })
        return
      }
      if (path === '/products' || path === '/analytics/best-sellers') {
        await route.fulfill({ json: [] })
        return
      }
      await route.fulfill({ status: 401, json: { detail: 'Anonymous' } })
    })
    await page.goto('/')
    if (mobile) await page.getByRole('button', { name: 'Mở menu điều hướng' }).click()
    await page.getByRole('button', { name: 'Trò chuyện với Leafie', exact: true }).locator('visible=true').click()
    const dialog = page.getByRole('dialog', { name: 'Leafie', exact: true })
    await expect(dialog.getByText('Hôm nay bạn đang tìm bánh gì?')).toBeVisible()
    await dialog.getByRole('button', { name: 'Gợi ý bánh sinh nhật' }).click()
    await expect(dialog.getByRole('link', { name: 'Chocolate test' })).toBeVisible()
    await expect(dialog.getByText('Còn hàng', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('img', { name: 'Chocolate test' })).toBeVisible()
    await dialog.getByRole('button', { name: '18cm', exact: true }).click()
    await expect(dialog.getByText('Hết hàng', { exact: true })).toBeVisible()
    await expect(dialog.getByText('190.000 đ', { exact: false })).toBeVisible()
    expect(requests[0].conversationHistory).toEqual([])
    expect(Object.keys(requests[0]).sort()).toEqual(['conversationHistory', 'conversation_id', 'message'])
    await dialog.getByRole('button', { name: 'Bánh đó còn không?' }).click()
    await expect(dialog.getByRole('alert')).toBeVisible()
    await dialog.getByRole('button', { name: 'Thử lại' }).click()
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    expect(requests[2]).toEqual(requests[1])
    expect(requests[1].conversationHistory.map((m) => m.role)).toEqual(['user', 'assistant'])
    const box = await dialog.boundingBox()
    expect(box?.width).toBeLessThanOrEqual(mobile ? 390 : 400)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/leafie-${mobile ? 'mobile' : 'desktop'}.png` })
    expect(errors).toEqual([])
  })
}
