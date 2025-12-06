// Revenue by Day/Month chart component
import { useState } from 'react'
import { Box, Paper, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { RevenueData } from '../../../types/admin'

interface RevenueByDayMonthProps {
  dailyData: RevenueData[]
  monthlyData: RevenueData[]
}

export default function RevenueByDayMonth({ dailyData, monthlyData }: RevenueByDayMonthProps) {
  const [view, setView] = useState<'daily' | 'monthly'>('daily')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      notation: 'compact',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (view === 'daily') {
      const date = new Date(dateString)
      return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
    }
    return dateString
  }

  const data = view === 'daily' ? dailyData : monthlyData

  return (
    <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #EFEDE6' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F', fontWeight: 600 }}>
          Revenue by {view === 'daily' ? 'Day' : 'Month'}
        </Typography>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, newView) => newView && setView(newView)}
          size="small"
        >
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <ResponsiveContainer width="100%" height={300}>
        {view === 'daily' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DD" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#7A6F63"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="#7A6F63"
              style={{ fontSize: '0.75rem' }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Date: ${formatDate(label)}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #EFEDE6',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#C59B72"
              strokeWidth={2}
              name="Revenue"
              dot={{ fill: '#C59B72', r: 4 }}
            />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DD" />
            <XAxis
              dataKey="date"
              stroke="#7A6F63"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="#7A6F63"
              style={{ fontSize: '0.75rem' }}
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
            <Bar dataKey="revenue" fill="#C59B72" name="Revenue" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Paper>
  )
}

