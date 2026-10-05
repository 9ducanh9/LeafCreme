import { expect, it, vi } from 'vitest'
import { apiClient } from '../api'
import { disposeExpiredBatch, pauseBatch } from './batchService'

vi.mock('../api', () => ({ apiClient: { post: vi.fn(), put: vi.fn() } }))

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
