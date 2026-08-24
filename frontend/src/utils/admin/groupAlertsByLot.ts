/**
 * Cụm các cảnh báo cùng một lô lại cạnh nhau — CHỈ để hiển thị.
 *
 * Một lô vừa sắp hết hạn vừa tồn kho thấp sẽ sinh hai cảnh báo riêng. Trên
 * bảng chúng nằm rời nhau (sắp theo mức độ) nên trông như dòng lặp, dù đó
 * là hai vấn đề khác nhau của cùng một lô.
 *
 * Hàm này KHÔNG gộp dòng: mỗi cảnh báo vẫn là một dòng, `canhbao_id` vẫn là
 * row id, nên chọn nhiều dòng và thao tác hàng loạt giữ nguyên ngữ nghĩa
 * "xử lý từng cảnh báo". Gộp thật thành một dòng mỗi lô sẽ khiến "đánh dấu
 * đã xử lý" đóng luôn cảnh báo mà người dùng không định đụng tới (ví dụ
 * nhập thêm hàng không giải quyết chuyện sắp hết hạn) — đó là lý do ở đây
 * chỉ sắp xếp lại và đánh dấu, không hợp nhất.
 *
 * Thứ tự ưu tiên do server quyết định vẫn được tôn trọng: mỗi cụm neo tại
 * vị trí của thành viên xuất hiện sớm nhất trong danh sách đầu vào.
 *
 * Lưu ý: chỉ cụm trong phạm vi trang hiện tại. Nếu hai cảnh báo cùng lô rơi
 * vào hai trang khác nhau thì không thể cụm — chấp nhận được vì trang mặc
 * định là 50 dòng.
 */

export interface AlertGroupMeta {
  /** Khoá cụm, dùng cho test và debug. */
  groupKey: string
  /** Tổng số cảnh báo của cùng lô trong trang này. */
  groupSize: number
  /** Dòng đầu của cụm — nơi hiển thị tên sản phẩm và mã lô. */
  isGroupLead: boolean
  /** Vị trí trong cụm, bắt đầu từ 0. */
  indexInGroup: number
}

export interface GroupableAlert {
  canhbao_id: number
  lohang_id?: number
  loai_lohang?: string
}

export interface GroupedAlerts<T extends GroupableAlert> {
  rows: T[]
  meta: Map<number, AlertGroupMeta>
}

/**
 * Cảnh báo không gắn với lô nào thì mỗi cái là một cụm riêng — nếu gộp
 * chúng theo `undefined` thì mọi cảnh báo thiếu lô sẽ dính thành một cụm
 * giả, đúng kiểu lỗi mà việc cụm này sinh ra để tránh.
 */
function groupKeyOf(alert: GroupableAlert): string {
  if (alert.lohang_id === undefined || alert.lohang_id === null) {
    return `alert:${alert.canhbao_id}`
  }
  return `lot:${alert.loai_lohang ?? 'unknown'}:${alert.lohang_id}`
}

export function groupAlertsByLot<T extends GroupableAlert>(rows: T[]): GroupedAlerts<T> {
  const buckets = new Map<string, T[]>()
  const order: string[] = []

  for (const row of rows) {
    const key = groupKeyOf(row)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.push(row)
    } else {
      buckets.set(key, [row])
      order.push(key)
    }
  }

  const ordered: T[] = []
  const meta = new Map<number, AlertGroupMeta>()

  for (const key of order) {
    const bucket = buckets.get(key) as T[]
    bucket.forEach((row, indexInGroup) => {
      ordered.push(row)
      meta.set(row.canhbao_id, {
        groupKey: key,
        groupSize: bucket.length,
        isGroupLead: indexInGroup === 0,
        indexInGroup,
      })
    })
  }

  return { rows: ordered, meta }
}
