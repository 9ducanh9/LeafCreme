import { Chip, Stack, Typography } from '@mui/material'

// Hiện cả ngày cụ thể (đối chiếu giấy tờ) và số ngày còn lại (quyết định
// nhanh) — chỉ có một trong hai thì phải tự tính nhẩm.
export default function ExpiryCell({ date }: { date: string | null | undefined }) {
  if (!date) return <Typography variant="body2" color="text.secondary">—</Typography>

  const target = new Date(date); target.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - today.getTime()) / 86400000)
  const tone = days < 0 ? 'error' : days <= 2 ? 'warning' : days <= 7 ? 'info' : 'default'
  const label = days < 0 ? `Quá ${-days} ngày` : days === 0 ? 'Hôm nay' : `${days} ngày`

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2">{new Date(date).toLocaleDateString('vi-VN')}</Typography>
      <Chip size="small" variant="outlined" color={tone === 'default' ? undefined : tone} label={label} />
    </Stack>
  )
}
