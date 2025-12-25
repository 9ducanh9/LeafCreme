// Admin Sales Service - API calls for sales/order management
import { Order } from '../../types/admin'

// Mock data storage key
const STORAGE_KEY = 'leaf_creme_mock_orders'

// Initial mock data
const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: 'ORD001',
    orderType: 'online',
    customerName: 'Nguyễn Văn A',
    date: '2024-12-20T10:30:00',
    items: [
      { productName: 'Tiramisu Classic', size: 'M', quantity: 2, price: 250000 },
      { productName: 'Mousse Chocolate', size: 'S', quantity: 1, price: 200000 },
    ],
    totalAmount: 700000,
    paymentMethod: 'chuyen_khoan',
    status: 'completed',
  },
  {
    id: 'ORD002',
    orderType: 'pos',
    customerName: 'Trần Thị B',
    date: '2024-12-20T14:15:00',
    items: [{ productName: 'Bánh kem sinh nhật', size: 'L', quantity: 1, price: 450000 }],
    totalAmount: 450000,
    paymentMethod: 'tien_mat',
    status: 'completed',
  },
  {
    id: 'ORD003',
    orderType: 'online',
    customerName: 'Lê Văn C',
    date: '2024-12-19T16:45:00',
    items: [
      { productName: 'Bông lan phô mai', size: 'L', quantity: 1, price: 300000 },
      { productName: 'Tiramisu Classic', size: 'S', quantity: 1, price: 200000 },
    ],
    totalAmount: 500000,
    paymentMethod: 'the',
    status: 'processing',
  },
  {
    id: 'ORD004',
    orderType: 'preorder',
    customerName: 'Phạm Thị D',
    date: '2024-12-18T09:20:00',
    items: [{ productName: 'Mousse Chocolate', size: 'XL', quantity: 1, price: 400000 }],
    totalAmount: 400000,
    paymentMethod: 'chuyen_khoan',
    status: 'delivering',
  },
]

// Get mock orders from localStorage or use initial data
function getMockOrders(): Order[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    // First time: save initial data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_ORDERS))
    return INITIAL_MOCK_ORDERS
  } catch {
    return INITIAL_MOCK_ORDERS
  }
}

// Save mock orders to localStorage
function saveMockOrders(orders: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch (error) {
    console.error('Failed to save orders to localStorage:', error)
  }
}

export async function getOrders(filters?: {
  orderType?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  amountFrom?: number
  amountTo?: number
  search?: string
}): Promise<Order[]> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/orders', { params: filters })
  // return response.data

  const MOCK_ORDERS = getMockOrders()
  let filtered = [...MOCK_ORDERS]

  if (filters?.orderType) {
    filtered = filtered.filter((o) => o.orderType === filters.orderType)
  }

  if (filters?.status) {
    filtered = filtered.filter((o) => o.status === filters.status)
  }

  if (filters?.dateFrom) {
    const fromDate = new Date(filters.dateFrom)
    filtered = filtered.filter((o) => new Date(o.date) >= fromDate)
  }

  if (filters?.dateTo) {
    const toDate = new Date(filters.dateTo)
    toDate.setHours(23, 59, 59, 999)
    filtered = filtered.filter((o) => new Date(o.date) <= toDate)
  }

  if (filters?.amountFrom) {
    filtered = filtered.filter((o) => o.totalAmount >= filters.amountFrom!)
  }

  if (filters?.amountTo) {
    filtered = filtered.filter((o) => o.totalAmount <= filters.amountTo!)
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(
      (o) =>
        o.customerName.toLowerCase().includes(searchLower) ||
        o.id.toLowerCase().includes(searchLower)
    )
  }

  return filtered
}

export async function getOrderById(id: string): Promise<Order> {
  // TODO: Replace with real API call
  const MOCK_ORDERS = getMockOrders()
  const order = MOCK_ORDERS.find((o) => o.id === id)
  if (!order) throw new Error('Order not found')
  return order
}

export async function updateOrderStatus(
  id: string,
  status: Order['status']
): Promise<Order> {
  // TODO: Replace with real API call
  const MOCK_ORDERS = getMockOrders()
  const index = MOCK_ORDERS.findIndex((o) => o.id === id)
  if (index === -1) throw new Error('Order not found')

  MOCK_ORDERS[index].status = status
  saveMockOrders(MOCK_ORDERS)
  return MOCK_ORDERS[index]
}

export async function deleteOrder(id: string): Promise<void> {
  // TODO: Replace with real API call
  const MOCK_ORDERS = getMockOrders()
  const index = MOCK_ORDERS.findIndex((o) => o.id === id)
  if (index === -1) throw new Error('Order not found')
  MOCK_ORDERS.splice(index, 1)
  saveMockOrders(MOCK_ORDERS)
}

