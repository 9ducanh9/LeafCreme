import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, X } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import CartItem from './CartItem'
import CartSummary from './CartSummary'

interface CartDrawerProps { isOpen: boolean; onClose: () => void }

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const navigate = useNavigate()
  const { cartItems, cartSubtotal, updateQuantity, removeFromCart, applyVoucher, removeVoucher, appliedVoucher } = useCart()
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => drawerRef.current?.querySelector<HTMLElement>('button, [href], input')?.focus())
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown) }
  }, [isOpen, onClose])

  const handleApplyVoucher = async (code: string) => code.trim() ? applyVoucher(code) : (removeVoucher(), { success: true })
  const go = (path: string) => { onClose(); navigate(path) }

  return <>
    <button type="button" className={`fixed inset-0 z-overlay bg-bg-overlay transition-opacity duration-normal ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} aria-label="Đóng giỏ hàng" onClick={onClose} />
    <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" className={`fixed inset-y-0 right-0 z-modal flex h-dvh w-full max-w-md flex-col border-l border-border bg-bg-surface shadow-xl transition-transform duration-slower ${isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Leaf Crème</p><h2 id="cart-drawer-title" className="mt-1 font-heading text-xl font-semibold text-fg-strong">Giỏ hàng</h2></div><button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle" aria-label="Đóng giỏ hàng"><X className="size-5" /></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
        {cartItems.length === 0 ? <div className="flex h-full flex-col items-center justify-center py-16 text-center"><ShoppingBag className="size-12 text-brand-fg" aria-hidden /><h3 className="mt-4 font-heading text-lg font-semibold text-fg-strong">Giỏ hàng đang trống</h3><p className="mt-2 max-w-xs text-sm text-fg-muted">Chọn một món bánh nhỏ để bắt đầu ngày ngọt ngào hơn.</p></div> : <div>{cartItems.map((item) => <CartItem key={`${item.productId}-${item.variantId || 'none'}`} item={item} onQuantityChange={updateQuantity} onRemove={removeFromCart} compact />)}</div>}
      </div>
      {cartItems.length > 0 && <div className="safe-area-bottom shrink-0 border-t border-border-subtle bg-bg-surface p-5"><CartSummary subtotal={cartSubtotal} discount={appliedVoucher?.discountAmount || 0} onCheckout={() => go('/checkout')} onContinueShopping={() => go('/cart')} onApplyVoucher={handleApplyVoucher} checkoutLabel="Thanh toán" continueShoppingLabel="Xem giỏ hàng" compact /></div>}
    </aside>
  </>
}
