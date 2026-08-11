// Admin Pre-order Service - API calls for pre-order management
import { apiClient } from '../api'
import { PreOrder } from '../../types/admin'

// Map backend order status to frontend status
// Backend statuses: cho, dang_xu_ly, thanh_toan, da_nhan, huy
function mapBackendStatus(status: string): PreOrder['status'] {
  const statusMap: Record<string, PreOrder['status']> = {
    'cho': 'pending',
    'dang_xu_ly': 'confirmed',
    'thanh_toan': 'preparing',
    'da_nhan': 'done',
    'huy': 'canceled',
  }
  return statusMap[status] || 'pending'
}

// Map frontend status to backend status
// UI uses: pending, confirmed, preparing, done, canceled
function mapFrontendStatus(status: PreOrder['status'] | string): string {
  const statusMap: Record<string, string> = {
    'pending': 'cho',
    'confirmed': 'dang_xu_ly',
    'preparing': 'thanh_toan',
    'ready': 'thanh_toan',
    'done': 'da_nhan',
    'completed': 'da_nhan',
    'canceled': 'huy',
    'cancelled': 'huy',
  }
  return statusMap[status] || 'cho'
}

// Transform backend order to frontend PreOrder format
function transformOrder(order: any): PreOrder {
  // Get items from chi_tiet_don_hang (if available in detail view)
  const items = (order.chi_tiet || []).map((item: any) => ({
    productName: item.ten_san_pham || item.bienthe?.san_pham?.ten_san_pham || 'Sản phẩm',
    size: item.bienthe?.kich_co || '',
    quantity: item.so_luong,
    price: parseFloat(item.gia_ban) || 0,
  }))

  return {
    id: order.donhang_id.toString(),
    customerName: order.ten_khach_hang || 'Khách hàng',
    phone: order.so_dien_thoai_khach || '',
    pickupDate: order.ngay_giao_du_kien || order.ngay_tao,
    status: mapBackendStatus(order.trang_thai),
    notes: order.ghi_chu || '',
    items,
    totalAmount: parseFloat(order.tien_thanh_toan) || parseFloat(order.tong_tien) || 0,
    createdAt: order.ngay_tao,
    orderCode: order.ma_don_hang,
    orderType: order.loai_don,
    address: order.dia_chi_giao_hang,
  }
}

export async function getPreOrders(filters?: {
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}): Promise<PreOrder[]> {
  try {
    // Fetch online orders
    const params: Record<string, any> = {
      limit: 50,
    }
    
    // Map frontend status filter to backend status
    if (filters?.status) {
      params.trang_thai = mapFrontendStatus(filters.status as PreOrder['status'])
    }
    
    if (filters?.dateFrom) {
      params.from_date = filters.dateFrom
    }
    
    if (filters?.dateTo) {
      params.to_date = filters.dateTo
    }
    
    if (filters?.search) {
      params.ma_don_hang = filters.search
    }

    // Fetch online orders
    const onlineOrders = await apiClient.get<any[]>('/orders', { 
      ...params, loai_don: 'online' 
    })
    
    // Combine and transform orders (only online for now - dattruoc might not exist in enum)
    const allOrders = [
      ...(onlineOrders || []),
    ]

    // Transform to PreOrder format
    let transformed = allOrders.map(transformOrder)

    // Additional client-side search filtering (for customer name and phone)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      transformed = transformed.filter(
        (p) =>
          p.customerName.toLowerCase().includes(searchLower) ||
          p.phone.includes(searchLower) ||
          (p.orderCode && p.orderCode.toLowerCase().includes(searchLower))
      )
    }

    return transformed
  } catch (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
}

export async function getPreOrderById(id: string): Promise<PreOrder> {
  try {
    const order = await apiClient.get<any>(`/orders/${id}`)
    return transformOrder(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    throw error
  }
}

export async function updatePreOrderStatus(
  id: string,
  status: PreOrder['status']
): Promise<PreOrder> {
  try {
    const backendStatus = mapFrontendStatus(status)
    const order = await apiClient.put<any>(`/orders/${id}/status`, {
      trang_thai: backendStatus
    })
    return transformOrder(order)
  } catch (error) {
    console.error('Error updating order status:', error)
    throw error
  }
}

export async function updatePreOrderNotes(id: string, notes: string): Promise<PreOrder> {
  try {
    const order = await apiClient.patch<any>(`/orders/${id}`, { ghi_chu: notes })
    return transformOrder(order)
  } catch (error) {
    console.error('Error updating order notes:', error)
    throw error
  }
}

export async function deletePreOrder(id: string): Promise<void> {
  try {
    await apiClient.delete(`/orders/${id}`)
  } catch (error) {
    console.error('Error deleting order:', error)
    throw error
  }
}
