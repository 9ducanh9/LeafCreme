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

interface CartContextType {
  cart: Cart
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeFromCart: (productId: number, variantId?: number) => void
  updateQuantity: (productId: number, quantity: number, variantId?: number) => void
  clearCart: () => void
  refreshCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(getCart())

  // Load cart from localStorage on mount
  useEffect(() => {
    setCart(getCart())
  }, [])

  // Listen for storage changes (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'leaf_creme_cart') {
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
  }

  const refreshCart = () => {
    setCart(getCart())
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
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


