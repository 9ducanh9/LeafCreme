// Admin Inventory Page - Quản lý tồn kho
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import {
  getProductInventory,
  getComponentInventory,
  getGiftBoxInventory,
  ProductInventoryItem,
  ComponentInventoryItem,
  GiftBoxInventoryItem,
} from '../../services/admin/inventoryService'
import { formatPrice } from '../../utils/formatPrice'

type TabValue = 'products' | 'components' | 'gift-boxes'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [productInventory, setProductInventory] = useState<ProductInventoryItem[]>([])
  const [componentInventory, setComponentInventory] = useState<ComponentInventoryItem[]>([])
  const [giftBoxInventory, setGiftBoxInventory] = useState<GiftBoxInventoryItem[]>([])

  useEffect(() => {
    loadInventory()
  }, [activeTab])

  const loadInventory = async () => {
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 0) {
        const data = await getProductInventory()
        setProductInventory(data)
      } else if (activeTab === 1) {
        const data = await getComponentInventory()
        setComponentInventory(data)
      } else if (activeTab === 2) {
        const data = await getGiftBoxInventory()
        setGiftBoxInventory(data)
      }
    } catch (err: any) {
      console.error('Error loading inventory:', err)
      // Kiểm tra nếu là lỗi CORS hoặc network
      if (err.detail?.includes('CORS') || err.detail?.includes('fetch') || err.error === 'Network error') {
        setError('Lỗi kết nối: Vui lòng kiểm tra backend server đang chạy và CORS đã được cấu hình đúng')
      } else if (err.status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      } else {
        setError(err.error || err.detail || 'Không thể tải dữ liệu tồn kho')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getFilteredProducts = () => {
    if (!search) return productInventory
    const lowerSearch = search.toLowerCase()
    return productInventory.filter(
      (item) =>
        item.ma_lo.toLowerCase().includes(lowerSearch) ||
        (item.ten_sanpham || '').toLowerCase().includes(lowerSearch) ||
        item.huong_vi.toLowerCase().includes(lowerSearch) ||
        (item.kich_thuoc || '').toLowerCase().includes(lowerSearch)
    )
  }

  const getFilteredComponents = () => {
    if (!search) return componentInventory
    const lowerSearch = search.toLowerCase()
    return componentInventory.filter(
      (item) =>
        item.ma_lo.toLowerCase().includes(lowerSearch) ||
        item.ten_linh_kien.toLowerCase().includes(lowerSearch)
    )
  }

  const getFilteredGiftBoxes = () => {
    if (!search) return giftBoxInventory
    const lowerSearch = search.toLowerCase()
    return giftBoxInventory.filter(
      (item) =>
        item.ma_lo.toLowerCase().includes(lowerSearch) ||
        item.ten_hop_qua.toLowerCase().includes(lowerSearch)
    )
  }

  const getTotalStock = (items: (ProductInventoryItem | ComponentInventoryItem | GiftBoxInventoryItem)[]) => {
    return items.reduce((sum, item) => sum + (item.so_luong_hien_tai || 0), 0)
  }

  const getLowStockItems = (items: (ProductInventoryItem | ComponentInventoryItem | GiftBoxInventoryItem)[], threshold: number = 10) => {
    return items.filter((item) => item.so_luong_hien_tai < threshold)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
          Quản lý tồn kho
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue)
            setSearch('')
          }}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontFamily: 'Playfair Display, serif',
              fontSize: '1rem',
            },
          }}
        >
          <Tab label="Sản phẩm" />
          <Tab label="Linh kiện" />
          <Tab label="Hộp quà" />
        </Tabs>

        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm theo mã lô hoặc tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#7A6F63' }} />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, maxWidth: 400 }}
          />
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: '#C59B72' }} />
        </Box>
      ) : (
        <>
          {/* Products Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`Tổng tồn kho: ${getTotalStock(getFilteredProducts()).toLocaleString()}`}
                color="primary"
                sx={{ bgcolor: '#C59B72', color: 'white' }}
              />
              {getLowStockItems(getFilteredProducts()).length > 0 && (
                <Chip
                  label={`Sắp hết hàng: ${getLowStockItems(getFilteredProducts()).length}`}
                  color="warning"
                />
              )}
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FAFAF7' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Mã lô</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Sản phẩm</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Hương vị</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Size</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
                      Tồn kho
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
                      Đã bán
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Hết hạn</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredProducts().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#7A6F63' }}>
                        {search ? 'Không tìm thấy kết quả' : 'Không có dữ liệu tồn kho'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredProducts().map((item) => (
                      <TableRow
                        key={item.lohang_id}
                        sx={{
                          '&:hover': { bgcolor: '#FAFAF7' },
                        }}
                      >
                        <TableCell>{item.ma_lo}</TableCell>
                        <TableCell>{item.ten_sanpham || 'N/A'}</TableCell>
                        <TableCell>{item.huong_vi}</TableCell>
                        <TableCell>{item.kich_thuoc || 'N/A'}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={item.so_luong_hien_tai.toLocaleString()}
                            size="small"
                            color={item.so_luong_hien_tai < 10 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">{item.so_luong_da_ban.toLocaleString()}</TableCell>
                        <TableCell>{formatDate(item.ngay_het_han)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Components Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`Tổng tồn kho: ${getTotalStock(getFilteredComponents()).toLocaleString()}`}
                color="primary"
                sx={{ bgcolor: '#C59B72', color: 'white' }}
              />
              {getLowStockItems(getFilteredComponents()).length > 0 && (
                <Chip
                  label={`Sắp hết hàng: ${getLowStockItems(getFilteredComponents()).length}`}
                  color="warning"
                />
              )}
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FAFAF7' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Mã lô</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Tên linh kiện</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
                      Tồn kho
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
                      Đã sử dụng
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Hết hạn</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredComponents().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#7A6F63' }}>
                        {search ? 'Không tìm thấy kết quả' : 'Không có dữ liệu tồn kho'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredComponents().map((item) => (
                      <TableRow
                        key={item.lohang_id}
                        sx={{
                          '&:hover': { bgcolor: '#FAFAF7' },
                        }}
                      >
                        <TableCell>{item.ma_lo}</TableCell>
                        <TableCell>{item.ten_linh_kien}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={item.so_luong_hien_tai.toLocaleString()}
                            size="small"
                            color={item.so_luong_hien_tai < 10 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">{item.so_luong_da_su_dung.toLocaleString()}</TableCell>
                        <TableCell>{formatDate(item.ngay_het_han)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Gift Boxes Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`Tổng tồn kho: ${getTotalStock(getFilteredGiftBoxes()).toLocaleString()}`}
                color="primary"
                sx={{ bgcolor: '#C59B72', color: 'white' }}
              />
              {getLowStockItems(getFilteredGiftBoxes()).length > 0 && (
                <Chip
                  label={`Sắp hết hàng: ${getLowStockItems(getFilteredGiftBoxes()).length}`}
                  color="warning"
                />
              )}
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FAFAF7' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Mã lô</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Tên hộp quà</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
                      Tồn kho
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
                      Đã bán
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Hết hạn</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredGiftBoxes().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#7A6F63' }}>
                        {search ? 'Không tìm thấy kết quả' : 'Không có dữ liệu tồn kho'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredGiftBoxes().map((item) => (
                      <TableRow
                        key={item.lohang_id}
                        sx={{
                          '&:hover': { bgcolor: '#FAFAF7' },
                        }}
                      >
                        <TableCell>{item.ma_lo}</TableCell>
                        <TableCell>{item.ten_hop_qua}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={item.so_luong_hien_tai.toLocaleString()}
                            size="small"
                            color={item.so_luong_hien_tai < 10 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">{item.so_luong_da_ban.toLocaleString()}</TableCell>
                        <TableCell>{formatDate(item.ngay_het_han)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </>
      )}
    </Box>
  )
}

