import { Trash2 } from 'lucide-react'
import type { CartItem as CartItemType } from '../../types/cart'
import { formatPrice } from '../../utils/formatPrice'
import { getImageUrl } from '../../utils/getImageUrl'
import { FALLBACK_IMAGE } from '../../constants/images'
import GiftBoxInfo from './GiftBoxInfo'
import { parseGiftBoxMetadata } from '../../utils/giftBoxHelpers'
import QuantityStepper from '../ui/QuantityStepper'

interface CartItemProps { item: CartItemType; onQuantityChange: (productId: number, newQuantity: number, variantId?: number) => void; onRemove: (productId: number, variantId?: number) => void; compact?: boolean }

export default function CartItem({ item, onQuantityChange, onRemove, compact = false }: CartItemProps) {
  const imageUrl = item.productImage ? getImageUrl(item.productImage) : FALLBACK_IMAGE.cart
  const itemTotal = item.price * item.quantity
  const titleClass = compact ? 'text-sm' : 'text-lg'
  return <article className={`flex gap-4 border-b border-border-subtle py-5 last:border-0 ${compact ? '' : 'sm:gap-6'}`}>
    <img src={imageUrl} alt="" className={`${compact ? 'size-20' : 'size-24'} shrink-0 rounded-md object-cover`} onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE.cart }} />
    <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className={`truncate font-heading font-semibold text-fg-strong ${titleClass}`}>{item.productName}</h3><GiftBoxInfo variantLabel={item.variantLabel} />{!parseGiftBoxMetadata(item.variantLabel) && item.variantLabel && <p className="mt-1 text-xs text-fg-subtle">{item.variantLabel}</p>}</div><button type="button" onClick={() => onRemove(item.productId, item.variantId)} className="grid size-9 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-danger-bg hover:text-danger" aria-label={`Xóa ${item.productName}`}><Trash2 className="size-4" /></button></div><p className="mt-2 text-sm font-semibold text-brand-fg">{formatPrice(item.price)}</p><div className="mt-3 flex items-center justify-between gap-3"><QuantityStepper value={item.quantity} onChange={(quantity) => { if (quantity === 0) onRemove(item.productId, item.variantId); else onQuantityChange(item.productId, quantity, item.variantId) }} min={1} label={`số lượng ${item.productName}`} /><span className="text-sm font-semibold tabular-nums text-fg">{formatPrice(itemTotal)}</span></div></div>
  </article>
}
