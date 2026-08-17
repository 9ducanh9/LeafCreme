import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  AppBar, Avatar, Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  ThemeProvider, Toolbar, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import { adminTheme } from '../../theme/adminTheme'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import InventoryIcon from '@mui/icons-material/Inventory'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import SettingsIcon from '@mui/icons-material/Settings'
import HomeIcon from '@mui/icons-material/Home'
import { useAuth } from '../../contexts/AuthContext'
import { getImageUrl } from '../../utils/getImageUrl'
import { adminNavGroups, type AdminNavItem } from '../../config/admin-nav'

const DRAWER_WIDTH = 280
const DRAWER_WIDTH_COLLAPSED = 72

const iconFor = (kind: AdminNavItem['icon']) => {
  if (kind === 'overview') return <DashboardIcon />
  if (kind === 'warehouse') return <WarehouseIcon />
  if (kind === 'operations') return <QrCodeScannerIcon />
  if (kind === 'sales') return <PointOfSaleIcon />
  if (kind === 'settings') return <SettingsIcon />
  return <InventoryIcon />
}

export default function AdminLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(() => localStorage.getItem('admin-sidebar-expanded') !== 'false')
  useEffect(() => { localStorage.setItem('admin-sidebar-expanded', String(sidebarExpanded)) }, [sidebarExpanded])

  const currentItem = useMemo(
    () => adminNavGroups.flatMap((group) => group.items).find((item) => location.pathname === item.path),
    [location.pathname],
  )
  const expanded = isMobile || sidebarExpanded
  const currentDrawerWidth = sidebarExpanded ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ minHeight: 72, display: 'flex', alignItems: 'center', px: expanded ? 3 : 2, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Avatar src={user?.avatar_url ? getImageUrl(user.avatar_url) : undefined} alt={user?.ho_ten || 'Quản trị viên'} sx={{ width: 36, height: 36 }}>
          {!user?.avatar_url && (user?.ho_ten?.charAt(0).toUpperCase() || 'L')}
        </Avatar>
        {expanded && <Box sx={{ ml: 2, overflow: 'hidden' }}><Typography fontWeight={700} noWrap>Leaf Creme</Typography><Typography variant="caption" color="text.secondary" noWrap>Cổng quản trị</Typography></Box>}
      </Box>
      {!isMobile && <IconButton aria-label={sidebarExpanded ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'} aria-expanded={sidebarExpanded} onClick={() => setSidebarExpanded((value) => !value)} sx={{ alignSelf: expanded ? 'flex-end' : 'center', m: 1 }}><MenuIcon /></IconButton>}
      <List sx={{ pt: 1, px: 1, flexGrow: 1 }}>
        {adminNavGroups.map((group) => <Box key={group.label} component="li" sx={{ listStyle: 'none' }}>
          {expanded && <Typography variant="overline" color="text.secondary" sx={{ px: 2, display: 'block', mt: 1 }}>{group.label}</Typography>}
          {group.items.map((item) => {
            const isActive = location.pathname === item.path || (item.key === 'overview' && location.pathname === '/admin')
            return <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton component={Link} to={item.path} aria-current={isActive ? 'page' : undefined} selected={isActive} onClick={() => isMobile && setMobileOpen(false)} sx={{ minHeight: 46, justifyContent: expanded ? 'initial' : 'center', px: expanded ? 2 : 0, borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 0, mr: expanded ? 2 : 0, justifyContent: 'center' }}>{iconFor(item.icon)}</ListItemIcon>
                {expanded && <ListItemText primary={item.label} />}
              </ListItemButton>
            </ListItem>
          })}
        </Box>)}
      </List>
    </Box>
  )

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ width: { xs: '100%', md: `calc(100% - ${currentDrawerWidth}px)` }, ml: { md: `${currentDrawerWidth}px` } }}>
        <Toolbar>
          <IconButton color="inherit" aria-label="Mở menu" edge="start" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' }, mr: 2 }}><MenuIcon /></IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{currentItem?.label || 'Tổng quan'}</Typography>
          <IconButton component={Link} to="/" color="inherit" aria-label="Về trang chủ"><HomeIcon /></IconButton>
          {user && <Avatar src={user.avatar_url ? getImageUrl(user.avatar_url) : undefined} alt={user.ho_ten} sx={{ ml: 1, width: 32, height: 32 }}>{!user.avatar_url && user.ho_ten.charAt(0).toUpperCase()}</Avatar>}
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: currentDrawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>{drawer}</Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: currentDrawerWidth, overflowX: 'hidden', transition: 'width .15s' } }}>{drawer}</Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8, width: { xs: '100%', md: `calc(100% - ${currentDrawerWidth}px)` } }}><Outlet /></Box>
      </Box>
    </ThemeProvider>
  )
}
