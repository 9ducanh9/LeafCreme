// Voucher service for validating and applying vouchers.
// The backend remains authoritative at checkout; this lookup only provides
// immediate storefront feedback before the order is submitted.
import type { Voucher } from '../types/admin'
import { CartItem } from '../types/cart'
import { apiClient } from './api'

interface PublicVoucher {
  phieugiam_id: number
  ma_phieu: string
  ten_phieu: string
  loai_giam: 'phantram' | 'sotien'
  gia_tri_giam: number
  tong_tien_toi_thieu: number
  ngay_het_han: string
  dang_hoat_dong: boolean
  san_pham_ap_dung?: { loai_ap_dung: 'all' | 'san_pham' | 'danh_muc'; danh_sach_id?: Array<number | string> | null } | null
}

function mapPublicVoucher(row: PublicVoucher): Voucher {
  const application = row.san_pham_ap_dung
  return {
    id: String(row.phieugiam_id),
    code: row.ma_phieu,
    type: row.loai_giam === 'phantram' ? 'percent' : 'fixed_amount',
    discountValue: Number(row.gia_tri_giam),
    appliesTo: application?.loai_ap_dung === 'san_pham' ? 'product' : application?.loai_ap_dung === 'danh_muc' ? 'category' : 'all',
    targetId: application?.danh_sach_id?.[0] !== undefined ? String(application.danh_sach_id[0]) : undefined,
    minOrderValue: Number(row.tong_tien_toi_thieu || 0),
    expiresAt: row.ngay_het_han,
    status: row.dang_hoat_dong ? 'active' : 'inactive',
  }
}

export async function getActiveVouchers(): Promise<Voucher[]> {
  const rows = await apiClient.get<PublicVoucher[]>('/vouchers/active')
  return rows.map(mapPublicVoucher)
}

export interface VoucherValidationResult {
  valid: boolean
  voucher?: Voucher
  discountAmount: number
  error?: string
}

export async function validateVoucher(
  code: string,
  subtotal: number,
  cartItems: CartItem[]
): Promise<VoucherValidationResult> {
  try {
    const vouchers = await getActiveVouchers()
    const voucher = vouchers.find((item) => item.code.toUpperCase() === code.toUpperCase().trim())

    if (!voucher) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'Mã giảm giá không tồn tại',
      }
    }

    if (voucher.status !== 'active') {
      return {
        valid: false,
        discountAmount: 0,
        error: 'Mã giảm giá không còn hiệu lực',
      }
    }

    const now = new Date()
    const expiresAt = new Date(voucher.expiresAt)
    if (now > expiresAt) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'Mã giảm giá đã hết hạn',
      }
    }

    if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} ₫ để sử dụng mã này`,
      }
    }

    if (voucher.appliesTo !== 'all') {
      const cartProductIds = cartItems.map((item) => item.productId)
      const cartCategories = cartItems
        .map((item) => item.category?.trim())
        .filter((category): category is string => Boolean(category))

      if (voucher.appliesTo === 'product') {
        if (!voucher.targetId || !cartProductIds.includes(Number(voucher.targetId))) {
          return {
            valid: false,
            discountAmount: 0,
            error: 'Mã giảm giá không áp dụng cho sản phẩm trong giỏ hàng',
          }
        }
      } else if (voucher.appliesTo === 'category') {
        if (!voucher.targetId || !cartCategories.includes(voucher.targetId)) {
          return {
            valid: false,
            discountAmount: 0,
            error: 'Mã giảm giá không áp dụng cho danh mục sản phẩm trong giỏ hàng',
          }
        }
      }
    }

    let discountAmount = 0
    if (voucher.type === 'percent') {
      discountAmount = (subtotal * voucher.discountValue) / 100
      discountAmount = Math.min(discountAmount, subtotal)
    } else if (voucher.type === 'fixed_amount') {
      discountAmount = Math.min(voucher.discountValue, subtotal)
    }

    return {
      valid: true,
      voucher,
      discountAmount,
    }
  } catch {
    return {
      valid: false,
      discountAmount: 0,
      error: 'Có lỗi xảy ra khi kiểm tra mã giảm giá',
    }
  }
}
