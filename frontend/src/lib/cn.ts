import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Gộp class Tailwind. `twMerge` giải xung đột — class truyền sau THẮNG class trước
 * khi cùng nhóm (h-11 vs h-9, px-4 vs px-6, text-sm vs text-base...).
 *
 * Vì sao không chỉ dùng clsx: clsx chỉ NỐI string. `cn('h-11', 'h-9')` ra
 * "h-11 h-9" và kết quả phụ thuộc thứ tự class trong file CSS build ra —
 * không xác định. Mọi component ở đây dùng pattern `cn(base, variant, className)`
 * và giả định `className` override được; chỉ có twMerge mới bảo đảm điều đó.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
