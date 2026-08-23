import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

interface AdminPageProps {
  title: string
  breadcrumb?: Array<{ label: string; to?: string }>
  /** Nút hành động chính của trang (vd. "Thêm sản phẩm") — hiện cạnh tiêu đề. */
  actions?: React.ReactNode
  children: React.ReactNode
}

export default function AdminPage({ title, breadcrumb = [], actions, children }: AdminPageProps) {
  const location = useLocation()
  useEffect(() => { document.title = `${title} · Leaf Creme Admin` }, [title])
  return (
    <Box>
      <Breadcrumbs aria-label="Đường dẫn trang" sx={{ mb: 1 }}>
        <Link component={RouterLink} underline="hover" color="inherit" to="/admin">Tổng quan</Link>
        {breadcrumb.map((item) => item.to ? <Link key={item.label} component={RouterLink} underline="hover" color="inherit" to={item.to}>{item.label}</Link> : <Typography key={item.label} color="text.primary">{item.label}</Typography>)}
      </Breadcrumbs>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
        <Typography component="h1" variant="h4">{title}</Typography>
        {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
      </Stack>
      <Box data-admin-path={location.pathname}>{children}</Box>
    </Box>
  )
}
