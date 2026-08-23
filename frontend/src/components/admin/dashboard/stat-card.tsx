import type { ReactNode } from 'react'
import { Card, CardActionArea, CardContent, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  onClick?: () => void
  /** Trang đích khi bấm — con số phải hành động được, không chỉ để đọc. */
  href?: string
}

export default function StatCard({ label, value, icon, onClick, href }: StatCardProps) {
  const content = <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><BoxLabel label={label} value={value} />{icon}</CardContent>
  if (href) {
    return <Card><CardActionArea component={Link} to={href} sx={{ height: '100%' }}>{content}</CardActionArea></Card>
  }
  return <Card onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>{content}</Card>
}

function BoxLabel({ label, value }: Pick<StatCardProps, 'label' | 'value'>) {
  return <span><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={700}>{value}</Typography></span>
}
