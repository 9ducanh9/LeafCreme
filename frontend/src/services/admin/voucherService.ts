// Admin Voucher Service
// Backend voucher CRUD endpoints do not exist yet in this repository.
// These methods are explicitly demo/dev-only and disabled by default.
import { Voucher } from '../../types/admin'

const DEMO_STORAGE_KEY = 'leaf_creme_demo_vouchers'
export const DEMO_VOUCHER_MODE_ENABLED = import.meta.env.VITE_ENABLE_DEMO_VOUCHERS === 'true'

const DEMO_ONLY_ERROR =
  'Voucher management is demo/dev-only. Set VITE_ENABLE_DEMO_VOUCHERS=true to use local demo data.'

const INITIAL_DEMO_VOUCHERS: Voucher[] = [
  {
    id: '1',
    code: 'WELCOME',
    type: 'percent',
    discountValue: 10,
    appliesTo: 'all',
    minOrderValue: 0,
    usageLimit: 5,
    expiresAt: '2026-12-31T23:59:59',
    status: 'active',
  },
]

function assertDemoVoucherModeEnabled(): void {
  if (!DEMO_VOUCHER_MODE_ENABLED) {
    throw new Error(DEMO_ONLY_ERROR)
  }
}

function getDemoVouchers(): Voucher[] {
  const stored = localStorage.getItem(DEMO_STORAGE_KEY)
  if (stored) {
    return JSON.parse(stored)
  }
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_VOUCHERS))
  return INITIAL_DEMO_VOUCHERS
}

function saveDemoVouchers(vouchers: Voucher[]): void {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(vouchers))
}

export async function getVouchers(filters?: {
  status?: string
  type?: string
  search?: string
}): Promise<Voucher[]> {
  assertDemoVoucherModeEnabled()

  let filtered = [...getDemoVouchers()]
  if (filters?.status) {
    filtered = filtered.filter((voucher) => voucher.status === filters.status)
  }
  if (filters?.type) {
    filtered = filtered.filter((voucher) => voucher.type === filters.type)
  }
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter((voucher) => voucher.code.toLowerCase().includes(searchLower))
  }
  return filtered
}

export async function getVoucherById(id: string): Promise<Voucher> {
  assertDemoVoucherModeEnabled()
  const voucher = getDemoVouchers().find((item) => item.id === id)
  if (!voucher) throw new Error('Voucher not found')
  return voucher
}

export async function createVoucher(data: Omit<Voucher, 'id'>): Promise<Voucher> {
  assertDemoVoucherModeEnabled()
  const vouchers = getDemoVouchers()
  const newVoucher: Voucher = {
    ...data,
    id: Date.now().toString(),
  }
  vouchers.push(newVoucher)
  saveDemoVouchers(vouchers)
  return newVoucher
}

export async function updateVoucher(id: string, data: Partial<Voucher>): Promise<Voucher> {
  assertDemoVoucherModeEnabled()
  const vouchers = getDemoVouchers()
  const index = vouchers.findIndex((item) => item.id === id)
  if (index === -1) throw new Error('Voucher not found')
  vouchers[index] = { ...vouchers[index], ...data }
  saveDemoVouchers(vouchers)
  return vouchers[index]
}

export async function deleteVoucher(id: string): Promise<void> {
  assertDemoVoucherModeEnabled()
  const vouchers = getDemoVouchers()
  const index = vouchers.findIndex((item) => item.id === id)
  if (index === -1) throw new Error('Voucher not found')
  vouchers.splice(index, 1)
  saveDemoVouchers(vouchers)
}
