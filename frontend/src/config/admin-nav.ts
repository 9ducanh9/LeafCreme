export interface AdminNavItem {
  key: string
  label: string
  path: string
  icon: 'overview' | 'catalog' | 'warehouse' | 'operations' | 'sales' | 'settings' | 'agent'
}

export interface AdminNavGroup {
  label: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { key: 'overview', label: 'Tổng quan', path: '/admin/dashboard', icon: 'overview' },
      { key: 'agent', label: 'Operations Agent', path: '/admin/agent', icon: 'agent' },
    ],
  },
  {
    label: 'Danh mục',
    items: [
      { key: 'products', label: 'Sản phẩm', path: '/admin/products', icon: 'catalog' },
      { key: 'gift-boxes', label: 'Hộp quà', path: '/admin/gift-boxes', icon: 'catalog' },
      { key: 'vouchers', label: 'Mã giảm giá', path: '/admin/vouchers', icon: 'settings' },
    ],
  },
  {
    label: 'Kho & lô hàng',
    items: [
      { key: 'inventory', label: 'Tồn kho', path: '/admin/inventory', icon: 'warehouse' },
      { key: 'stock-ledger', label: 'Nhật ký kho', path: '/admin/stock-ledger', icon: 'warehouse' },
      { key: 'batch-trace', label: 'Truy vết lô', path: '/admin/batch-trace', icon: 'operations' },
      { key: 'batches', label: 'Nhập lô', path: '/admin/batches', icon: 'operations' },
      { key: 'alerts', label: 'Cảnh báo', path: '/admin/alerts', icon: 'operations' },
    ],
  },
  {
    label: 'Bán hàng',
    items: [
      { key: 'orders', label: 'Đơn hàng', path: '/admin/orders', icon: 'sales' },
    ],
  },
]
