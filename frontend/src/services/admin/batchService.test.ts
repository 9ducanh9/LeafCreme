import { expect, it, vi } from 'vitest'
import { apiClient } from '../api'
import { disposeExpiredBatch, pauseBatch, updateProductBatchDates } from './batchService'

vi.mock('../api', () => ({ apiClient: { post: vi.fn(), put: vi.fn() } }))

it('corrects calendar dates without sending stock, price or batch code changes', async () => {
  await updateProductBatchDates(17, '2026-10-06', '2026-10-09')
  expect(apiClient.put).toHaveBeenLastCalledWith('/batches/products/17', {
    ngay_san_xuat: '2026-10-06T00:00:00', ngay_het_han: '2026-10-09T00:00:00',
  })
})

it('restores a paused batch only when explicitly selected', async () => {
  await updateProductBatchDates(18, '2026-10-06', '2026-10-09', true)
  expect(apiClient.put).toHaveBeenLastCalledWith('/batches/products/18', {
    ngay_san_xuat: '2026-10-06T00:00:00', ngay_het_han: '2026-10-09T00:00:00', trang_thai: 'hoatdong',
  })
})

it('rejects expiry on or before production', async () => {
  const calls = vi.mocked(apiClient.put).mock.calls.length
  await expect(updateProductBatchDates(17, '2026-10-06', '2026-10-06')).rejects.toThrow()
  expect(vi.mocked(apiClient.put).mock.calls.length).toBe(calls)
})

it('pauses a batch without changing its stock quantity', async () => {
  vi.mocked(apiClient.put).mockResolvedValue({ trang_thai: 'tamdung' })
  await pauseBatch('components', {
    lohang_id: 3, ma_lo: 'RIBBON', ngay_nhap: '2026-01-01', ngay_het_han: '2027-01-01',
    so_luong: 10, so_luong_hien_tai: 10, trang_thai: 'hoatdong',
  })
  expect(apiClient.put).toHaveBeenCalledWith('/batches/components/3', { trang_thai: 'tamdung' })
})

it('sends the confirmed stock quantity to the disposal endpoint', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({ so_luong_hien_tai: 0 })
  await disposeExpiredBatch('gift-boxes', {
    lohang_id: 8, ma_lo: 'HQ-01', ngay_nhap: '2026-01-01', ngay_het_han: '2026-01-03',
    so_luong: 10, so_luong_hien_tai: 7, trang_thai: 'hoatdong',
  }, 'Expired stock')
  expect(apiClient.post).toHaveBeenCalledWith('/batches/gift-boxes/8/dispose-expired', {
    expected_quantity: 7, reason: 'Expired stock',
  })
})
