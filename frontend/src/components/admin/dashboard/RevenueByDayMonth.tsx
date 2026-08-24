// Biểu đồ doanh thu theo ngày/tháng
import { Paper, Typography, useTheme } from '@mui/material'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RevenueData } from '../../../types/admin'

interface RevenueByDayMonthProps {
  data: RevenueData[]
  view: 'daily' | 'monthly'
}

export default function RevenueByDayMonth({ data, view }: RevenueByDayMonthProps) {
  const theme = useTheme()

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value)

  const formatDate = (dateString: string) =>
    view === 'daily' ? new Date(dateString).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }) : dateString

  if (data.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Doanh thu theo {view === 'daily' ? 'ngày' : 'tháng'}</Typography>
        <Typography color="text.secondary">Không có dữ liệu trong khoảng này.</Typography>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }} role="img" aria-label={`Biểu đồ doanh thu theo ${view === 'daily' ? 'ngày' : 'tháng'}`}>
      <Typography variant="h6" gutterBottom>Doanh thu theo {view === 'daily' ? 'ngày' : 'tháng'}</Typography>

      <ResponsiveContainer width="100%" height={300} minHeight={220}>
        {view === 'daily' ? (
          <LineChart data={data}>
            <CartesianGrid stroke={theme.palette.divider} strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke={theme.palette.text.secondary} style={{ fontSize: '0.75rem' }} />
            <YAxis tickFormatter={formatCurrency} stroke={theme.palette.text.secondary} style={{ fontSize: '0.75rem' }} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Ngày: ${formatDate(label)}`}
              contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: theme.shape.borderRadius }}
            />
            <Line type="monotone" dataKey="revenue" stroke={theme.palette.primary.main} strokeWidth={2} name="Doanh thu" dot={{ fill: theme.palette.primary.main, r: 4 }} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid stroke={theme.palette.divider} strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="date" stroke={theme.palette.text.secondary} style={{ fontSize: '0.75rem' }} />
            <YAxis tickFormatter={formatCurrency} stroke={theme.palette.text.secondary} style={{ fontSize: '0.75rem' }} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: theme.shape.borderRadius }}
            />
            <Bar dataKey="revenue" fill={theme.palette.primary.main} name="Doanh thu" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Paper>
  )
}
