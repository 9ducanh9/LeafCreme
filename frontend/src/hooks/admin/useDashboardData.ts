import { useCallback, useEffect, useState } from 'react'
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
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setErrors({})
    const range = timeRange === 'daily'
      ? { fromDate: new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10), toDate: new Date().toISOString().slice(0, 10) }
      : (() => { const today = new Date(); return { fromDate: new Date(today.getFullYear(), today.getMonth() - 11, 1).toISOString().slice(0, 10), toDate: today.toISOString().slice(0, 10) } })()
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
    load('products', () => getRevenueByProduct(range.fromDate, range.toDate), setProductRevenue)
    load('sellers', () => getBestSellers(5, range.fromDate, range.toDate), setBestSellers)
    load('categories', () => getRevenueByCategory(range.fromDate, range.toDate), setCategoryRevenue)
    load('stats', () => getDashboardStats(range.fromDate, range.toDate), setStats)
    load('alerts', getAlertsSummary, setAlertsSummary)
    return () => { active = false }
  }, [reloadToken, timeRange])

  return { revenueData, productRevenue, bestSellers, categoryRevenue, stats, alertsSummary, loading, errors, reload }
}
