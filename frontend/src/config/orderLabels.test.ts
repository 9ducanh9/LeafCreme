import { describe, expect, it } from 'vitest'
import { getOrderStatusOptions } from './orderLabels'

describe('getOrderStatusOptions', () => {
  it('does not offer completion for an unpaid pickup order', () => {
    expect(getOrderStatusOptions('dang_xu_ly', false, false, false)).toEqual(['dang_xu_ly'])
  })

  it('offers completion only after payment for a pickup order', () => {
    expect(getOrderStatusOptions('dang_xu_ly', false, true, false)).toEqual(['dang_xu_ly', 'hoan_thanh'])
  })

  it('allows COD delivery to dispatch, then offers completion only after collection', () => {
    expect(getOrderStatusOptions('dang_xu_ly', true, false, false)).toEqual(['dang_xu_ly', 'dang_giao'])
    expect(getOrderStatusOptions('dang_giao', true, false, false)).toEqual(['dang_giao'])
    expect(getOrderStatusOptions('dang_giao', true, true, false)).toEqual(['dang_giao', 'hoan_thanh'])
  })

  it('does not offer dispatch for a SePay order while payment is pending', () => {
    expect(getOrderStatusOptions('dang_xu_ly', true, false, true)).toEqual(['dang_xu_ly'])
    expect(getOrderStatusOptions('dang_xu_ly', true, true, true)).toEqual(['dang_xu_ly', 'dang_giao'])
  })
})
