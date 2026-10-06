import { expect, it } from 'vitest'
import { batchCalendarDateTime } from './validateBatch'

it('preserves the selected production day instead of shifting midnight to UTC', () => {
  expect(batchCalendarDateTime('2026-10-06')).toBe('2026-10-06T00:00:00')
})

it('preserves the selected manual expiry calendar day', () => {
  expect(batchCalendarDateTime('2026-10-09', true)).toBe('2026-10-09T23:59:59')
})
