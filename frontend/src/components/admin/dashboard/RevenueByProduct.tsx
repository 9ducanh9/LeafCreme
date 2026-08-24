// Biểu đồ doanh thu theo sản phẩm
import { Paper, Typography, useTheme } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ProductRevenue } from '../../../types/admin'

interface RevenueByProductProps {
  data: ProductRevenue[]
}

export default function RevenueByProduct({ data }: RevenueByProductProps) {
  const theme = useTheme()
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value)

  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Doanh thu theo sản phẩm</Typography>
        <Typography color="text.secondary">Không có dữ liệu trong khoảng này.</Typography>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }} role="img" aria-label="Biểu đồ doanh thu theo sản phẩm">
      <Typography variant="h6" sx={{ mb: 3 }}>Doanh thu theo sản phẩm</Typography>

      <ResponsiveContainer width="100%" height={300} minHeight={220}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid stroke={theme.palette.divider} strokeOpacity={0.6} horizontal={false} />
          <XAxis type="number" tickFormatter={formatCurrency} stroke={theme.palette.text.secondary} style={{ fontSize: '0.75rem' }} />
          <YAxis type="category" dataKey="productName" stroke={theme.palette.text.secondary} style={{ fontSize: '0.75rem' }} width={120} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: theme.shape.borderRadius }}
          />
          <Bar dataKey="revenue" fill={theme.palette.primary.main} name="Doanh thu" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}
