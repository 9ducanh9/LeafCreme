import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import { getExpiringBatches, type ExpiringBatchItem } from '../../../services/admin/batchService'
import { getOrders } from '../../../services/admin/adminOrderService'
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '../../../config/orderLabels'
import type { Order } from '../../../types/admin'

// "Cần xử lý hôm nay": việc đầu tiên chủ bakery mở admin để làm — lô sắp
// hết hạn (FEFO) và đơn đặt trước cần chuẩn bị hôm nay. Đặt trên các chart
// doanh thu (thứ xem một lần mỗi tuần) vì đây là thứ xem mỗi sáng.
type ExpiringKind = 'products' | 'components' | 'gift_boxes'
interface ExpiringRow extends ExpiringBatchItem { kind: ExpiringKind }

const KIND_LABEL: Record<ExpiringKind, string> = { products: 'Sản phẩm', components: 'Linh kiện', gift_boxes: 'Hộp quà' }

function daysLeft(dateStr: string): number {
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

export default function TodayActionsWidget() {
  const [expiring, setExpiring] = useState<ExpiringRow[] | null>(null)
  const [expiringError, setExpiringError] = useState(false)
  const [preorders, setPreorders] = useState<Order[] | null>(null)
  const [preorderError, setPreorderError] = useState(false)

  useEffect(() => {
    let active = true
    getExpiringBatches(2)
      .then((data) => {
        if (!active) return
        const rows: ExpiringRow[] = [
          ...data.products.map((item) => ({ ...item, kind: 'products' as const })),
          ...data.components.map((item) => ({ ...item, kind: 'components' as const })),
          ...data.gift_boxes.map((item) => ({ ...item, kind: 'gift_boxes' as const })),
        ].sort((a, b) => a.ngay_het_han.localeCompare(b.ngay_het_han))
        setExpiring(rows)
      })
      .catch(() => { if (active) setExpiringError(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getOrders({ orderType: 'dat_truoc', sort_by: 'ngay_giao_du_kien', sort_dir: 'asc', limit: 50 })
      .then((page) => {
        if (!active) return
        setPreorders(page.items.filter((order) =>
          order.expectedDate && isToday(order.expectedDate) && order.status !== 'da_huy' && order.status !== 'hoan_thanh'
        ))
      })
      .catch(() => { if (active) setPreorderError(true) })
    return () => { active = false }
  }, [])

  const loaded = expiring !== null && preorders !== null
  const isEmpty = loaded && !expiringError && !preorderError && expiring!.length === 0 && preorders!.length === 0
  if (!loaded && !expiringError && !preorderError) return null // widget riêng, không chặn phần còn lại của dashboard

  return (
    <Card variant="outlined" sx={{ mb: 3, borderColor: isEmpty ? 'divider' : 'warning.main' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Cần xử lý hôm nay</Typography>
        {isEmpty && <Typography variant="body2" color="text.secondary">Không có lô sắp hết hạn hay đơn cần chuẩn bị hôm nay.</Typography>}

        {!isEmpty && (
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {expiringError ? (
              <Typography variant="body2" color="error">Không tải được lô sắp hết hạn.</Typography>
            ) : expiring!.length > 0 && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <ReportProblemIcon fontSize="small" color="warning" />
                  <Typography variant="body2" fontWeight={600}>Lô sắp hết hạn (trong 2 ngày)</Typography>
                </Stack>
                <Stack spacing={0.75}>
                  {expiring!.slice(0, 6).map((row) => {
                    const left = daysLeft(row.ngay_het_han)
                    return (
                      <Stack key={`${row.kind}-${row.lohang_id}`} direction="row" spacing={1} alignItems="center" justifyContent="space-between" component={Link} to="/admin/inventory" sx={{ textDecoration: 'none', color: 'inherit', py: 0.25, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: '1 1 auto' }}>
                          <Chip size="small" variant="outlined" label={KIND_LABEL[row.kind]} sx={{ flexShrink: 0, display: { xs: 'none', sm: 'inline-flex' } }} />
                          <Typography variant="body2" noWrap sx={{ minWidth: 0, flex: '1 1 auto' }}>{row.ten}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0, display: { xs: 'none', sm: 'inline' } }}>({row.ma_lo})</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                          <Typography variant="caption" color="text.secondary">còn {row.so_luong_hien_tai}</Typography>
                          <Chip size="small" color={left <= 0 ? 'error' : 'warning'} label={left <= 0 ? 'Hôm nay' : `${left} ngày`} />
                        </Stack>
                      </Stack>
                    )
                  })}
                </Stack>
              </Box>
            )}

            {preorderError ? (
              <Typography variant="body2" color="error">Không tải được đơn cần chuẩn bị hôm nay.</Typography>
            ) : preorders!.length > 0 && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <EventAvailableIcon fontSize="small" color="info" />
                  <Typography variant="body2" fontWeight={600}>Đơn đặt trước cần chuẩn bị hôm nay</Typography>
                </Stack>
                <Stack spacing={0.75}>
                  {preorders!.slice(0, 6).map((order) => (
                    <Stack key={order.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between" component={Link} to={`/admin/orders/${order.id}`} sx={{ textDecoration: 'none', color: 'inherit', py: 0.25, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{order.orderCode} — {order.customerName}</Typography>
                      <Chip size="small" color={ORDER_STATUS_COLOR[order.status]} label={ORDER_STATUS_LABEL[order.status]} sx={{ flexShrink: 0 }} />
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
