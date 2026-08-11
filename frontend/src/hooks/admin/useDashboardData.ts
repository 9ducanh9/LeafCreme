import { useEffect, useState } from 'react'
import { getAlertsSummary, type AlertSummary } from '../../services/admin/alertService'
import {
  getBestSellers,
  getDailyRevenue,
  getDashboardStats,
  getMonthlyRevenue,
  getRevenueByCategory,
  getRevenueByProduct,
  type CategoryRevenue,
} from '../../services/admin/reportService'
import type { BestSeller, DashboardStats, ProductRevenue, RevenueData } from '../../types/admin'

export function useDashboardData(timeRange: 'daily' | 'monthly') {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [productRevenue, setProductRevenue] = useState<ProductRevenue[]>([])
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenue[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [alertsSummary, setAlertsSummary] = useState<AlertSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    setLoading(true)
    setErrors({})
    let remaining = 6
    const complete = () => {
      remaining -= 1
      if (active && remaining === 0) setLoading(false)
    }
    const load = <T,>(key: string, request: () => Promise<T>, setter: (value: T) => void) => {
      request().then((value) => { if (active) setter(value) }).catch(() => {
        if (active) setErrors((current) => ({ ...current, [key]: 'Không tải được dữ liệu ô này' }))
      }).finally(complete)
    }
    load('revenue', timeRange === 'daily' ? getDailyRevenue : getMonthlyRevenue, setRevenueData)
    load('products', getRevenueByProduct, setProductRevenue)
    load('sellers', () => getBestSellers(5), setBestSellers)
    load('categories', getRevenueByCategory, setCategoryRevenue)
    load('stats', getDashboardStats, setStats)
    load('alerts', getAlertsSummary, setAlertsSummary)
    return () => { active = false }
  }, [timeRange])

  return { revenueData, productRevenue, bestSellers, categoryRevenue, stats, alertsSummary, loading, errors }
}
