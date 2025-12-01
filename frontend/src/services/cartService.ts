// Cart service for managing cart in localStorage
import { CartItem, Cart } from '../types/cart'

const CART_STORAGE_KEY = 'leaf_creme_cart'

export function getCart(): Cart {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (!stored) {
      return { items: [], total: 0, itemCount: 0 }
    }
    const cart = JSON.parse(stored) as Cart
    // Recalculate totals in case of data corruption
    return calculateCartTotals(cart.items)
  } catch (error) {
    console.error('Error reading cart from localStorage:', error)
    return { items: [], total: 0, itemCount: 0 }
  }
}

export function saveCart(cart: Cart): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  } catch (error) {
    console.error('Error saving cart to localStorage:', error)
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

function calculateCartTotals(items: CartItem[]): Cart {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    items,
    total,
    itemCount,
  }
}


