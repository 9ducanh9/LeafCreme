// Voucher service for validating and applying vouchers
import { getVouchers } from './admin/voucherService'
import type { Voucher } from '../types/admin'
import { CartItem } from '../types/cart'

export interface VoucherValidationResult {
  valid: boolean
  voucher?: Voucher
  discountAmount: number
  error?: string
}

/**
 * Validate voucher code and calculate discount
 */
export async function validateVoucher(
  code: string,
  subtotal: number,
  cartItems: CartItem[]
): Promise<VoucherValidationResult> {
  try {
    // Get all vouchers (from localStorage mock data or API)
    const vouchers = await getVouchers({ status: 'active' })
    
    // Find voucher by code (case insensitive)
    const voucher = vouchers.find(
      (v) => v.code.toUpperCase() === code.toUpperCase().trim()
    )

    if (!voucher) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'Mã giảm giá không tồn tại',
      }
    }

    // Check if voucher is active
    if (voucher.status !== 'active') {
      return {
        valid: false,
        discountAmount: 0,
        error: 'Mã giảm giá không còn hiệu lực',
      }
    }

    // Check expiration date
    const now = new Date()
    const expiresAt = new Date(voucher.expiresAt)
    if (now > expiresAt) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'Mã giảm giá đã hết hạn',
      }
    }

    // Check minimum order value
    if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} ₫ để sử dụng mã này`,
      }
    }

    // Check if voucher applies to cart items
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

    // Calculate discount amount
    let discountAmount = 0
    if (voucher.type === 'percent') {
      discountAmount = (subtotal * voucher.discountValue) / 100
      // Cap at subtotal (can't discount more than order total)
      discountAmount = Math.min(discountAmount, subtotal)
    } else if (voucher.type === 'fixed_amount') {
      discountAmount = Math.min(voucher.discountValue, subtotal)
    }

    return {
      valid: true,
      voucher,
      discountAmount,
    }
  } catch (error) {
    console.error('Error validating voucher:', error)
    return {
      valid: false,
      discountAmount: 0,
      error: 'Có lỗi xảy ra khi kiểm tra mã giảm giá',
    }
  }
}

