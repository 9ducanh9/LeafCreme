// Voucher service for validating and applying vouchers
// Real backend "validate voucher" endpoint is not implemented in this repository.
import { getVouchers, DEMO_VOUCHER_MODE_ENABLED } from './admin/voucherService'
import type { Voucher } from '../types/admin'
import { CartItem } from '../types/cart'

export interface VoucherValidationResult {
  valid: boolean
  voucher?: Voucher
  discountAmount: number
  error?: string
}

const VOUCHER_DISABLED_MESSAGE =
  'Tính năng mã giảm giá hiện đang ở chế độ demo/dev-only và chưa có backend xác thực riêng.'

export async function validateVoucher(
  code: string,
  subtotal: number,
  cartItems: CartItem[]
): Promise<VoucherValidationResult> {
  if (!DEMO_VOUCHER_MODE_ENABLED) {
    return {
      valid: false,
      discountAmount: 0,
      error: VOUCHER_DISABLED_MESSAGE,
    }
  }

  try {
    const vouchers = await getVouchers({ status: 'active' })
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
      const cartCategories: string[] = []

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
