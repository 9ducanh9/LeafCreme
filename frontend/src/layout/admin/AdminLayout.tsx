// Admin Layout - sidebar + topbar layout for admin panel
import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import InventoryIcon from '@mui/icons-material/Inventory'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import EventNoteIcon from '@mui/icons-material/EventNote'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import HomeIcon from '@mui/icons-material/Home'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import { useAuth } from '../../contexts/AuthContext'
import { getImageUrl } from '../../utils/getImageUrl'

const DRAWER_WIDTH = 280
const DRAWER_WIDTH_COLLAPSED = 72

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: 'Sản phẩm', icon: <InventoryIcon />, path: '/admin/products' },
  { text: 'Hộp quà', icon: <CardGiftcardIcon />, path: '/admin/gift-boxes' },
  { text: 'Tồn kho', icon: <WarehouseIcon />, path: '/admin/inventory' },
  { text: 'Cảnh báo', icon: <NotificationsActiveIcon />, path: '/admin/alerts' },
  { text: 'Nhập lô', icon: <QrCodeScannerIcon />, path: '/admin/batches' },
  { text: 'Mã giảm giá', icon: <LocalOfferIcon />, path: '/admin/vouchers' },
  { text: 'Đơn hàng', icon: <EventNoteIcon />, path: '/admin/preorders' },
  { text: 'Bán hàng', icon: <PointOfSaleIcon />, path: '/admin/sales' },
]

