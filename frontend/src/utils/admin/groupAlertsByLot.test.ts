import { describe, expect, it } from 'vitest'
import { groupAlertsByLot, type GroupableAlert } from './groupAlertsByLot'

const alert = (canhbao_id: number, lohang_id?: number, loai_lohang = 'sanpham'): GroupableAlert =>
  ({ canhbao_id, lohang_id, loai_lohang })

describe('groupAlertsByLot', () => {
  it('không thêm, mất hay nhân đôi cảnh báo nào', () => {
    // Bất biến quan trọng nhất: đây chỉ là phép sắp xếp lại để hiển thị.
    const input = [alert(1, 10), alert(2, 20), alert(3, 10), alert(4, 30), alert(5, 20)]
    const { rows } = groupAlertsByLot(input)

    expect(rows).toHaveLength(input.length)
    expect(rows.map((r) => r.canhbao_id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    expect(new Set(rows)).toEqual(new Set(input))
  })

  it('đưa các cảnh báo cùng lô về cạnh nhau', () => {
    const { rows } = groupAlertsByLot([alert(1, 10), alert(2, 20), alert(3, 10)])
    expect(rows.map((r) => r.canhbao_id)).toEqual([1, 3, 2])
  })

  it('giữ thứ tự ưu tiên của server: cụm neo theo thành viên xuất hiện sớm nhất', () => {
    // Lô 20 xuất hiện trước lô 10, nên cụm của nó phải đứng trước.
    const { rows } = groupAlertsByLot([alert(1, 20), alert(2, 10), alert(3, 20), alert(4, 10)])
    expect(rows.map((r) => r.canhbao_id)).toEqual([1, 3, 2, 4])
  })

  it('giữ nguyên thứ tự bên trong một cụm', () => {
    const { rows } = groupAlertsByLot([alert(7, 10), alert(3, 10), alert(5, 10)])
    expect(rows.map((r) => r.canhbao_id)).toEqual([7, 3, 5])
  })

  it('đánh dấu dòng đầu cụm và kích thước cụm', () => {
    const { meta } = groupAlertsByLot([alert(1, 10), alert(2, 10), alert(3, 99)])

    expect(meta.get(1)).toMatchObject({ groupSize: 2, isGroupLead: true, indexInGroup: 0 })
    expect(meta.get(2)).toMatchObject({ groupSize: 2, isGroupLead: false, indexInGroup: 1 })
    expect(meta.get(3)).toMatchObject({ groupSize: 1, isGroupLead: true, indexInGroup: 0 })
  })

  it('KHÔNG cụm các cảnh báo không có lô lại với nhau', () => {
    // Nếu gộp theo `undefined` thì mọi cảnh báo thiếu lô sẽ dính thành một
    // cụm giả — đúng kiểu nhiễu mà hàm này sinh ra để loại bỏ.
    const { rows, meta } = groupAlertsByLot([alert(1, undefined), alert(2, undefined), alert(3, undefined)])

    expect(rows.map((r) => r.canhbao_id)).toEqual([1, 2, 3])
    for (const id of [1, 2, 3]) {
      expect(meta.get(id)).toMatchObject({ groupSize: 1, isGroupLead: true })
    }
    expect(new Set([meta.get(1)!.groupKey, meta.get(2)!.groupKey, meta.get(3)!.groupKey]).size).toBe(3)
  })

  it('phân biệt cùng số hiệu lô nhưng khác loại lô', () => {
    // lohang_id chỉ là duy nhất trong từng bảng lô (sản phẩm / linh kiện /
    // hộp quà), nên khoá cụm phải kèm loại lô.
    const { meta } = groupAlertsByLot([alert(1, 5, 'sanpham'), alert(2, 5, 'linhkien')])
    expect(meta.get(1)!.groupKey).not.toBe(meta.get(2)!.groupKey)
    expect(meta.get(1)).toMatchObject({ groupSize: 1 })
    expect(meta.get(2)).toMatchObject({ groupSize: 1 })
  })

  it('xử lý danh sách rỗng', () => {
    const { rows, meta } = groupAlertsByLot([])
    expect(rows).toEqual([])
    expect(meta.size).toBe(0)
  })
})
