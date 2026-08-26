import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import StarIcon from '@mui/icons-material/Star'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import AdminPage from '../../components/admin/ui/admin-page'
import StatCard from '../../components/admin/ui/stat-card'
import TodayActionsWidget from '../../components/admin/dashboard/today-actions-widget'
import OperationsAttentionWidget from '../../components/admin/dashboard/operations-attention-widget'
import RevenueByDayMonth from '../../components/admin/dashboard/RevenueByDayMonth'
import RevenueByProduct from '../../components/admin/dashboard/RevenueByProduct'
import { useDashboardData } from '../../hooks/admin/useDashboardData'

type TimeRange = 'daily' | 'monthly'
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily')
  const { revenueData, productRevenue, bestSellers, categoryRevenue, stats, alertsSummary, loading, errors, reload } = useDashboardData(timeRange)
  const average = stats && stats.totalOrders ? stats.totalRevenue / stats.totalOrders : undefined
  const errorMessage = (key: string) => errors[key] ? <Alert severity="error" action={<Button color="inherit" onClick={reload}>Thử lại</Button>}>{errors[key]}</Alert> : null
  const emptyMessage = 'Không có dữ liệu trong khoảng này.'

  return (
    <AdminPage title="Tổng quan kinh doanh">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography color="text.secondary">Theo dõi doanh thu, đơn hàng và tồn kho theo từng ô dữ liệu.</Typography>
        <TextField select size="small" label="Khoảng thời gian" value={timeRange} onChange={(event) => setTimeRange(event.target.value as TimeRange)}>
          <MenuItem value="daily">14 ngày qua</MenuItem><MenuItem value="monthly">12 tháng qua</MenuItem>
        </TextField>
      </Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      <OperationsAttentionWidget />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard label="Doanh thu" value={stats ? money(stats.totalRevenue) : errors.stats ? 'Lỗi' : '—'} icon={<AttachMoneyIcon />} href="/admin/orders" />
        <StatCard label="Đơn hàng" value={stats?.totalOrders ?? (errors.stats ? 'Lỗi' : '—')} icon={<ShoppingCartIcon />} href="/admin/orders" />
        <StatCard label="Giá trị trung bình mỗi đơn" value={average === undefined ? (errors.stats ? 'Lỗi' : '—') : money(average)} icon={<ReceiptLongIcon />} />
        <StatCard label="Sản phẩm bán chạy" value={stats?.bestSeller || (errors.stats ? 'Lỗi' : 'Chưa có dữ liệu')} icon={<StarIcon />} />
      </Box>
      <TodayActionsWidget />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, gap: 2 }}>
        {errorMessage('revenue') ? <Card><CardContent>{errorMessage('revenue')}</CardContent></Card> : <RevenueByDayMonth data={revenueData} view={timeRange} />}
        <Card><CardContent><Typography variant="h6" gutterBottom><WarningAmberIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Cảnh báo tồn kho</Typography>{alertsSummary ? <Stack spacing={1}><Chip label={`Tồn kho thấp: ${alertsSummary.by_type?.ton_kho_thap || 0}`} /><Chip label={`Sắp/hết hạn: ${(alertsSummary.by_type?.sap_het_han || 0) + (alertsSummary.by_type?.qua_han || 0)}`} /><Chip label={`Mức độ cao: ${alertsSummary.by_severity?.cao || 0}`} color="warning" /></Stack> : <Typography color="text.secondary">Chưa có dữ liệu cảnh báo.</Typography>}</CardContent></Card>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
        {errorMessage('products') ? <Card><CardContent>{errorMessage('products')}</CardContent></Card> : <RevenueByProduct data={productRevenue.slice(0, 5)} />}
        <Card><CardContent><Typography variant="h6" gutterBottom>Bán chạy</Typography>{errorMessage('sellers') || (bestSellers.length ? bestSellers.slice(0, 5).map((item) => <Box key={item.productName} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}><Typography variant="body2">{item.productName}</Typography><Typography variant="body2">{item.quantity} sản phẩm</Typography></Box>) : <Typography color="text.secondary">{emptyMessage}</Typography>)}</CardContent></Card>
        <Card><CardContent><Typography variant="h6" gutterBottom>Danh mục</Typography>{errorMessage('categories') || (categoryRevenue.length ? categoryRevenue.slice(0, 5).map((item) => <Box key={item.category} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}><Typography variant="body2">{item.category}</Typography><Typography variant="body2" fontWeight={600}>{money(item.revenue)}</Typography></Box>) : <Typography color="text.secondary">{emptyMessage}</Typography>)}</CardContent></Card>
      </Box>
    </AdminPage>
  )
}
