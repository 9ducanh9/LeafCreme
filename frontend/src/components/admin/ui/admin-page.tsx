import { Box, Breadcrumbs, Link, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

interface AdminPageProps {
  title: string
  breadcrumb?: Array<{ label: string; to?: string }>
  children: React.ReactNode
}

export default function AdminPage({ title, breadcrumb = [], children }: AdminPageProps) {
  const location = useLocation()
  useEffect(() => { document.title = `${title} · Leaf Creme Admin` }, [title])
  return (
    <Box>
      <Breadcrumbs aria-label="Đường dẫn trang" sx={{ mb: 1 }}>
        <Link component={RouterLink} underline="hover" color="inherit" to="/admin">Tổng quan</Link>
        {breadcrumb.map((item) => item.to ? <Link key={item.label} component={RouterLink} underline="hover" color="inherit" to={item.to}>{item.label}</Link> : <Typography key={item.label} color="text.primary">{item.label}</Typography>)}
      </Breadcrumbs>
      <Typography component="h1" variant="h4" sx={{ mb: 2 }}>{title}</Typography>
      <Box data-admin-path={location.pathname}>{children}</Box>
    </Box>
  )
}