export default function AdminLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const drawer = (
    <Box
      onMouseEnter={() => !isMobile && setSidebarExpanded(true)}
      onMouseLeave={() => !isMobile && setSidebarExpanded(false)}
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Modern Brand Area */}
      <Box
        sx={{
          minHeight: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarExpanded || isMobile ? 'flex-start' : 'center',
          px: sidebarExpanded || isMobile ? 3 : 2,
          py: 2,
          bgcolor: '#FAFAF9',
          borderBottom: '1px solid rgba(122, 111, 99, 0.08)',
          transition: 'all 0.15s ease-out',
        }}
      >
        {/* User Avatar - Always visible */}
        <Box sx={{ position: 'relative' }}>
          <Avatar
            src={user?.avatar_url ? getImageUrl(user.avatar_url) : undefined}
            alt={user?.ho_ten || 'Admin'}
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: '#C59B72',
              flexShrink: 0,
              mr: sidebarExpanded || isMobile ? 2 : 0,
              transition: 'margin 0.15s ease-out',
              boxShadow: '0 2px 6px rgba(197, 155, 114, 0.2)',
              fontSize: '1.125rem',
              fontWeight: 700,
            }}
          >
            {!user?.avatar_url && (user?.ho_ten?.charAt(0).toUpperCase() || 'L')}
          </Avatar>
          {/* Christmas Santa Hat */}
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              left: -4,
              width: 20,
              height: 20,
              transform: 'rotate(-25deg)',
              transition: 'all 0.15s ease-out',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Hat body */}
              <path d="M4 16 L12 4 L20 16 Z" fill="#DC2626" stroke="#FFF" strokeWidth="0.5"/>
              {/* White trim */}
              <ellipse cx="12" cy="16" rx="8" ry="1.5" fill="#FFF"/>
              {/* Pom-pom */}
              <circle cx="12" cy="3" r="2" fill="#FFF"/>
            </svg>
          </Box>
        </Box>

        {/* Brand Text - Show when expanded */}
        <Box
          sx={{
            opacity: sidebarExpanded || isMobile ? 1 : 0,
            width: sidebarExpanded || isMobile ? 'auto' : 0,
            overflow: 'hidden',
            transition: 'all 0.15s ease-out',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Playfair Display, serif',
              color: '#473C2F',
              fontWeight: 600,
              fontSize: '1.125rem',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
          >
            Leaf Creme
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#9B948B',
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              display: 'block',
              whiteSpace: 'nowrap',
            }}
          >
            Admin Portal
          </Typography>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ pt: 2, px: 1, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/admin/dashboard' && location.pathname === '/admin')
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: '12px',
                  minHeight: 48,
                  justifyContent: sidebarExpanded || isMobile ? 'initial' : 'center',
                  px: sidebarExpanded || isMobile ? 2.5 : 0,
                  py: 1.5,
                  mb: 0.5,
                  transition: 'all 0.15s ease-out',
                  position: 'relative',
                  '&::before': isActive ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '3px',
                    bgcolor: '#C59B72',
                    borderRadius: '0 2px 2px 0',
                  } : {},
                  '&.Mui-selected': {
                    bgcolor: 'rgba(197, 155, 114, 0.08)',
                    color: '#473C2F',
                    '&:hover': {
                      bgcolor: 'rgba(197, 155, 114, 0.12)',
                    },
                    '& .MuiListItemIcon-root': {
                      color: '#C59B72',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'rgba(122, 111, 99, 0.05)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: sidebarExpanded || isMobile ? 2 : 0,
                    justifyContent: 'center',
                    color: isActive ? '#C59B72' : '#7A6F63',
                    transition: 'all 0.15s ease-out',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    opacity: sidebarExpanded || isMobile ? 1 : 0,
                    width: sidebarExpanded || isMobile ? 'auto' : 0,
                    overflow: 'hidden',
                    transition: 'all 0.15s ease-out',
                  }}
                  primaryTypographyProps={{
                    fontSize: '0.9375rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#473C2F' : '#7A6F63',
                    whiteSpace: 'nowrap',
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  const currentDrawerWidth = sidebarExpanded ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#FAFAF7' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { 
            xs: '100%',
            md: `calc(100% - ${currentDrawerWidth}px)` 
          },
          ml: { md: `${currentDrawerWidth}px` },
          bgcolor: 'white',
          color: '#473C2F',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          borderBottom: '1px solid rgba(122, 111, 99, 0.06)',
          transition: 'all 0.15s ease-out',
        }}
      >
        <Toolbar sx={{ minHeight: '64px' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { md: 'none' },
              borderRadius: '10px',
              '&:hover': {
                bgcolor: 'rgba(122, 111, 99, 0.05)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              color: '#473C2F',
              fontWeight: 600,
              fontSize: '1.125rem',
            }}
          >
            {menuItems.find((item) => item.path === location.pathname)?.text || 'Bảng điều khiển'}
          </Typography>
          <IconButton
            onClick={() => navigate('/')}
            sx={{
              color: '#7A6F63',
              mr: 2,
              borderRadius: '10px',
              '&:hover': {
                bgcolor: 'rgba(197, 155, 114, 0.08)',
                color: '#C59B72',
              },
            }}
            title="Về trang chủ"
          >
            <HomeIcon />
          </IconButton>
          {user && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              px: 2,
              py: 1,
              bgcolor: 'rgba(197, 155, 114, 0.05)',
              borderRadius: '10px',
            }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={user.avatar_url ? getImageUrl(user.avatar_url) : undefined}
                  alt={user.ho_ten}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: '#C59B72',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                  }}
                >
                  {!user.avatar_url && user.ho_ten.charAt(0).toUpperCase()}
                </Avatar>
                {/* Christmas Santa Hat */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -6,
                    left: -3,
                    width: 18,
                    height: 18,
                    transform: 'rotate(-25deg)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Hat body */}
                    <path d="M4 16 L12 4 L20 16 Z" fill="#DC2626" stroke="#FFF" strokeWidth="0.5"/>
                    {/* White trim */}
                    <ellipse cx="12" cy="16" rx="8" ry="1.5" fill="#FFF"/>
                    {/* Pom-pom */}
                    <circle cx="12" cy="3" r="2" fill="#FFF"/>
                  </svg>
                </Box>
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#473C2F',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {user.ho_ten}
              </Typography>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ 
          width: { md: currentDrawerWidth }, 
          flexShrink: { md: 0 },
          transition: 'width 0.15s ease-out',
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: 'none',
              boxShadow: '4px 0 12px rgba(0,0,0,0.08)',
            },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer - Slim with expand on hover */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              borderRight: '1px solid rgba(122, 111, 99, 0.08)',
              bgcolor: '#FEFDFB',
              transition: 'width 0.15s ease-out',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { 
            xs: '100%',
            md: `calc(100% - ${currentDrawerWidth}px)` 
          },
          mt: '64px',
          bgcolor: '#FAFAF7',
          minHeight: 'calc(100vh - 64px)',
          transition: 'all 0.15s ease-out',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}

