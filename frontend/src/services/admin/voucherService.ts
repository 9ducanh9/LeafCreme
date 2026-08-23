import type { Voucher } from '../../types/admin'
import { apiClient } from '../api'
import type { Page } from '../../types/page'

interface BackendVoucher {
  phieugiam_id: number
  ma_phieu: string
  ten_phieu: string
  loai_giam: 'phantram' | 'sotien'
  gia_tri_giam: number
  tong_tien_toi_thieu: number
  ngay_het_han: string
  gioi_han_su_dung: number
  so_lan_da_dung: number
  san_pham_ap_dung?: { loai_ap_dung: 'all' | 'san_pham' | 'danh_muc'; danh_sach_id?: Array<number | string> | null } | null
  dang_hoat_dong: boolean
  mo_ta?: string | null
}

function mapVoucher(row: BackendVoucher): Voucher {
  const application = row.san_pham_ap_dung
  const appliesTo = application?.loai_ap_dung === 'san_pham' ? 'product' : application?.loai_ap_dung === 'danh_muc' ? 'category' : 'all'
  return {
    id: String(row.phieugiam_id),
    code: row.ma_phieu,
    type: row.loai_giam === 'phantram' ? 'percent' : 'fixed_amount',
    discountValue: Number(row.gia_tri_giam),
    appliesTo,
    targetId: application?.danh_sach_id?.[0] !== undefined ? String(application.danh_sach_id[0]) : undefined,
    minOrderValue: Number(row.tong_tien_toi_thieu || 0),
    usageLimit: Number(row.gioi_han_su_dung || 0),
    expiresAt: row.ngay_het_han,
    status: row.dang_hoat_dong ? 'active' : 'inactive',
  }
}

function toPayload(data: Omit<Voucher, 'id'> | Partial<Voucher>, partial = false) {
  const payload: Record<string, unknown> = {}
  if (!partial || data.code !== undefined) {
    payload.ma_phieu = data.code
    payload.ten_phieu = data.code
  }
  if (!partial || data.type !== undefined) payload.loai_giam = data.type === 'percent' ? 'phantram' : 'sotien'
  if (!partial || data.discountValue !== undefined) payload.gia_tri_giam = data.discountValue
  if (!partial || data.minOrderValue !== undefined) payload.tong_tien_toi_thieu = data.minOrderValue || 0
  if (!partial || data.expiresAt !== undefined) payload.ngay_het_han = data.expiresAt
  if (!partial || data.usageLimit !== undefined) payload.gioi_han_su_dung = data.usageLimit || 0
  if (!partial || data.status !== undefined) payload.dang_hoat_dong = data.status === 'active'

  if (!partial || data.appliesTo !== undefined || data.targetId !== undefined) {
    const application = data.appliesTo === 'product'
      ? { loai_ap_dung: 'san_pham', danh_sach_id: data.targetId ? [Number(data.targetId)] : [] }
      : data.appliesTo === 'category'
        ? { loai_ap_dung: 'danh_muc', danh_sach_id: data.targetId ? [data.targetId] : [] }
        : { loai_ap_dung: 'all', danh_sach_id: null }
    payload.san_pham_ap_dung = application
  }
  return payload
}

export async function getVouchers(filters?: { status?: string; type?: string; search?: string; skip?: number; limit?: number; sort_by?: string; sort_dir?: 'asc' | 'desc' }): Promise<Page<Voucher>> {
  const response = await apiClient.get<Page<BackendVoucher>>('/vouchers', {
    paginated: true,
    skip: filters?.skip ?? 0,
    limit: filters?.limit ?? 50,
    search: filters?.search || undefined,
    dang_hoat_dong: filters?.status === 'active' ? true : filters?.status === 'inactive' ? false : undefined,
    loai_giam: filters?.type === 'percent' ? 'phantram' : filters?.type === 'fixed_amount' ? 'sotien' : undefined,
    sort_by: filters?.sort_by ?? 'ngay_tao',
    sort_dir: filters?.sort_dir ?? 'desc',
  })
  return { ...response, items: response.items.map(mapVoucher) }
}

export async function getVoucherById(id: string): Promise<Voucher> {
  return mapVoucher(await apiClient.get<BackendVoucher>(`/vouchers/${id}`))
}

export async function createVoucher(data: Omit<Voucher, 'id'>): Promise<Voucher> {
  return mapVoucher(await apiClient.post<BackendVoucher>('/vouchers', toPayload(data)))
}

export async function updateVoucher(id: string, data: Partial<Voucher>): Promise<Voucher> {
  return mapVoucher(await apiClient.put<BackendVoucher>(`/vouchers/${id}`, toPayload(data, true)))
}

export async function deleteVoucher(id: string): Promise<void> {
  await apiClient.delete(`/vouchers/${id}`)
}
