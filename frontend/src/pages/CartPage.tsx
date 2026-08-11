import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Cake } from 'lucide-react'
import Card, { CardBody, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { Container, Section } from '../components/layout'
import { useCart } from '../contexts/CartContext'
import CartItem from '../components/cart/CartItem'
import CartSummary from '../components/cart/CartSummary'

export default function CartPage() {
  const navigate = useNavigate()
  const { cartItems, cartSubtotal, cartCount, updateQuantity, removeFromCart, clearCart } = useCart()
  const [confirmRemove, setConfirmRemove] = useState<{ isOpen: boolean; productId?: number; variantId?: number }>({ isOpen: false })
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const handleConfirmRemove = () => {
    if (confirmRemove.productId !== undefined) removeFromCart(confirmRemove.productId, confirmRemove.variantId)
    setConfirmRemove({ isOpen: false })
  }

  if (cartItems.length === 0) {
    return <Section tone="canvas"><Container><Button variant="ghost" onClick={() => navigate('/')} className="mb-8"><ArrowLeft className="size-4" />Tiếp tục mua sắm</Button><EmptyState icon={<Cake className="size-12" />} title="Giỏ hàng đang trống" description="Hãy để Leaf Crème làm ngọt ngào thêm ngày của bạn." action={<Button href="/search">Xem bánh ngon</Button>} /></Container></Section>
  }

  return (
    <Section tone="canvas">
      <Container>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="size-4" />Tiếp tục mua sắm</Button><Button variant="ghost" onClick={() => setConfirmClearAll(true)} className="text-danger">Xóa tất cả</Button></div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="overflow-hidden p-0"><CardHeader className="border-b border-border-subtle"><CardTitle>Sản phẩm trong giỏ ({cartCount})</CardTitle></CardHeader><CardBody className="divide-y divide-border-subtle p-0">{cartItems.map((item) => <div key={`${item.productId}-${item.variantId || 'none'}`} className="px-5 sm:px-6"><CartItem item={item} onQuantityChange={updateQuantity} onRemove={(productId, variantId) => setConfirmRemove({ isOpen: true, productId, variantId })} compact={false} /></div>)}</CardBody></Card>
          <Card className="h-fit lg:sticky lg:top-24"><CardTitle className="mb-6">Tóm tắt đơn hàng</CardTitle><CartSummary subtotal={cartSubtotal} itemCount={cartCount} shipping={0} showShipping={false} onCheckout={() => navigate('/checkout')} onContinueShopping={() => navigate('/search')} checkoutLabel="Tiến hành thanh toán" continueShoppingLabel="Tiếp tục mua sắm" compact={false} /></Card>
        </div>
      </Container>
      <ConfirmDialog isOpen={confirmRemove.isOpen} message="Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?" confirmLabel="Xóa" cancelLabel="Hủy" onConfirm={handleConfirmRemove} onCancel={() => setConfirmRemove({ isOpen: false })} variant="danger" />
      <ConfirmDialog isOpen={confirmClearAll} message="Bạn có chắc muốn xóa tất cả sản phẩm khỏi giỏ hàng?" confirmLabel="Xóa tất cả" cancelLabel="Hủy" onConfirm={() => { clearCart(); setConfirmClearAll(false) }} onCancel={() => setConfirmClearAll(false)} variant="danger" />
    </Section>
  )
}
