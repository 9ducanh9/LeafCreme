// Admin Report Service - API calls for dashboard/reporting data
import { RevenueData, ProductRevenue, BestSeller, DashboardStats } from '../../types/admin'

export interface CategoryRevenue {
  category: string
  revenue: number
  quantity: number
}

// Mock data for development (replace with real API calls later)
const generateDailyRevenue = (): RevenueData[] => {
  const data: RevenueData[] = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 5000000) + 2000000, // 2M - 7M VND
    })
  }
  return data
}

const generateMonthlyRevenue = (): RevenueData[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months.map((month) => ({
    date: month,
    revenue: Math.floor(Math.random() * 50000000) + 30000000, // 30M - 80M VND
  }))
}

const MOCK_PRODUCT_REVENUE: ProductRevenue[] = [
  { productName: 'Tiramisu Classic', revenue: 12500000, quantity: 50 },
  { productName: 'Mousse Chocolate', revenue: 9800000, quantity: 49 },
  { productName: 'Bánh kem sinh nhật', revenue: 8750000, quantity: 25 },
  { productName: 'Bông lan phô mai', revenue: 7200000, quantity: 36 },
  { productName: 'Crepe Cake', revenue: 5600000, quantity: 28 },
]

const MOCK_BEST_SELLERS: BestSeller[] = [
  { productName: 'Tiramisu Classic', quantity: 85, revenue: 21250000 },
  { productName: 'Mousse Chocolate', quantity: 72, revenue: 14400000 },
  { productName: 'Bánh kem sinh nhật', quantity: 45, revenue: 20250000 },
  { productName: 'Bông lan phô mai', quantity: 58, revenue: 17400000 },
  { productName: 'Crepe Cake', quantity: 42, revenue: 8400000 },
]

const MOCK_CATEGORY_REVENUE: CategoryRevenue[] = [
  { category: 'Bánh kem', revenue: 25000000, quantity: 120 },
  { category: 'Bông lan', revenue: 18000000, quantity: 95 },
  { category: 'Mousse', revenue: 15000000, quantity: 75 },
  { category: 'Tiramisu', revenue: 22000000, quantity: 88 },
]

export async function getDailyRevenue(): Promise<RevenueData[]> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/reports/revenue/daily')
  // return response.data
  return generateDailyRevenue()
}

export async function getMonthlyRevenue(): Promise<RevenueData[]> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/reports/revenue/monthly')
  // return response.data
  return generateMonthlyRevenue()
}

export async function getRevenueByProduct(): Promise<ProductRevenue[]> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/reports/revenue/by-product')
  // return response.data
  return MOCK_PRODUCT_REVENUE
}

export async function getBestSellers(limit: number = 5): Promise<BestSeller[]> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/reports/best-sellers', { params: { limit } })
  // return response.data
  return MOCK_BEST_SELLERS.slice(0, limit)
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/reports/dashboard-stats')
  // return response.data

  const dailyRevenue = await getDailyRevenue()
  const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0)
  const bestSellers = await getBestSellers(1)

  return {
    totalRevenue,
    totalOrders: 156, // Mock value
    bestSeller: bestSellers[0]?.productName || 'N/A',
  }
}

export async function getRevenueByCategory(): Promise<CategoryRevenue[]> {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/admin/reports/revenue/by-category')
  // return response.data
  return MOCK_CATEGORY_REVENUE
}

