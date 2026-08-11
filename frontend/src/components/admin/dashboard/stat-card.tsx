import type { ReactNode } from 'react'
import { Card, CardContent, Typography } from '@mui/material'

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  onClick?: () => void
}

export default function StatCard({ label, value, icon, onClick }: StatCardProps) {
  return <Card onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}><CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><BoxLabel label={label} value={value} />{icon}</CardContent></Card>
}

function BoxLabel({ label, value }: Pick<StatCardProps, 'label' | 'value'>) {
  return <span><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={700}>{value}</Typography></span>
}
