// Admin Voucher Service - API calls for voucher management
import { Voucher } from '../../types/admin'

// Mock data storage key
const STORAGE_KEY = 'leaf_creme_mock_vouchers'

// Initial mock data
const INITIAL_MOCK_VOUCHERS: Voucher[] = [
  {
    id: '1',
    code: 'WELCOME10',
    type: 'percent',
    discountValue: 10,
    appliesTo: 'all',
    minOrderValue: 100000,
    usageLimit: 100,
    expiresAt: '2024-12-31T23:59:59',
    status: 'active',
  },
  {
    id: '2',
    code: 'SAVE50K',
    type: 'fixed_amount',
    discountValue: 50000,
    appliesTo: 'all',
    minOrderValue: 200000,
    usageLimit: 50,
    expiresAt: '2024-11-30T23:59:59',
    status: 'active',
  },
  {
    id: '3',
    code: 'MOUSSE20',
    type: 'percent',
    discountValue: 20,
    appliesTo: 'category',
    targetId: 'Mousse',
    minOrderValue: 150000,
    expiresAt: '2024-10-31T23:59:59',
    status: 'inactive',
  },
]

// Get mock vouchers from localStorage or use initial data
function getMockVouchers(): Voucher[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    // First time: save initial data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_VOUCHERS))
    return INITIAL_MOCK_VOUCHERS
  } catch {
    return INITIAL_MOCK_VOUCHERS
  }
}

// Save mock vouchers to localStorage
function saveMockVouchers(vouchers: Voucher[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vouchers))
  } catch (error) {
    console.error('Failed to save vouchers to localStorage:', error)
  }
}

export async function getVouchers(filters?: {
  status?: string
  type?: string
  search?: string
}): Promise<Voucher[]> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/vouchers', { params: filters })
  // return response.data

  const MOCK_VOUCHERS = getMockVouchers()
  let filtered = [...MOCK_VOUCHERS]

  if (filters?.status) {
    filtered = filtered.filter((v) => v.status === filters.status)
  }

  if (filters?.type) {
    filtered = filtered.filter((v) => v.type === filters.type)
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter((v) => v.code.toLowerCase().includes(searchLower))
  }

  return filtered
}

export async function getVoucherById(id: string): Promise<Voucher> {
  // TODO: Replace with real API call
  const MOCK_VOUCHERS = getMockVouchers()
  const voucher = MOCK_VOUCHERS.find((v) => v.id === id)
  if (!voucher) throw new Error('Voucher not found')
  return voucher
}

export async function createVoucher(data: Omit<Voucher, 'id'>): Promise<Voucher> {
  // TODO: Replace with real API call
  // const response = await apiClient.post('/admin/vouchers', data)
  // return response.data

  const MOCK_VOUCHERS = getMockVouchers()
  const newVoucher: Voucher = {
    ...data,
    id: Date.now().toString(),
  }
  MOCK_VOUCHERS.push(newVoucher)
  saveMockVouchers(MOCK_VOUCHERS)
  return newVoucher
}

export async function updateVoucher(id: string, data: Partial<Voucher>): Promise<Voucher> {
  // TODO: Replace with real API call
  // const response = await apiClient.put(`/admin/vouchers/${id}`, data)
  // return response.data

  const MOCK_VOUCHERS = getMockVouchers()
  const index = MOCK_VOUCHERS.findIndex((v) => v.id === id)
  if (index === -1) throw new Error('Voucher not found')

  MOCK_VOUCHERS[index] = { ...MOCK_VOUCHERS[index], ...data }
  saveMockVouchers(MOCK_VOUCHERS)
  return MOCK_VOUCHERS[index]
}

export async function deleteVoucher(id: string): Promise<void> {
  // TODO: Replace with real API call
  // await apiClient.delete(`/admin/vouchers/${id}`)

  const MOCK_VOUCHERS = getMockVouchers()
  const index = MOCK_VOUCHERS.findIndex((v) => v.id === id)
  if (index === -1) throw new Error('Voucher not found')
  MOCK_VOUCHERS.splice(index, 1)
  saveMockVouchers(MOCK_VOUCHERS)
}

