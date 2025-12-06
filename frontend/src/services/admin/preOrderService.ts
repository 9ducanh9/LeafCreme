// Admin Pre-order Service - API calls for pre-order management
import { PreOrder } from '../../types/admin'
import { apiClient } from '../api'

// Mock data storage key
const STORAGE_KEY = 'leaf_creme_mock_preorders'

// Initial mock data
const INITIAL_MOCK_PREORDERS: PreOrder[] = [
  {
    id: '1',
    customerName: 'Nguyễn Văn A',
    phone: '0912345678',
    pickupDate: '2024-12-25T10:00:00',
    status: 'pending',
    notes: 'Giao vào buổi sáng',
    items: [
      { productName: 'Tiramisu Classic', size: 'L', quantity: 1, price: 350000 },
      { productName: 'Mousse Chocolate', size: 'M', quantity: 2, price: 200000 },
    ],
    totalAmount: 750000,
    createdAt: '2024-12-20T09:00:00',
  },
  {
    id: '2',
    customerName: 'Trần Thị B',
    phone: '0987654321',
    pickupDate: '2024-12-24T14:00:00',
    status: 'confirmed',
    notes: '',
    items: [{ productName: 'Bánh kem sinh nhật', size: 'XL', quantity: 1, price: 500000 }],
    totalAmount: 500000,
    createdAt: '2024-12-19T15:30:00',
  },
  {
    id: '3',
    customerName: 'Lê Văn C',
    phone: '0901234567',
    pickupDate: '2024-12-23T16:00:00',
    status: 'preparing',
    notes: 'Cần trang trí đặc biệt',
    items: [
      { productName: 'Bông lan phô mai', size: 'L', quantity: 1, price: 300000 },
      { productName: 'Tiramisu Classic', size: 'M', quantity: 1, price: 250000 },
    ],
    totalAmount: 550000,
    createdAt: '2024-12-18T10:15:00',
  },
]

// Get mock preorders from localStorage or use initial data
function getMockPreOrders(): PreOrder[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    // First time: save initial data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_PREORDERS))
    return INITIAL_MOCK_PREORDERS
  } catch {
    return INITIAL_MOCK_PREORDERS
  }
}

// Save mock preorders to localStorage
function saveMockPreOrders(preorders: PreOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preorders))
  } catch (error) {
    console.error('Failed to save preorders to localStorage:', error)
  }
}

export async function getPreOrders(filters?: {
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}): Promise<PreOrder[]> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/preorders', { params: filters })
  // return response.data

  const MOCK_PREORDERS = getMockPreOrders()
  let filtered = [...MOCK_PREORDERS]

  if (filters?.status) {
    filtered = filtered.filter((p) => p.status === filters.status)
  }

  if (filters?.dateFrom) {
    const fromDate = new Date(filters.dateFrom)
    filtered = filtered.filter((p) => new Date(p.pickupDate) >= fromDate)
  }

  if (filters?.dateTo) {
    const toDate = new Date(filters.dateTo)
    toDate.setHours(23, 59, 59, 999)
    filtered = filtered.filter((p) => new Date(p.pickupDate) <= toDate)
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.customerName.toLowerCase().includes(searchLower) ||
        p.phone.includes(searchLower)
    )
  }

  return filtered
}

export async function getPreOrderById(id: string): Promise<PreOrder> {
  // TODO: Replace with real API call
  const MOCK_PREORDERS = getMockPreOrders()
  const preOrder = MOCK_PREORDERS.find((p) => p.id === id)
  if (!preOrder) throw new Error('Pre-order not found')
  return preOrder
}

export async function updatePreOrderStatus(
  id: string,
  status: PreOrder['status']
): Promise<PreOrder> {
  // TODO: Replace with real API call
  const MOCK_PREORDERS = getMockPreOrders()
  const index = MOCK_PREORDERS.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Pre-order not found')

  MOCK_PREORDERS[index].status = status
  saveMockPreOrders(MOCK_PREORDERS)
  return MOCK_PREORDERS[index]
}

export async function updatePreOrderNotes(id: string, notes: string): Promise<PreOrder> {
  // TODO: Replace with real API call
  const MOCK_PREORDERS = getMockPreOrders()
  const index = MOCK_PREORDERS.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Pre-order not found')

  MOCK_PREORDERS[index].notes = notes
  saveMockPreOrders(MOCK_PREORDERS)
  return MOCK_PREORDERS[index]
}

export async function deletePreOrder(id: string): Promise<void> {
  // TODO: Replace with real API call
  const MOCK_PREORDERS = getMockPreOrders()
  const index = MOCK_PREORDERS.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Pre-order not found')
  MOCK_PREORDERS.splice(index, 1)
  saveMockPreOrders(MOCK_PREORDERS)
}

