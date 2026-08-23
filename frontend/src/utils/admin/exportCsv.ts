// Xuất CSV nhẹ, không cần thư viện — Excel mở CSV tốt, và tránh phải thêm
// dependency mới cho một bulk action (spec 10 §4.4: "xuất Excel" cho mọi bảng).
function escapeCell(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
  // BOM để Excel nhận đúng UTF-8 (tiếng Việt có dấu không bị vỡ)
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
