import { describe, expect, it } from 'vitest'
import { validateBatch, validateBatchSoft } from './validateBatch'

describe('validateBatch', () => {
  it('chấp nhận hết hạn hôm nay', () => {
    const now = new Date()
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    expect(validateBatch({ ma_lo: 'LO-1', ngay_het_han: today, so_luong: 1, gia_don_vi: 1 })).not.toHaveProperty('ngay_het_han')
  })
  it('rejects expiry before production', () => {
    expect(validateBatch({ ma_lo: 'LO-1', ngay_san_xuat: '2026-08-11', ngay_het_han: '2026-08-10', so_luong: 1, gia_don_vi: 1 })).toHaveProperty('ngay_het_han')
  })
  it('returns soft shelf-life warnings', () => {
    expect(validateBatchSoft({ ngay_san_xuat: '2026-01-01', ngay_het_han: '2027-01-02' })).toHaveProperty('ngay_het_han')
  })
  it('requires production date for product batches', () => {
    expect(validateBatch({ ma_lo: 'LO-1', ngay_het_han: '2026-08-30', so_luong: 1, gia_don_vi: 1 }, { requireProductionDate: true })).toHaveProperty('ngay_san_xuat')
  })
})
