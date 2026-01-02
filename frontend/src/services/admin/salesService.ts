// Admin Sales Service - API calls for sales/order management
import { Order } from '../../types/admin'
import { apiClient } from '../api'

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
  try {
    // Build query params for backend
    const params: Record<string, string | number | boolean | null> = {}
    if (filters?.orderType) params.loai_don = filters.orderType
    if (filters?.status) params.trang_thai = filters.status
    if (filters?.dateFrom) params.from_date = filters.dateFrom
    if (filters?.dateTo) params.to_date = filters.dateTo
    if (filters?.search) params.ma_don_hang = filters.search
    
    // Call real API
    const response = await apiClient.get<any[]>('/orders', Object.keys(params).length > 0 ? params : undefined)
    
    // Map backend response to frontend Order type
    const orders: Order[] = response.map((item: any) => ({
      id: String(item.donhang_id),
      orderType: item.loai_don as 'online' | 'pos' | 'preorder',
      customerName: item.ten_khach_hang || 'Khách hàng',
      date: item.ngay_tao,
      items: [], // Details not included in list response
      totalAmount: Number(item.tien_thanh_toan),
      paymentMethod: 'unknown', // Not in list response
      status: mapBackendStatus(item.trang_thai),
    }))
    
    // Apply client-side filters that aren't supported by backend
    let filtered = orders
    
    if (filters?.amountFrom) {
      filtered = filtered.filter((o) => o.totalAmount >= filters.amountFrom!)
    }
    
    if (filters?.amountTo) {
      filtered = filtered.filter((o) => o.totalAmount <= filters.amountTo!)
    }
    
    return filtered
  } catch (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
}

// Helper function to map backend status to frontend status
function mapBackendStatus(backendStatus: string): Order['status'] {
  const statusMap: Record<string, Order['status']> = {
    'cho': 'pending',
    'dang_xu_ly': 'processing',
    'thanh_toan': 'completed',
    'da_nhan': 'completed',
    'huy': 'canceled',
  }
  return statusMap[backendStatus] || 'pending'
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1376030d-9517-4cc1-80ad-27edd28027fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'salesService.ts:158',message:'deleteOrder called',data:{orderId:id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'post-fix-v2'})}).catch(()=>{});
  // #endregion
  
  try {
    console.log('🗑️ [deleteOrder] Deleting order:', id)
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1376030d-9517-4cc1-80ad-27edd28027fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'salesService.ts:163',message:'Calling real API DELETE',data:{orderId:id,endpoint:`/orders/${id}`},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'post-fix-v2'})}).catch(()=>{});
    // #endregion
    
    await apiClient.delete(`/orders/${id}`)
    
    console.log('✅ [deleteOrder] Order deleted successfully:', id)
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1376030d-9517-4cc1-80ad-27edd28027fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'salesService.ts:169',message:'API DELETE succeeded',data:{orderId:id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'post-fix-v2'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    console.error('❌ [deleteOrder] Error:', error)
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1376030d-9517-4cc1-80ad-27edd28027fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'salesService.ts:173',message:'API DELETE failed',data:{orderId:id,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix-v2'})}).catch(()=>{});
    // #endregion
    throw error
  }
}

