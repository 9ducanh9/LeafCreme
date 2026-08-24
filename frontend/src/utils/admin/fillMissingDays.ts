/**
 * Bơm lại những ngày không có doanh thu vào chuỗi báo cáo.
 *
 * `/reports/sales` chỉ trả về ngày CÓ phát sinh. Đó là hợp lý cho một API
 * báo cáo, nhưng biểu đồ đường thì không: thiếu ngày làm recharts nối
 * thẳng ngày trước sang ngày sau, nên "bán được 0 đồng" trông giống hệt
 * "ngày đó không tồn tại", và trục hoành nuốt mất một ô mà không báo gì.
 * Với chủ tiệm, một ngày doanh thu bằng 0 là thông tin cần thấy.
 *
 * Hàm này chỉ thêm các ngày còn thiếu với giá trị 0 và sắp xếp lại tăng
 * dần; không sửa, không bỏ giá trị nào đã có.
 */

export interface DayPoint {
  date: string
  revenue: number
}

const DAY_MS = 86_400_000

/** 'YYYY-MM-DD' theo giờ địa phương — tránh lệch múi giờ của toISOString(). */
function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(key)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function fillMissingDays(rows: DayPoint[], fromDate: string, toDate: string): DayPoint[] {
  const start = parseKey(fromDate)
  const end = parseKey(toDate)
  if (!start || !end || start > end) return [...rows].sort((a, b) => a.date.localeCompare(b.date))

  // Ngày trùng nhau thì cộng dồn thay vì để dòng sau đè dòng trước.
  const known = new Map<string, number>()
  for (const row of rows) {
    const parsed = parseKey(row.date)
    if (!parsed) continue
    const key = toKey(parsed)
    known.set(key, (known.get(key) ?? 0) + (Number(row.revenue) || 0))
  }

  const filled: DayPoint[] = []
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const key = toKey(new Date(t))
    filled.push({ date: key, revenue: known.get(key) ?? 0 })
  }
  return filled
}
