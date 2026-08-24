import { describe, expect, it } from 'vitest'
import { fillMissingDays } from './fillMissingDays'

describe('fillMissingDays', () => {
  it('chèn ngày không có doanh thu thành 0 thay vì bỏ trống', () => {
    // Đúng tình huống thật: /reports/sales trả 13 dòng cho khoảng 14 ngày
    // vì 19/8 không có đơn nào.
    const rows = [
      { date: '2026-08-18', revenue: 803000 },
      { date: '2026-08-20', revenue: 925000 },
    ]
    const filled = fillMissingDays(rows, '2026-08-18', '2026-08-20')

    expect(filled).toEqual([
      { date: '2026-08-18', revenue: 803000 },
      { date: '2026-08-19', revenue: 0 },
      { date: '2026-08-20', revenue: 925000 },
    ])
  })

  it('luôn trả về đúng số ngày của khoảng, kể cả khi không có dòng nào', () => {
    expect(fillMissingDays([], '2026-08-01', '2026-08-14')).toHaveLength(14)
    expect(fillMissingDays([], '2026-08-01', '2026-08-14').every((r) => r.revenue === 0)).toBe(true)
  })

  it('không sửa hay làm mất giá trị đã có', () => {
    const rows = [
      { date: '2026-08-02', revenue: 500 },
      { date: '2026-08-01', revenue: 100 },
    ]
    const filled = fillMissingDays(rows, '2026-08-01', '2026-08-03')
    expect(filled.map((r) => r.revenue)).toEqual([100, 500, 0])
  })

  it('sắp xếp tăng dần theo ngày dù đầu vào lộn xộn', () => {
    const rows = [
      { date: '2026-08-03', revenue: 3 },
      { date: '2026-08-01', revenue: 1 },
      { date: '2026-08-02', revenue: 2 },
    ]
    expect(fillMissingDays(rows, '2026-08-01', '2026-08-03').map((r) => r.date))
      .toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
  })

  it('cộng dồn khi có nhiều dòng cùng một ngày', () => {
    // Nếu chỉ ghi đè thì một trong hai khoản doanh thu biến mất không dấu vết.
    const rows = [
      { date: '2026-08-01', revenue: 100 },
      { date: '2026-08-01', revenue: 250 },
    ]
    expect(fillMissingDays(rows, '2026-08-01', '2026-08-01')).toEqual([
      { date: '2026-08-01', revenue: 350 },
    ])
  })

  it('chấp nhận chuỗi ngày có kèm giờ', () => {
    const rows = [{ date: '2026-08-01T00:00:00', revenue: 42 }]
    expect(fillMissingDays(rows, '2026-08-01', '2026-08-01')).toEqual([
      { date: '2026-08-01', revenue: 42 },
    ])
  })

  it('không rơi vào vòng lặp vô hạn khi khoảng bị đảo ngược', () => {
    const rows = [{ date: '2026-08-05', revenue: 10 }]
    expect(fillMissingDays(rows, '2026-08-10', '2026-08-01')).toEqual(rows)
  })

  it('bỏ qua ngày không hợp lệ thay vì tạo NaN', () => {
    const rows = [
      { date: 'không-phải-ngày', revenue: 999 },
      { date: '2026-08-01', revenue: 5 },
    ]
    expect(fillMissingDays(rows, '2026-08-01', '2026-08-02')).toEqual([
      { date: '2026-08-01', revenue: 5 },
      { date: '2026-08-02', revenue: 0 },
    ])
  })
})
