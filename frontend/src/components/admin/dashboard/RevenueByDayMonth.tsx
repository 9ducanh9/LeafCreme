// Revenue by Day/Month chart component
import { useState } from 'react'
import { Box, Paper, Typography, ToggleButton, ToggleButtonGroup, useTheme } from '@mui/material'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { RevenueData } from '../../../types/admin'

interface RevenueByDayMonthProps {
  dailyData: RevenueData[]
  monthlyData: RevenueData[]
}

export default function RevenueByDayMonth({ dailyData, monthlyData }: RevenueByDayMonthProps) {
  const theme = useTheme()
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
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
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
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '0.75rem' }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Date: ${formatDate(label)}`}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: theme.shape.borderRadius,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              name="Revenue"
              dot={{ fill: theme.palette.primary.main, r: 4 }}
            />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis
              dataKey="date"
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '0.75rem' }}
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
            <Bar dataKey="revenue" fill={theme.palette.primary.main} name="Revenue" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Paper>
  )
}

