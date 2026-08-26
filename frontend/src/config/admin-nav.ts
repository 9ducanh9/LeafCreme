export interface AdminNavItem {
  key: string
  label: string
  path: string
  capability: string
  icon: 'overview' | 'catalog' | 'warehouse' | 'operations' | 'sales' | 'settings'
}

export interface AdminNavGroup {
  label: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { key: 'overview', label: 'Tổng quan', path: '/admin/dashboard', icon: 'overview', capability: 'dashboard.read' },
      { key: 'orders', label: 'Đơn hàng', path: '/admin/orders', icon: 'sales', capability: 'orders.read.own_created' },
    ],
  },
  {
    label: 'Danh mục',
    items: [
      { key: 'products', label: 'Sản phẩm', path: '/admin/products', icon: 'catalog', capability: 'products.read' },
      { key: 'gift-boxes', label: 'Hộp quà', path: '/admin/gift-boxes', icon: 'catalog', capability: 'giftbox.read' },
      { key: 'vouchers', label: 'Mã giảm giá', path: '/admin/vouchers', icon: 'settings', capability: 'vouchers.read' },
    ],
  },
  {
    label: 'Kho & lô hàng',
    items: [
      { key: 'inventory', label: 'Tồn kho', path: '/admin/inventory', icon: 'warehouse', capability: 'inventory.read' },
      { key: 'stock-ledger', label: 'Nhật ký kho', path: '/admin/stock-ledger', icon: 'warehouse', capability: 'inventory.read' },
      { key: 'batch-trace', label: 'Truy vết lô', path: '/admin/batch-trace', icon: 'operations', capability: 'inventory.read' },
      { key: 'batches', label: 'Nhập lô', path: '/admin/batches', icon: 'operations', capability: 'batches.write' },
      { key: 'alerts', label: 'Cảnh báo', path: '/admin/alerts', icon: 'operations', capability: 'alerts.read' },
    ],
  },
]
