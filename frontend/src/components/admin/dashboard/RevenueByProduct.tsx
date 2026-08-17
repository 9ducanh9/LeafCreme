// Revenue by Product chart component
import { Paper, Typography, useTheme } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ProductRevenue } from '../../../types/admin'

interface RevenueByProductProps {
  data: ProductRevenue[]
}

export default function RevenueByProduct({ data }: RevenueByProductProps) {
  const theme = useTheme()
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      notation: 'compact',
    }).format(value)
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Revenue by Product
      </Typography>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis
            type="category"
            dataKey="productName"
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.75rem' }}
            width={120}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius,
            }}
          />
          <Legend />
          <Bar dataKey="revenue" fill={theme.palette.primary.main} name="Revenue" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}

