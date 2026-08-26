import { describe, expect, it } from 'vitest'
import { cleanOperationalText, formatProactiveEvidence, presentAction } from './operationsPresentation'

describe('operations presentation', () => {
  it('removes verification identifiers and translates common fixture labels', () => {
    expect(cleanOperationalText('Low stock: LC_VERIFY_20260807_071338_518555 Gift Box'))
      .toBe('Sắp hết hàng: Hộp quà')
  })

  it('formats evidence as staff-facing Vietnamese instead of raw keys', () => {
    const insight = {
      evidence: { units_on_hand: 3, batch_code: 'LOT-01', expires_at: '2026-08-28T00:00:00' },
    }

    expect(formatProactiveEvidence(insight)).toEqual([
      'Còn 3 sản phẩm trong kho',
      'Mã lô LOT-01',
      'Hạn dùng 28/8/2026',
    ])
  })

  it('never exposes raw action names or JSON parameters in approval copy', () => {
    const action = {
      loai_hanh_dong: 'resolve_alert',
      tham_so: { alert_id: 8 },
      ly_do: null,
    }

    const presented = presentAction(action)
    expect(presented.title).toBe('Xác nhận cảnh báo đã được xử lý')
    expect(`${presented.title} ${presented.description}`).not.toContain('resolve_alert')
    expect(`${presented.title} ${presented.description}`).not.toContain('alert_id')
  })
})
