// Cart Context for global cart state management
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Cart, CartItem } from '../types/cart'
import {
  getCart,
  addToCart as addToCartService,
  removeFromCart as removeFromCartService,
  updateCartItemQuantity as updateCartItemQuantityService,
  clearCart as clearCartService,
} from '../services/cartService'
import { validateVoucher } from '../services/voucherService'

interface AppliedVoucher {
  code: string
  discountAmount: number
}

interface CartContextType {
  cart: Cart
  cartItems: CartItem[] // Alias for cart.items
  cartCount: number // Alias for cart.itemCount
  cartSubtotal: number // Alias for cart.total
  appliedVoucher: AppliedVoucher | null
  isCartDrawerOpen: boolean
  openCartDrawer: () => void
  closeCartDrawer: () => void
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeFromCart: (productId: number, variantId?: number) => void
  updateQuantity: (productId: number, quantity: number, variantId?: number) => void
  clearCart: () => void
  refreshCart: () => void
  applyVoucher: (code: string) => Promise<{ success: boolean; error?: string; discountAmount?: number }>
  removeVoucher: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(getCart())
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    setCart(getCart())
  }, [])

  // Listen for auth changes (login/logout) to reload cart
  useEffect(() => {
    const handleAuthChange = () => {
      setCart(getCart())
      setAppliedVoucher(null) // Clear voucher on auth change
    }

    window.addEventListener('auth-change', handleAuthChange)
    return () => window.removeEventListener('auth-change', handleAuthChange)
  }, [])

  // Listen for storage changes (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Also listen for cart changes from other tabs
      if (e.key?.startsWith('leaf_creme_cart')) {
        setCart(getCart())
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const addToCart = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const updatedCart = addToCartService(item)
    setCart(updatedCart)
  }

  const removeFromCart = (productId: number, variantId?: number) => {
    const updatedCart = removeFromCartService(productId, variantId)
    setCart(updatedCart)
  }

  const updateQuantity = (productId: number, quantity: number, variantId?: number) => {
    const updatedCart = updateCartItemQuantityService(productId, quantity, variantId)
    setCart(updatedCart)
  }

  const clearCart = () => {
    const emptyCart = clearCartService()
    setCart(emptyCart)
    setAppliedVoucher(null) // Clear voucher when cart is cleared
  }

  const refreshCart = () => {
    setCart(getCart())
  }

  const applyVoucher = async (code: string): Promise<{ success: boolean; error?: string; discountAmount?: number }> => {
    try {
      const result = await validateVoucher(code, cart.total, cart.items)
      if (result.valid && result.voucher) {
        setAppliedVoucher({
          code: result.voucher.code,
          discountAmount: result.discountAmount,
        })
        return {
          success: true,
          discountAmount: result.discountAmount,
        }
      } else {
        return {
          success: false,
          error: result.error || 'Mã giảm giá không hợp lệ',
        }
      }
    } catch (error) {
      console.error('Error applying voucher:', error)
      return {
        success: false,
        error: 'Có lỗi xảy ra khi áp dụng mã giảm giá',
      }
    }
  }

  const removeVoucher = () => {
    setAppliedVoucher(null)
  }

  const openCartDrawer = () => {
    setIsCartDrawerOpen(true)
  }

  const closeCartDrawer = () => {
    setIsCartDrawerOpen(false)
  }

  // Remove voucher when cart changes
  useEffect(() => {
    // Clear voucher if cart is empty
    if (cart.items.length === 0 && appliedVoucher) {
      setAppliedVoucher(null)
      return
    }

    if (appliedVoucher && cart.items.length > 0) {
      // Re-validate voucher when cart changes
      validateVoucher(appliedVoucher.code, cart.total, cart.items).then((result) => {
        if (!result.valid) {
          setAppliedVoucher(null)
        } else if (result.voucher) {
          const voucherCode = result.voucher.code
          const discountAmount = result.discountAmount
          // Update discount amount if cart total changed
          setAppliedVoucher((prev) => {
            if (!prev) return null
            const next = {
              code: voucherCode,
              discountAmount,
            }
            if (prev.code === next.code && prev.discountAmount === next.discountAmount) {
              return prev
            }
            return next
          })
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.total, cart.items.length])

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems: cart.items,
        cartCount: cart.itemCount,
        cartSubtotal: cart.total,
        appliedVoucher,
        isCartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        applyVoucher,
        removeVoucher,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}


