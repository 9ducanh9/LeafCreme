export interface BatchValues {
  ma_lo?: string
  ngay_san_xuat?: string
  ngay_het_han?: string
  so_luong?: number | string
  gia_don_vi?: number | string
}

export function isBefore(left: string, right: string): boolean {
  return new Date(left).getTime() < new Date(right).getTime()
}

export function validateBatch(values: BatchValues) {
  const errors: Record<string, string> = {}
  if (!values.ma_lo?.trim()) errors.ma_lo = 'Mã lô là bắt buộc'
  if (!values.ngay_het_han) errors.ngay_het_han = 'Ngày hết hạn là bắt buộc'
  if (values.ngay_san_xuat && values.ngay_het_han && isBefore(values.ngay_het_han, values.ngay_san_xuat)) {
    errors.ngay_het_han = 'Ngày hết hạn phải sau ngày sản xuất'
  }
  const expiry = values.ngay_het_han ? new Date(values.ngay_het_han) : null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (expiry && expiry < today) errors.ngay_het_han = 'Ngày hết hạn không được ở trước hôm nay'
  if (!Number(values.so_luong) || Number(values.so_luong) <= 0) errors.so_luong = 'Số lượng phải lớn hơn 0'
  if (!Number(values.gia_don_vi) || Number(values.gia_don_vi) <= 0) errors.gia_don_vi = 'Giá đơn vị phải lớn hơn 0'
  return errors
}

export function validateBatchSoft(values: BatchValues) {
  const warnings: Record<string, string> = {}
  if (values.ngay_san_xuat && values.ngay_het_han) {
    const shelfLife = (new Date(values.ngay_het_han).getTime() - new Date(values.ngay_san_xuat).getTime()) / 86400000
    if (shelfLife > 365) warnings.ngay_het_han = 'Thời hạn sử dụng dài hơn 1 năm, hãy kiểm tra lại ngày.'
    if (shelfLife < 1) warnings.ngay_het_han = 'Thời hạn sử dụng dưới 1 ngày, hãy kiểm tra lại.'
  }
  return warnings
}
