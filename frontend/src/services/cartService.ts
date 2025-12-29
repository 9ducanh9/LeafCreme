// Cart service for managing cart in localStorage/sessionStorage
import { CartItem, Cart } from '../types/cart'

const CART_STORAGE_KEY_PREFIX = 'leaf_creme_cart'
const GUEST_CART_KEY = 'leaf_creme_cart_guest'

// Get current user ID from localStorage (set by auth)
function getCurrentUserId(): number | null {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) return null
    // Decode JWT to get user ID (simple decode without verification)
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || payload.user_id || payload.nguoidung_id || null
  } catch {
    return null
  }
}

// Get the appropriate storage key based on auth state
function getCartStorageKey(): string {
  const userId = getCurrentUserId()
  return userId ? `${CART_STORAGE_KEY_PREFIX}_user_${userId}` : GUEST_CART_KEY
}

// Get the appropriate storage (localStorage for users, sessionStorage for guests)
function getStorage(): Storage {
  const userId = getCurrentUserId()
  return userId ? localStorage : sessionStorage
}

export function getCart(): Cart {
  try {
    const storageKey = getCartStorageKey()
    const storage = getStorage()
    const stored = storage.getItem(storageKey)
    if (!stored) {
      return { items: [], total: 0, itemCount: 0 }
    }
    const cart = JSON.parse(stored) as Cart
    // Recalculate totals in case of data corruption
    return calculateCartTotals(cart.items)
  } catch (error) {
    console.error('Error reading cart from storage:', error)
    return { items: [], total: 0, itemCount: 0 }
  }
}

export function saveCart(cart: Cart): void {
  try {
    const storageKey = getCartStorageKey()
    const storage = getStorage()
    storage.setItem(storageKey, JSON.stringify(cart))
  } catch (error) {
    console.error('Error saving cart to storage:', error)
  }
}

export function addToCart(item: Omit<CartItem, 'quantity'> & { quantity?: number }): Cart {
  const cart = getCart()
  const existingItemIndex = cart.items.findIndex(
    (i) =>
      i.productId === item.productId &&
      (item.variantId ? i.variantId === item.variantId : !i.variantId)
  )

  const quantity = item.quantity || 1

  if (existingItemIndex >= 0) {
    // Update existing item
    cart.items[existingItemIndex].quantity += quantity
  } else {
    // Add new item
    cart.items.push({
      ...item,
      quantity,
    })
  }

  const updatedCart = calculateCartTotals(cart.items)
  saveCart(updatedCart)
  return updatedCart
}

export function removeFromCart(productId: number, variantId?: number): Cart {
  const cart = getCart()
  cart.items = cart.items.filter(
    (item) =>
      !(
        item.productId === productId &&
        (variantId ? item.variantId === variantId : !item.variantId)
      )
  )

  const updatedCart = calculateCartTotals(cart.items)
  saveCart(updatedCart)
  return updatedCart
}

export function updateCartItemQuantity(
  productId: number,
  quantity: number,
  variantId?: number
): Cart {
  if (quantity <= 0) {
    return removeFromCart(productId, variantId)
  }

  const cart = getCart()
  const item = cart.items.find(
    (i) =>
      i.productId === productId &&
      (variantId ? i.variantId === variantId : !i.variantId)
  )

  if (item) {
    item.quantity = quantity
  }

  const updatedCart = calculateCartTotals(cart.items)
  saveCart(updatedCart)
  return updatedCart
}

export function clearCart(): Cart {
  const emptyCart = { items: [], total: 0, itemCount: 0 }
  saveCart(emptyCart)
  return emptyCart
}

// Clear guest cart (called when user logs in)
export function clearGuestCart(): void {
  sessionStorage.removeItem(GUEST_CART_KEY)
}

// Called when user logs out - clear all cart data for current session
export function onLogout(): void {
  // Clear session storage guest cart
  sessionStorage.removeItem(GUEST_CART_KEY)
}

function calculateCartTotals(items: CartItem[]): Cart {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    items,
    total,
    itemCount,
  }
}


