// Revenue by Product chart component
import { Paper, Typography, Box } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ProductRevenue } from '../../../types/admin'

interface RevenueByProductProps {
  data: ProductRevenue[]
}

export default function RevenueByProduct({ data }: RevenueByProductProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      notation: 'compact',
    }).format(value)
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #EFEDE6' }}>
      <Typography variant="h6" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F', fontWeight: 600, mb: 3 }}>
        Revenue by Product
      </Typography>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DD" />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            stroke="#7A6F63"
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis
            type="category"
            dataKey="productName"
            stroke="#7A6F63"
            style={{ fontSize: '0.75rem' }}
            width={120}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #EFEDE6',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar dataKey="revenue" fill="#C59B72" name="Revenue" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}

