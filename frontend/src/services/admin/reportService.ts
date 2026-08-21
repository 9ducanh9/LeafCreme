// Admin Report Service - all dashboard data comes from backend aggregates.
import { RevenueData, ProductRevenue, BestSeller, DashboardStats } from '../../types/admin'
import { apiClient } from '../api'

export interface CategoryRevenue {
  category: string
  revenue: number
  quantity: number
}

interface SalesReportRow {
  ngay: string
  so_don_hang: number
  tong_doanh_thu: number
  so_luong_ban: number
}

function formatDateToYmd(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateRange(days: number): { fromDate: string; toDate: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - days + 1)
  return {
    fromDate: formatDateToYmd(from),
    toDate: formatDateToYmd(to),
  }
}

async function getSalesReport(fromDate: string, toDate: string): Promise<SalesReportRow[]> {
  return apiClient.get<SalesReportRow[]>('/reports/sales', {
    from_date: fromDate,
    to_date: toDate,
  })
}

export async function getDailyRevenue(): Promise<RevenueData[]> {
  const { fromDate, toDate } = getDateRange(14)
  const rows = await getSalesReport(fromDate, toDate)
  return rows.map((row) => ({
    date: row.ngay,
    revenue: Number(row.tong_doanh_thu),
  }))
}

export async function getMonthlyRevenue(): Promise<RevenueData[]> {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth() - 11, 1)
  const rows = await getSalesReport(formatDateToYmd(start), formatDateToYmd(today))

  const monthly = new Map<string, number>()
  rows.forEach((row) => {
    const monthKey = row.ngay.slice(0, 7)
    monthly.set(monthKey, (monthly.get(monthKey) || 0) + Number(row.tong_doanh_thu))
  })

  return Array.from(monthly.entries()).map(([date, revenue]) => ({
    date,
    revenue,
  }))
}

export async function getRevenueByProduct(fromDate?: string, toDate?: string): Promise<ProductRevenue[]> {
  const range = fromDate && toDate ? { fromDate, toDate } : getDateRange(30)
  const rows = await apiClient.get<Array<{ sanpham_id: number; ten: string; doanh_thu: number; so_luong: number }>>('/reports/revenue-by-product', { from_date: range.fromDate, to_date: range.toDate, limit: 20 })
  return rows.map((row) => ({ productName: row.ten, revenue: Number(row.doanh_thu), quantity: Number(row.so_luong) }))
}

export async function getBestSellers(limit: number = 5, fromDate?: string, toDate?: string): Promise<BestSeller[]> {
  const range = fromDate && toDate ? { fromDate, toDate } : getDateRange(30)
  const rows = await apiClient.get<Array<{ name: string; sold_count: number; base_price: number }>>('/analytics/best-sellers', { limit, from_date: range.fromDate, to_date: range.toDate })
  return rows.map((row) => ({ productName: row.name, quantity: Number(row.sold_count), revenue: Number(row.base_price) * Number(row.sold_count) }))
}

export async function getDashboardStats(fromDate?: string, toDate?: string): Promise<DashboardStats> {
  const range = fromDate && toDate ? { fromDate, toDate } : getDateRange(30)
  const rows = await getSalesReport(range.fromDate, range.toDate)

  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.tong_doanh_thu), 0)
  const totalOrders = rows.reduce((sum, row) => sum + Number(row.so_don_hang), 0)

  const sellers = await getBestSellers(1, range.fromDate, range.toDate)
  return {
    totalRevenue,
    totalOrders,
    bestSeller: sellers[0]?.productName || '',
  }
}

export async function getRevenueByCategory(fromDate?: string, toDate?: string): Promise<CategoryRevenue[]> {
  const range = fromDate && toDate ? { fromDate, toDate } : getDateRange(30)
  const rows = await apiClient.get<Array<{ danh_muc: string; doanh_thu: number; so_luong: number }>>('/reports/revenue-by-category', { from_date: range.fromDate, to_date: range.toDate })
  return rows.map((row) => ({ category: row.danh_muc, revenue: Number(row.doanh_thu), quantity: Number(row.so_luong) }))
}
