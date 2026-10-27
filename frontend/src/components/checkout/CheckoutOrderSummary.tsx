import { ShoppingBag } from 'lucide-react'
import Card from '../ui/Card'
import GiftBoxInfo from '../cart/GiftBoxInfo'
import { useCart } from '../../contexts/CartContext'
import { parseGiftBoxMetadata } from '../../utils/giftBoxHelpers'
import { FALLBACK_IMAGE } from '../../constants/images'
import { formatPrice } from '../../utils/formatPrice'

type CartState = ReturnType<typeof useCart>
type Props = { cart: CartState['cart']; appliedVoucher: CartState['appliedVoucher'] }

export default function CheckoutOrderSummary({ cart, appliedVoucher }: Props) {
  return (
    <Card className="order-1 h-fit lg:sticky lg:top-24 lg:order-2">
      <div className="flex items-center gap-2">
        <ShoppingBag className="size-5 text-brand-fg" />
        <h2 className="font-heading text-xl font-semibold text-fg-strong">Đơn hàng của bạn</h2>
      </div>
      <div className="mt-5 space-y-4">
        {cart.items.map((item) => {
          const isGiftBox =
            item.sku?.startsWith('GIFTBOX-') ||
            Boolean(item.variantLabel && parseGiftBoxMetadata(item.variantLabel))
          return (
            <div
              key={`${item.productId}-${item.variantId || 'none'}`}
              className="flex gap-3 border-b border-border-subtle pb-4 last:border-0"
            >
              <div className="relative shrink-0">
                <img
                  src={item.productImage || FALLBACK_IMAGE.cart}
                  alt=""
                  className={`rounded-md object-cover ${isGiftBox ? 'size-20' : 'size-16'}`}
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_IMAGE.cart
                  }}
                />
                {isGiftBox && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-fg-on-brand">
                    Quà
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg-strong">{item.productName}</p>
                {isGiftBox ? (
                  <GiftBoxInfo variantLabel={item.variantLabel} />
                ) : (
                  item.variantLabel && (
                    <p className="mt-1 text-xs text-fg-subtle">{item.variantLabel}</p>
                  )
                )}
                <p className="mt-1 text-sm text-fg-muted">
                  {item.quantity} × {formatPrice(item.price)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 space-y-3 border-t border-border-subtle pt-4 text-sm">
        <div className="flex justify-between text-fg-muted">
          <span>Tạm tính</span>
          <span className="font-medium text-fg">{formatPrice(cart.total)}</span>
        </div>
        {appliedVoucher && appliedVoucher.discountAmount > 0 && (
          <div className="flex justify-between text-success">
            <span>Giảm giá ({appliedVoucher.code})</span>
            <span>-{formatPrice(appliedVoucher.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-fg-muted">
          <span>Phí vận chuyển</span>
          <span className="text-fg">Miễn phí</span>
        </div>
        <div className="flex justify-between border-t border-border-subtle pt-3 text-base font-semibold text-fg-strong">
          <span>Tổng cộng</span>
          <span>{formatPrice(cart.total - (appliedVoucher?.discountAmount || 0))}</span>
        </div>
      </div>
    </Card>
  )
}
