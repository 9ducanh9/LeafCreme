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
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
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
import { useAuth } from '../../contexts/AuthContext'

const DRAWER_WIDTH = 280

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: 'Sản phẩm', icon: <InventoryIcon />, path: '/admin/products' },
  { text: 'Hộp quà', icon: <CardGiftcardIcon />, path: '/admin/gift-boxes' },
  { text: 'Tồn kho', icon: <WarehouseIcon />, path: '/admin/inventory' },
  { text: 'Nhập lô', icon: <QrCodeScannerIcon />, path: '/admin/batches' },
  { text: 'Mã giảm giá', icon: <LocalOfferIcon />, path: '/admin/vouchers' },
  { text: 'Đặt trước', icon: <EventNoteIcon />, path: '/admin/preorders' },
  { text: 'Bán hàng', icon: <PointOfSaleIcon />, path: '/admin/sales' },
]

export default function AdminLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
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
    <Box>
      <Toolbar
        sx={{
          bgcolor: '#C59B72',
          color: 'white',
          minHeight: '64px !important',
        }}
      >
        <Typography variant="h6" noWrap component="div" sx={{ fontFamily: 'Playfair Display, serif' }}>
          Leaf Crème Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/admin/dashboard' && location.pathname === '/admin')
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: '#F5C96A',
                    color: '#473C2F',
                    '&:hover': {
                      bgcolor: '#F5C96A',
                    },
                    '& .MuiListItemIcon-root': {
                      color: '#473C2F',
                    },
                  },
                  '&:hover': {
                    bgcolor: '#FAFAF7',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? '#473C2F' : '#7A6F63',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#FAFAF7' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'white',
          color: '#473C2F',
          boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: '#473C2F' }}>
            {menuItems.find((item) => item.path === location.pathname)?.text || 'Bảng điều khiển'}
          </Typography>
          <IconButton
            onClick={() => navigate('/')}
            sx={{
              color: '#7A6F63',
              mr: 2,
              '&:hover': {
                bgcolor: '#FAFAF7',
                color: '#C59B72',
              },
            }}
            title="Về trang chủ"
          >
            <HomeIcon />
          </IconButton>
          {user && (
            <Typography variant="body2" sx={{ color: '#7A6F63' }}>
              {user.ho_ten}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '1px solid #EFEDE6',
            },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '1px solid #EFEDE6',
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
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
          bgcolor: '#FAFAF7',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}

