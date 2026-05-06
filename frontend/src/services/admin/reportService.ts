// Admin Report Service - backend-backed where available, explicit gaps where not available
import { RevenueData, ProductRevenue, BestSeller, DashboardStats } from '../../types/admin'
import { apiClient } from '../api'

export interface CategoryRevenue {
  category: string
  revenue: number
  quantity: number
}

export const REPORTS_DEMO_ONLY_MESSAGE =
  'Reporting breakdown APIs are not implemented in backend yet (demo/dev-only).'

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

export async function getRevenueByProduct(): Promise<ProductRevenue[]> {
  return []
}

export async function getBestSellers(_limit: number = 5): Promise<BestSeller[]> {
  return []
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { fromDate, toDate } = getDateRange(30)
  const rows = await getSalesReport(fromDate, toDate)

  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.tong_doanh_thu), 0)
  const totalOrders = rows.reduce((sum, row) => sum + Number(row.so_don_hang), 0)

  return {
    totalRevenue,
    totalOrders,
    bestSeller: 'N/A',
  }
}

export async function getRevenueByCategory(): Promise<CategoryRevenue[]> {
  return []
}
