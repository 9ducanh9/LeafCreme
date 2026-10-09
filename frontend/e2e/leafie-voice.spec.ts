import { expect, test, type Page } from '@playwright/test'

async function prepareChat(page: Page, mode: 'standard' | 'prefixed' | 'unsupported' = 'standard') {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((provider) => {
    class MockRecognition {
      lang = ''
      continuous = false
      interimResults = false
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: ((event: { error: string }) => void) | null = null
      onresult: ((event: { results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null
      constructor() {
        window.addEventListener('voice-test-result', (event) => {
          const text = (event as CustomEvent<string>).detail
          this.onresult?.({ results: [{ isFinal: false, 0: { transcript: text } }] })
        })
        window.addEventListener('voice-test-error', (event) => {
          this.onerror?.({ error: (event as CustomEvent<string>).detail })
        })
      }
      start() {
        document.documentElement.dataset.voiceLanguage = this.lang
        if (!document.documentElement.dataset.voiceDelayStart) this.onstart?.()
      }
      stop() { if (!document.documentElement.dataset.voiceDelayStop) this.onend?.() }
      abort() {
        document.documentElement.dataset.voiceAborted = 'true'
        this.onend?.()
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: provider === 'standard' ? MockRecognition : undefined })
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: provider === 'prefixed' ? MockRecognition : undefined })
  }, mode)
  const requests: { message: string }[] = []
  await page.route('http://localhost:8000/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/leafie/ask') {
      requests.push(route.request().postDataJSON())
      await route.fulfill({ json: { output: 'Leafie đã nhận câu hỏi.', products: [], suggestions: [] } })
    } else await route.fulfill({ json: [] })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Hỏi Leafie', exact: true }).click()
  return { dialog: page.getByRole('dialog', { name: 'Leafie', exact: true }), requests }
}

async function say(page: Page, text: string) {
  await page.evaluate((transcript) => window.dispatchEvent(new CustomEvent('voice-test-result', { detail: transcript })), text)
}

for (const mode of ['standard', 'prefixed'] as const) {
  test(`mobile voice drafts Vietnamese text without auto-sending (${mode})`, async ({ page }) => {
    const { dialog, requests } = await prepareChat(page, mode)
    const input = dialog.getByRole('textbox', { name: 'Câu hỏi cho Leafie' })
    await input.fill('Mình muốn')
    await dialog.getByRole('button', { name: 'Nhập bằng giọng nói', exact: true }).click()
    await expect(dialog.getByRole('status')).toContainText('Đang nghe tiếng Việt')
    expect(await page.evaluate(() => document.documentElement.dataset.voiceLanguage)).toBe('vi-VN')
    await say(page, 'bánh')
    await say(page, 'bánh chocolate cho hai người')
    await expect(input).toHaveValue('Mình muốn bánh chocolate cho hai người')
    await expect(dialog.getByRole('button', { name: 'Gửi câu hỏi' })).toBeDisabled()
    if (mode === 'standard') await page.screenshot({ path: 'test-results/leafie-voice-mobile.png' })
    expect(requests).toHaveLength(0)
    await dialog.getByRole('button', { name: 'Dừng nhập bằng giọng nói' }).click()
    await input.fill('Mình muốn bánh chocolate cho ba người')
    await dialog.getByRole('button', { name: 'Gửi câu hỏi' }).click()
    await expect(dialog.getByText('Leafie đã nhận câu hỏi.', { exact: true })).toBeVisible()
    expect(requests).toEqual([{ message: 'Mình muốn bánh chocolate cho ba người', conversationHistory: [], conversation_id: expect.any(String) }])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('microphone permission errors preserve the typed draft and allow retry', async ({ page }) => {
  const { dialog } = await prepareChat(page)
  const input = dialog.getByRole('textbox', { name: 'Câu hỏi cho Leafie' })
  await input.fill('Bánh dâu')
  await dialog.getByRole('button', { name: 'Nhập bằng giọng nói', exact: true }).click()
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('voice-test-error', { detail: 'not-allowed' })))
  await expect(dialog.getByRole('alert')).toContainText('Chưa được phép dùng micro')
  await expect(input).toHaveValue('Bánh dâu')
  await expect(input).toBeEditable()
  await dialog.getByRole('button', { name: 'Nhập bằng giọng nói', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  await say(page, 'cho sinh nhật')
  await expect(input).toHaveValue('Bánh dâu cho sinh nhật')
})

test('closing chat cancels the microphone and ignores late speech results', async ({ page }) => {
  const { dialog } = await prepareChat(page)
  await dialog.getByRole('button', { name: 'Nhập bằng giọng nói', exact: true }).click()
  await say(page, 'Bánh dâu')
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-voice-aborted', 'true')
  await say(page, 'Không được thêm câu này')
  await page.getByRole('button', { name: 'Hỏi Leafie', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Câu hỏi cho Leafie' })).toHaveValue('Bánh dâu')
  await expect(dialog.getByRole('button', { name: 'Nhập bằng giọng nói', exact: true })).toBeVisible()
})

test('unsupported browsers keep keyboard chat usable', async ({ page }) => {
  const { dialog } = await prepareChat(page, 'unsupported')
  await expect(dialog.getByRole('button', { name: 'Nhập bằng giọng nói', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('status')).toContainText('micro trên bàn phím điện thoại')
  await dialog.getByRole('textbox', { name: 'Câu hỏi cho Leafie' }).fill('Bánh dâu')
  await dialog.getByRole('button', { name: 'Gửi câu hỏi' }).click()
  await expect(dialog.getByText('Leafie đã nhận câu hỏi.', { exact: true })).toBeVisible()
})

test('a missing browser start event times out and releases the microphone', async ({ page }) => {
  const { dialog } = await prepareChat(page)
  await page.clock.install()
  await page.evaluate(() => { document.documentElement.dataset.voiceDelayStart = 'true' })
  await dialog.getByRole('button', { name: 'Nhập bằng giọng nói', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('Đang mở micro')
  await page.clock.runFor(15100)
  await expect(dialog.getByRole('alert')).toContainText('Micro chưa khởi động được')
  await expect(dialog.getByRole('textbox', { name: 'Câu hỏi cho Leafie' })).toBeEditable()
  await expect(page.locator('html')).toHaveAttribute('data-voice-aborted', 'true')
})

test('a missing browser end event does not leave sending disabled', async ({ page }) => {
  const { dialog } = await prepareChat(page)
  await page.clock.install()
  await page.evaluate(() => { document.documentElement.dataset.voiceDelayStop = 'true' })
  await dialog.getByRole('button', { name: 'Nhập bằng giọng nói', exact: true }).click()
  await say(page, 'Bánh chocolate')
  await dialog.getByRole('button', { name: 'Dừng nhập bằng giọng nói' }).click()
  await expect(dialog.getByRole('status')).toContainText('Đang hoàn tất')
  await page.clock.runFor(3100)
  await expect(dialog.getByRole('button', { name: 'Gửi câu hỏi' })).toBeEnabled()
  await expect(page.locator('html')).toHaveAttribute('data-voice-aborted', 'true')
})

test('backgrounding the app cancels speech capture', async ({ page }) => {
  const { dialog } = await prepareChat(page)
  await dialog.getByRole('button', { name: 'Nhập bằng giọng nói', exact: true }).click()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('html')).toHaveAttribute('data-voice-aborted', 'true')
  await expect(dialog.getByRole('textbox', { name: 'Câu hỏi cho Leafie' })).toBeEditable()
})
