// Admin Alerts Page - Quản lý cảnh báo tồn kho
import { useState, useEffect, useCallback } from 'react'
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
  Chip,
  CircularProgress,
  Alert as MuiAlert,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InventoryIcon from '@mui/icons-material/Inventory'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import ErrorIcon from '@mui/icons-material/Error'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import {
  getAlerts,
  getAlertsSummary,
  generateAlerts,
  updateAlert,
  deleteAlert,
  clearResolvedAlerts,
  Alert,
  AlertSummary,
  getAlertTypeLabel,
  getSeverityLabel,
  getStatusLabel,
  getBatchTypeLabel,
} from '../../services/admin/alertService'

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Filters
  const [filterType, setFilterType] = useState<string>('')
  const [filterSeverity, setFilterSeverity] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('chua_xu_ly')
  
  // Dialog states
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [alertsData, summaryData] = await Promise.all([
        getAlerts({
          loai_canh_bao: filterType || undefined,
          muc_do: filterSeverity || undefined,
          trang_thai: filterStatus || undefined,
        }),
        getAlertsSummary(),
      ])
      setAlerts(alertsData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Error loading alerts:', err)
      setError('Không thể tải dữ liệu cảnh báo')
    } finally {
      setLoading(false)
    }
  }, [filterType, filterSeverity, filterStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleGenerateAlerts = async () => {
    setGenerating(true)
    setError(null)
    try {
      const result = await generateAlerts(10, 7)
      setSuccessMessage(
        `Đã tạo ${result.total_created} cảnh báo mới: ${result.low_stock_created} tồn kho thấp, ${result.expiring_created} sắp hết hạn, ${result.expired_created} đã hết hạn`
      )
      await loadData()
    } catch (err) {
      console.error('Error generating alerts:', err)
      setError('Không thể tạo cảnh báo tự động')
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdateStatus = async (alert: Alert, newStatus: 'da_xu_ly' | 'bo_qua' | 'dang_xu_ly') => {
    try {
      await updateAlert(alert.canhbao_id, { trang_thai: newStatus })
      await loadData()
      setSuccessMessage(`Đã cập nhật trạng thái cảnh báo`)
    } catch (err) {
      console.error('Error updating alert:', err)
      setError('Không thể cập nhật trạng thái')
    }
  }


  const handleDeleteAlert = async (alertId: number) => {
    try {
      await deleteAlert(alertId)
      await loadData()
      setSuccessMessage('Đã xóa cảnh báo')
    } catch (err) {
      console.error('Error deleting alert:', err)
      setError('Không thể xóa cảnh báo')
    }
  }

  const handleClearResolved = async () => {
    try {
      const result = await clearResolvedAlerts()
      setConfirmClearOpen(false)
      await loadData()
      setSuccessMessage(`Đã xóa ${result.deleted_count} cảnh báo đã xử lý`)
    } catch (err) {
      console.error('Error clearing alerts:', err)
      setError('Không thể xóa cảnh báo')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'cao': return 'error'
      case 'binh_thuong': return 'warning'
      case 'thap': return 'info'
      default: return 'default'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ton_kho_thap': return <InventoryIcon fontSize="small" />
      case 'sap_het_han': return <WarningAmberIcon fontSize="small" />
      case 'het_han':
      case 'qua_han': return <EventBusyIcon fontSize="small" />
      default: return <ErrorIcon fontSize="small" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'chua_xu_ly': return 'error'
      case 'dang_xu_ly': return 'warning'
      case 'da_xu_ly': return 'success'
      case 'bo_qua': return 'default'
      default: return 'default'
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
          Cảnh báo tồn kho
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            sx={{ borderColor: '#C59B72', color: '#C59B72' }}
          >
            Làm mới
          </Button>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <AutorenewIcon />}
            onClick={handleGenerateAlerts}
            disabled={generating}
            sx={{ bgcolor: '#C59B72', '&:hover': { bgcolor: '#A67B5B' } }}
          >
            {generating ? 'Đang tạo...' : 'Tạo cảnh báo tự động'}
          </Button>
        </Box>
      </Box>

      {/* Messages */}
      {error && (
        <MuiAlert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </MuiAlert>
      )}
      {successMessage && (
        <MuiAlert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </MuiAlert>
      )}

      {/* Summary Cards */}
      {summary && (
        <Box
          sx={{
            mb: 3,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <Card sx={{ bgcolor: '#FFF3E0', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Ch??a x??? l??</Typography>
              <Typography variant="h4" sx={{ color: '#E65100', fontWeight: 700 }}>
                {summary.pending}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: '#FFF8E1', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">??ang x??? l??</Typography>
              <Typography variant="h4" sx={{ color: '#F57F17', fontWeight: 700 }}>
                {summary.processing}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: '#E8F5E9', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">???? x??? l??</Typography>
              <Typography variant="h4" sx={{ color: '#2E7D32', fontWeight: 700 }}>
                {summary.resolved}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: '#F5F5F5', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">T???ng c???ng</Typography>
              <Typography variant="h4" sx={{ color: '#616161', fontWeight: 700 }}>
                {summary.total}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Loại cảnh báo</InputLabel>
          <Select
            value={filterType}
            label="Loại cảnh báo"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="ton_kho_thap">Tồn kho thấp</MenuItem>
            <MenuItem value="sap_het_han">Sắp hết hạn</MenuItem>
            <MenuItem value="het_han">Đã hết hạn</MenuItem>
            <MenuItem value="qua_han">Quá hạn</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Mức độ</InputLabel>
          <Select
            value={filterSeverity}
            label="Mức độ"
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="cao">Cao</MenuItem>
            <MenuItem value="binh_thuong">Bình thường</MenuItem>
            <MenuItem value="thap">Thấp</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Trạng thái</InputLabel>
          <Select
            value={filterStatus}
            label="Trạng thái"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="chua_xu_ly">Chưa xử lý</MenuItem>
            <MenuItem value="dang_xu_ly">Đang xử lý</MenuItem>
            <MenuItem value="da_xu_ly">Đã xử lý</MenuItem>
            <MenuItem value="bo_qua">Bỏ qua</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={() => setConfirmClearOpen(true)}
          disabled={!summary || summary.resolved === 0}
        >
          Xóa cảnh báo đã xử lý
        </Button>
      </Paper>

      {/* Alerts Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress sx={{ color: '#C59B72' }} />
        </Box>
      ) : (
        <TableContainer 
          component={Paper}
          sx={{ 
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F7F6F3' }}>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63' }}>Loại</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63' }}>Sản phẩm / Lô</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63' }} align="center">Tồn kho</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63' }} align="center">Hết hạn</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63' }} align="center">Mức độ</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63' }} align="center">Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63' }} align="center">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      Không có cảnh báo nào
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow key={alert.canhbao_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTypeIcon(alert.loai_canh_bao)}
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {getAlertTypeLabel(alert.loai_canh_bao)}
                          </Typography>
                          {alert.loai_lohang && (
                            <Typography variant="caption" color="text.secondary">
                              {getBatchTypeLabel(alert.loai_lohang)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {alert.ten_san_pham || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {alert.ma_lo || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        color={alert.so_luong_hien_tai && alert.so_luong_hien_tai <= 5 ? 'error.main' : 'inherit'}
                      >
                        {alert.so_luong_hien_tai ?? '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatDate(alert.ngay_het_han)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={getSeverityLabel(alert.muc_do_nghiem_trong)}
                        color={getSeverityColor(alert.muc_do_nghiem_trong) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={getStatusLabel(alert.trang_thai)}
                        color={getStatusColor(alert.trang_thai) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {alert.trang_thai === 'chua_xu_ly' && (
                          <>
                            <Tooltip title="Đánh dấu đang xử lý">
                              <IconButton 
                                size="small" 
                                onClick={() => handleUpdateStatus(alert, 'dang_xu_ly')}
                                sx={{ color: '#F57F17' }}
                              >
                                <AutorenewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Đánh dấu đã xử lý">
                              <IconButton 
                                size="small" 
                                onClick={() => handleUpdateStatus(alert, 'da_xu_ly')}
                                sx={{ color: '#2E7D32' }}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Bỏ qua">
                              <IconButton 
                                size="small" 
                                onClick={() => handleUpdateStatus(alert, 'bo_qua')}
                                color="default"
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {alert.trang_thai === 'dang_xu_ly' && (
                          <Tooltip title="Đánh dấu đã xử lý">
                            <IconButton 
                              size="small" 
                              onClick={() => handleUpdateStatus(alert, 'da_xu_ly')}
                              sx={{ color: '#2E7D32' }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Xóa">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteAlert(alert.canhbao_id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirm Clear Dialog */}
      <Dialog open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc muốn xóa tất cả cảnh báo đã xử lý ({summary?.resolved || 0} cảnh báo)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)}>Hủy</Button>
          <Button onClick={handleClearResolved} color="error" variant="contained">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

