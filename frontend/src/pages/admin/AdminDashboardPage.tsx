// Admin Dashboard Page - Business Intelligence with charts and analytics
import { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material'
import {
  LineChart,
  Line,
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

  useEffect(() => {
    loadDashboardData()
  }, [timeRange])

  const loadDashboardData = async () => {
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
  }

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F', fontWeight: 600 }}>
          Bảng điều khiển Business Intelligence
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Khoảng thời gian</InputLabel>
          <Select
            value={timeRange}
            label="Khoảng thời gian"
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            sx={{ bgcolor: 'white' }}
          >
            <MenuItem value="daily">14 ngày qua</MenuItem>
            <MenuItem value="monthly">12 tháng qua</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #E8E5DD' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ color: '#7A6F63', mb: 1 }}>
                    Tổng doanh thu
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#473C2F', fontWeight: 600 }}>
                    {stats ? formatCurrency(stats.totalRevenue) : 'N/A'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: '#F5C96A',
                    borderRadius: '12px',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AttachMoneyIcon sx={{ color: '#473C2F' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #E8E5DD' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ color: '#7A6F63', mb: 1 }}>
                    Tổng đơn hàng
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#473C2F', fontWeight: 600 }}>
                    {stats?.totalOrders || 0}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: '#F7B4B8',
                    borderRadius: '12px',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShoppingCartIcon sx={{ color: '#473C2F' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #E8E5DD' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ color: '#7A6F63', mb: 1 }}>
                    Giá trị đơn hàng trung bình
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#473C2F', fontWeight: 600 }}>
                    {stats && stats.totalOrders > 0
                      ? formatCurrency(Math.round(stats.totalRevenue / stats.totalOrders))
                      : 'N/A'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: '#C59B72',
                    borderRadius: '12px',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUpIcon sx={{ color: 'white' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #E8E5DD' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ color: '#7A6F63', mb: 1 }}>
                    Best Seller
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#473C2F', fontWeight: 600 }}>
                    {stats?.bestSeller || 'N/A'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: '#E8E5DD',
                    borderRadius: '12px',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <StarIcon sx={{ color: '#473C2F' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1: Revenue Trend */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #E8E5DD' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#473C2F', mb: 3, fontFamily: 'Playfair Display, serif' }}>
                Xu hướng doanh thu
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C59B72" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C59B72" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DD" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#7A6F63"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    stroke="#7A6F63"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E8E5DD',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#C59B72"
                    strokeWidth={2}
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
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #E8E5DD' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#473C2F', mb: 3, fontFamily: 'Playfair Display, serif' }}>
                Doanh thu theo sản phẩm
              </Typography>
              {productRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DD" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    stroke="#7A6F63"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    dataKey="productName"
                    type="category"
                    width={120}
                    stroke="#7A6F63"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E8E5DD',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="#C59B72" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography variant="body2" color="text.secondary">
                    Không có dữ liệu doanh thu sản phẩm
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #E8E5DD' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#473C2F', mb: 3, fontFamily: 'Playfair Display, serif' }}>
                Top 5 Best Seller
              </Typography>
              {bestSellers.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bestSellers}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DD" />
                    <XAxis
                      dataKey="productName"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#7A6F63"
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke="#7A6F63" style={{ fontSize: '12px' }} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'quantity') return [`${value} sản phẩm`, 'Số lượng']
                        return [formatCurrency(value), 'Doanh thu']
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E8E5DD',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="quantity" fill="#F5C96A" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="revenue" fill="#C59B72" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography variant="body2" color="text.secondary">
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
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #E8E5DD' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#473C2F', mb: 3, fontFamily: 'Playfair Display, serif' }}>
                Doanh thu theo danh mục
              </Typography>
              {categoryRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryRevenue}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {categoryRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E8E5DD',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography variant="body2" color="text.secondary">
                    Không có dữ liệu doanh thu danh mục
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #E8E5DD' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#473C2F', mb: 3, fontFamily: 'Playfair Display, serif' }}>
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
                      py: 2,
                      borderBottom: index < productRevenue.length - 1 ? '1px solid #E8E5DD' : 'none',
                    }}
                  >
                    <Box>
                      <Typography variant="body1" sx={{ color: '#473C2F', fontWeight: 500 }}>
                        {product.productName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7A6F63', fontSize: '0.875rem' }}>
                        Đã bán {product.quantity} sản phẩm
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ color: '#C59B72', fontWeight: 600 }}>
                      {formatCurrency(product.revenue)}
                    </Typography>
                  </Box>
                ))}
              </Box>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                  <Typography variant="body2" color="text.secondary">
                    Không có dữ liệu hiệu suất sản phẩm
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
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

