// Admin Dashboard Page - Business Intelligence with charts and analytics
import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import StarIcon from '@mui/icons-material/Star'
import {
  getDailyRevenue,
  getMonthlyRevenue,
  getRevenueByProduct,
  getBestSellers,
  getDashboardStats,
  getRevenueByCategory,
  CategoryRevenue,
} from '../../services/admin/reportService'
import { RevenueData, ProductRevenue, BestSeller, DashboardStats } from '../../types/admin'

type TimeRange = 'daily' | 'monthly'

const COLORS = ['#C59B72', '#F5C96A', '#F7B4B8', '#E8E5DD', '#7A6F63']

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily')
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [productRevenue, setProductRevenue] = useState<ProductRevenue[]>([])
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenue[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [revenue, products, sellers, categories, dashboardStats] = await Promise.all([
        timeRange === 'daily' ? getDailyRevenue() : getMonthlyRevenue(),
        getRevenueByProduct(),
        getBestSellers(5),
        getRevenueByCategory(),
        getDashboardStats(),
      ])
      console.log('Dashboard data loaded:', { revenue, products, sellers, categories, dashboardStats })
      setRevenueData(revenue)
      setProductRevenue(products)
      setBestSellers(sellers)
      setCategoryRevenue(categories)
      setStats(dashboardStats)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    if (timeRange === 'daily') {
      const date = new Date(dateStr)
      return `${date.getDate()}/${date.getMonth() + 1}`
    }
    return dateStr
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: '#C59B72' }} />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontFamily: 'Playfair Display, serif', 
              color: '#473C2F', 
              fontWeight: 700,
              fontSize: '2rem',
              mb: 0.5
            }}
          >
            Bảng điều khiển Business Intelligence
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#9B948B',
              fontWeight: 500
            }}
          >
            Tổng quan tình hình kinh doanh và hiệu suất sản phẩm
          </Typography>
        </Box>
        <FormControl 
          size="small" 
          sx={{ 
            minWidth: 170,
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: 'white',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              '& fieldset': {
                border: 'none'
              }
            }
          }}
        >
          <InputLabel sx={{ fontWeight: 500 }}>Khoảng thời gian</InputLabel>
          <Select
            value={timeRange}
            label="Khoảng thời gian"
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          >
            <MenuItem value="daily">14 ngày qua</MenuItem>
            <MenuItem value="monthly">12 tháng qua</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card 
            sx={{ 
              bgcolor: 'white', 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)',
                transform: 'translateY(-2px)',
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box flex={1}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#7A6F63', 
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'block',
                      mb: 1.5
                    }}
                  >
                    Tổng doanh thu
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: '#473C2F', 
                      fontWeight: 700,
                      fontSize: '1.75rem',
                      lineHeight: 1.2
                    }}
                  >
                    {stats ? formatCurrency(stats.totalRevenue) : 'N/A'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'rgba(245, 201, 106, 0.15)',
                    borderRadius: '12px',
                    p: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AttachMoneyIcon sx={{ color: '#F5C96A', fontSize: '1.5rem' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card 
            sx={{ 
              bgcolor: 'white', 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)',
                transform: 'translateY(-2px)',
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box flex={1}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#7A6F63', 
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'block',
                      mb: 1.5
                    }}
                  >
                    Tổng đơn hàng
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: '#473C2F', 
                      fontWeight: 700,
                      fontSize: '1.75rem',
                      lineHeight: 1.2
                    }}
                  >
                    {stats?.totalOrders || 0}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'rgba(247, 180, 184, 0.15)',
                    borderRadius: '12px',
                    p: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShoppingCartIcon sx={{ color: '#F7B4B8', fontSize: '1.5rem' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card 
            sx={{ 
              bgcolor: 'white', 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)',
                transform: 'translateY(-2px)',
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box flex={1}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#7A6F63', 
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'block',
                      mb: 1.5
                    }}
                  >
                    Đơn hàng trung bình
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: '#473C2F', 
                      fontWeight: 700,
                      fontSize: '1.75rem',
                      lineHeight: 1.2
                    }}
                  >
                    {stats && stats.totalOrders > 0
                      ? formatCurrency(Math.round(stats.totalRevenue / stats.totalOrders))
                      : 'N/A'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'rgba(197, 155, 114, 0.15)',
                    borderRadius: '12px',
                    p: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUpIcon sx={{ color: '#C59B72', fontSize: '1.5rem' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card 
            sx={{ 
              bgcolor: 'white', 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)',
                transform: 'translateY(-2px)',
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box flex={1}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#7A6F63', 
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'block',
                      mb: 1.5
                    }}
                  >
                    Best Seller
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#473C2F', 
                      fontWeight: 700,
                      fontSize: '1.125rem',
                      lineHeight: 1.3
                    }}
                  >
                    {stats?.bestSeller || 'N/A'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'rgba(232, 229, 221, 0.5)',
                    borderRadius: '12px',
                    p: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <StarIcon sx={{ color: '#C59B72', fontSize: '1.5rem' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1: Revenue Trend */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12 }}>
          <Card 
            sx={{ 
              bgcolor: 'white', 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#473C2F', 
                  mb: 3, 
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 600,
                  fontSize: '1.25rem'
                }}
              >
                Xu hướng doanh thu
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C59B72" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#C59B72" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#9B948B"
                    style={{ 
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                    tick={{ fill: '#9B948B' }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    stroke="#9B948B"
                    style={{ 
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                    tick={{ fill: '#9B948B' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{
                      fontWeight: 600,
                      color: '#473C2F',
                      marginBottom: '4px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#C59B72"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2: Product Performance & Best Sellers */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            sx={{ 
              bgcolor: 'white', 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#473C2F', 
                  mb: 3, 
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 600,
                  fontSize: '1.25rem'
                }}
              >
                Doanh thu theo sản phẩm
              </Typography>
              {productRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" strokeOpacity={0.6} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    stroke="#9B948B"
                    style={{ 
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                    tick={{ fill: '#9B948B' }}
                  />
                  <YAxis
                    dataKey="productName"
                    type="category"
                    width={120}
                    stroke="#9B948B"
                    style={{ 
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                    tick={{ fill: '#9B948B' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{
                      fontWeight: 600,
                      color: '#473C2F',
                      marginBottom: '4px'
                    }}
                  />
                  <Bar dataKey="revenue" fill="#C59B72" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography variant="body2" sx={{ color: '#9B948B', fontWeight: 500 }}>
                    Không có dữ liệu doanh thu sản phẩm
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            sx={{ 
              bgcolor: 'white', 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#473C2F', 
                  mb: 3, 
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 600,
                  fontSize: '1.25rem'
                }}
              >
                Top 5 Best Seller
              </Typography>
              {bestSellers.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bestSellers}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" strokeOpacity={0.6} />
                    <XAxis
                      dataKey="productName"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#9B948B"
                      style={{ 
                        fontSize: '10px',
                        fontWeight: 500
                      }}
                      tick={{ fill: '#9B948B' }}
                    />
                    <YAxis 
                      stroke="#9B948B" 
                      style={{ 
                        fontSize: '11px',
                        fontWeight: 500
                      }}
                      tick={{ fill: '#9B948B' }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'quantity') return [`${value} sản phẩm`, 'Số lượng']
                        return [formatCurrency(value), 'Doanh thu']
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px 16px'
                      }}
                      labelStyle={{
                        fontWeight: 600,
                        color: '#473C2F',
                        marginBottom: '4px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{
                        paddingTop: '16px'
                      }}
                    />
                    <Bar dataKey="quantity" fill="#F5C96A" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="revenue" fill="#C59B72" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography variant="body2" sx={{ color: '#9B948B', fontWeight: 500 }}>
                    Không có dữ liệu best seller
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 3: Category Distribution */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            sx={{ 
              bgcolor: 'white', 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#473C2F', 
                  mb: 3, 
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 600,
                  fontSize: '1.25rem'
                }}
              >
                Doanh thu theo danh mục
              </Typography>
              {categoryRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryRevenue as unknown as Array<Record<string, unknown>>}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: { category?: string; name?: string; percent?: number }) => {
                      const category = entry.category || entry.name || 'Unknown'
                      const percent = entry.percent ?? 0
                      return `${category}: ${(percent * 100).toFixed(0)}%`
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {categoryRevenue.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{
                      fontWeight: 600,
                      color: '#473C2F',
                      marginBottom: '4px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography variant="body2" sx={{ color: '#9B948B', fontWeight: 500 }}>
                    Không có dữ liệu doanh thu danh mục
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            sx={{ 
              bgcolor: 'white', 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#473C2F', 
                  mb: 3, 
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 600,
                  fontSize: '1.25rem'
                }}
              >
                Tóm tắt hiệu suất sản phẩm
              </Typography>
              {productRevenue.length > 0 ? (
                <Box>
                {productRevenue.map((product, index) => (
                  <Box
                    key={product.productName}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 2.5,
                      px: 1,
                      borderBottom: index < productRevenue.length - 1 ? '1px solid #F5F3EF' : 'none',
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        bgcolor: '#FAFAF9',
                        borderRadius: '8px'
                      }
                    }}
                  >
                    <Box>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: '#473C2F', 
                          fontWeight: 600,
                          mb: 0.5
                        }}
                      >
                        {product.productName}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#9B948B', 
                          fontSize: '0.8125rem',
                          fontWeight: 500
                        }}
                      >
                        Đã bán {product.quantity} sản phẩm
                      </Typography>
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: '#C59B72', 
                        fontWeight: 700,
                        fontSize: '1.125rem'
                      }}
                    >
                      {formatCurrency(product.revenue)}
                    </Typography>
                  </Box>
                ))}
              </Box>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                  <Typography variant="body2" sx={{ color: '#9B948B', fontWeight: 500 }}>
                    Không có dữ liệu hiệu suất sản phẩm
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Debug info - remove in production */}
      {import.meta.env.DEV && (
        <Box mt={3} p={2} bgcolor="#f5f5f5" borderRadius={1}>
          <Typography variant="caption" color="text.secondary">
            Debug: Revenue Data: {revenueData.length} | Products: {productRevenue.length} | 
            Sellers: {bestSellers.length} | Categories: {categoryRevenue.length}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

