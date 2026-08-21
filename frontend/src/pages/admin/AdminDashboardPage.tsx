import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import StarIcon from '@mui/icons-material/Star'
import { useNavigate } from 'react-router-dom'
import AdminPage from '../../components/admin/ui/admin-page'
import StatCard from '../../components/admin/dashboard/stat-card'
import { useDashboardData } from '../../hooks/admin/useDashboardData'

type TimeRange = 'daily' | 'monthly'
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState<TimeRange>('daily')
  const { revenueData, productRevenue, bestSellers, categoryRevenue, stats, alertsSummary, loading, errors, reload } = useDashboardData(timeRange)
  const average = stats && stats.totalOrders ? stats.totalRevenue / stats.totalOrders : undefined
  const errorMessage = (key: string) => errors[key] ? <Alert severity="error" action={<Button color="inherit" onClick={reload}>Thử lại</Button>}>{errors[key]}</Alert> : null
  const emptyMessage = 'Không có dữ liệu trong khoảng này.'

  return (
    <AdminPage title="Tổng quan kinh doanh" breadcrumb={[{ label: 'Tổng quan' }]}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography color="text.secondary">Theo dõi doanh thu, đơn hàng và tồn kho theo từng ô dữ liệu.</Typography>
        <TextField select size="small" label="Khoảng thời gian" value={timeRange} onChange={(event) => setTimeRange(event.target.value as TimeRange)}>
          <MenuItem value="daily">14 ngày qua</MenuItem><MenuItem value="monthly">12 tháng qua</MenuItem>
        </TextField>
      </Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {alertsSummary && alertsSummary.pending > 0 && <Alert severity="warning" action={<Button color="inherit" onClick={() => navigate('/admin/alerts')}>Mở cảnh báo</Button>} sx={{ mb: 2 }}>Có {alertsSummary.pending} cảnh báo tồn kho đang chờ xử lý.</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard label="Doanh thu" value={stats ? money(stats.totalRevenue) : errors.stats ? 'Lỗi' : '—'} icon={<AttachMoneyIcon />} />
        <StatCard label="Đơn hàng" value={stats?.totalOrders ?? (errors.stats ? 'Lỗi' : '—')} icon={<ShoppingCartIcon />} />
        <StatCard label="Giá trị trung bình" value={average === undefined ? (errors.stats ? 'Lỗi' : '—') : money(average)} icon={<StarIcon />} />
        <StatCard label="Sản phẩm bán chạy" value={stats?.bestSeller || (errors.stats ? 'Lỗi' : 'Chưa có dữ liệu')} icon={<StarIcon />} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, gap: 2 }}>
        <Card><CardContent><Typography variant="h6" gutterBottom>Doanh thu theo ngày</Typography>{errorMessage('revenue') || (revenueData.length ? <Stack spacing={1}>{revenueData.slice(-8).map((item) => <Box key={item.date}><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2">{item.date}</Typography><Typography variant="body2" fontWeight={700}>{money(item.revenue)}</Typography></Box><LinearProgress variant="determinate" value={Math.min(100, (item.revenue / Math.max(...revenueData.map((entry) => entry.revenue), 1)) * 100)} /></Box>)}</Stack> : <Typography color="text.secondary">{emptyMessage}</Typography>)}</CardContent></Card>
        <Card><CardContent><Typography variant="h6" gutterBottom><WarningAmberIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Cảnh báo tồn kho</Typography>{alertsSummary ? <Stack spacing={1}><Chip label={`Tồn kho thấp: ${alertsSummary.by_type?.ton_kho_thap || 0}`} /><Chip label={`Sắp/hết hạn: ${(alertsSummary.by_type?.sap_het_han || 0) + (alertsSummary.by_type?.qua_han || 0)}`} /><Chip label={`Mức độ cao: ${alertsSummary.by_severity?.cao || 0}`} color="warning" /></Stack> : <Typography color="text.secondary">Chưa có dữ liệu cảnh báo.</Typography>}</CardContent></Card>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
        <Card><CardContent><Typography variant="h6" gutterBottom>Sản phẩm theo doanh thu</Typography>{errorMessage('products') || (productRevenue.length ? productRevenue.slice(0, 5).map((item) => <Box key={item.productName} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}><Typography variant="body2">{item.productName}</Typography><Typography variant="body2" fontWeight={600}>{money(item.revenue)}</Typography></Box>) : <Typography color="text.secondary">{emptyMessage}</Typography>)}</CardContent></Card>
        <Card><CardContent><Typography variant="h6" gutterBottom>Bán chạy</Typography>{errorMessage('sellers') || (bestSellers.length ? bestSellers.slice(0, 5).map((item) => <Box key={item.productName} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}><Typography variant="body2">{item.productName}</Typography><Typography variant="body2">{item.quantity} sản phẩm</Typography></Box>) : <Typography color="text.secondary">{emptyMessage}</Typography>)}</CardContent></Card>
        <Card><CardContent><Typography variant="h6" gutterBottom>Danh mục</Typography>{errorMessage('categories') || (categoryRevenue.length ? categoryRevenue.slice(0, 5).map((item) => <Box key={item.category} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}><Typography variant="body2">{item.category}</Typography><Typography variant="body2" fontWeight={600}>{money(item.revenue)}</Typography></Box>) : <Typography color="text.secondary">{emptyMessage}</Typography>)}</CardContent></Card>
      </Box>
    </AdminPage>
  )
}
