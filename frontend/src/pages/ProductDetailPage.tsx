import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ShoppingBag } from 'lucide-react'
import Card, { CardMedia } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import QuantityStepper from '../components/ui/QuantityStepper'
import Skeleton from '../components/ui/Skeleton'
import Alert from '../components/ui/Alert'
import { getImageUrl } from '../utils/getImageUrl'
import { getProductAvailability, getProductById, getProductVariants } from '../services/productService'
import type { Product, ProductAvailability, ProductVariant } from '../types/product'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { formatPrice } from '../utils/formatPrice'
import { FALLBACK_IMAGE } from '../constants/images'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { addToCart } = useCart()
  const { showSuccess, showError, showWarning } = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [availability, setAvailability] = useState<ProductAvailability[]>([])
  const [selected, setSelected] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => { if (!id) return; const productId = Number.parseInt(id, 10); if (Number.isNaN(productId)) { setError('Sản phẩm không hợp lệ.'); setLoading(false); return } let cancelled = false; Promise.all([getProductById(productId), getProductVariants(productId).catch(() => []), getProductAvailability(productId).catch(() => [])]).then(([data, variantData, stockData]) => { if (cancelled) return; const active = variantData.filter((variant) => variant.dang_hoat_dong); setProduct(data); setVariants(active); setAvailability(stockData); setSelected(active[0] || null) }).catch(() => { if (!cancelled) setError('Không thể tải thông tin sản phẩm.') }).finally(() => { if (!cancelled) setLoading(false) }); return () => { cancelled = true } }, [id])
  const label = (variant: ProductVariant) => variant.kich_thuoc?.trim() || 'Mặc định'
  const price = selected ? Number(selected.gia_bienthe) : Number(product?.gia_co_ban || 0)
  const selectedStock = selected ? availability.find((item) => item.bienthe_id === selected.bienthe_id) : undefined
  const max = selected ? selectedStock?.so_luong_con ?? 0 : undefined
  const outOfStock = selected !== null && max === 0
  const back = () => location.key === 'default' ? navigate('/search') : navigate(-1)
  const add = async () => { if (!product) return; if (variants.length && !selected) { showWarning('Vui lòng chọn biến thể sản phẩm.'); return } if (outOfStock) { showError('Sản phẩm đã hết hàng.'); return } setAdding(true); try { addToCart({ productId: product.sanpham_id, productName: product.ten, productImage: product.hinh_anh_url, category: product.danh_muc, variantId: selected?.bienthe_id, variantLabel: selected ? label(selected) : undefined, price, sku: selected?.sku_bienthe || product.sku, quantity }); showSuccess('Đã thêm vào giỏ hàng.'); } catch { showError('Không thể thêm sản phẩm lúc này.') } finally { setAdding(false) } }
  if (loading) return <div className="py-12"><div className="mx-auto grid max-w-container gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8"><Skeleton className="aspect-square" /><div className="space-y-4"><Skeleton className="h-6 w-28" /><Skeleton className="h-12 w-3/4" /><Skeleton className="h-24 w-full" /><Skeleton className="h-32 w-full" /></div></div></div>
  if (error || !product) return <div className="py-12"><div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8"><Button variant="ghost" onClick={back} className="mb-8 -ml-2"><ArrowLeft className="size-4" />Quay lại</Button><Alert variant="danger" title="Không tìm thấy sản phẩm">{error || 'Sản phẩm không tồn tại.'}</Alert></div></div>
  return <div className="bg-bg-canvas py-8 sm:py-12"><div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8"><Button variant="ghost" onClick={back} className="mb-8 -ml-2"><ArrowLeft className="size-4" />Quay lại</Button><div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12"><div className="lg:sticky lg:top-24 lg:self-start"><Card className="overflow-hidden p-0"><CardMedia ratio="square"><img src={product.hinh_anh_url ? getImageUrl(product.hinh_anh_url) : FALLBACK_IMAGE.productDetail} alt={product.ten} width="900" height="900" className="size-full object-cover" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE.productDetail }} /></CardMedia></Card></div><div><div className="mb-7">{product.danh_muc && <Badge variant="brand">{product.danh_muc}</Badge>}<h1 className="mt-4 text-h1">{product.ten}</h1><p className="mt-4 text-base leading-relaxed text-fg-muted">{product.mo_ta || 'Sản phẩm chất lượng cao từ Leaf Creme.'}</p></div><Card className="bg-bg-subtle p-5 sm:p-6"><div className="flex items-end justify-between gap-4"><span className="font-heading text-3xl font-semibold tabular-nums text-brand-fg">{formatPrice(price)}</span>{outOfStock ? <Badge variant="danger">Hết hàng</Badge> : max !== undefined && max <= 3 ? <Badge variant="warning">Còn {max}</Badge> : <Badge variant="success">Đang có sẵn</Badge>}</div>{variants.length > 0 && <fieldset className="mt-6"><legend className="mb-3 text-sm font-semibold text-fg-strong">Chọn kích thước</legend><div className="grid gap-2 sm:grid-cols-2">{variants.map((variant) => { const variantStock = availability.find((item) => item.bienthe_id === variant.bienthe_id)?.so_luong_con ?? 0; return <label key={variant.bienthe_id} className={`flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm transition-colors ${selected?.bienthe_id === variant.bienthe_id ? 'border-brand bg-brand-subtle text-brand-fg' : 'border-interactive bg-bg-surface text-fg-muted hover:bg-bg-subtle'}`}><span className="flex items-center gap-2"><input type="radio" name="variant" checked={selected?.bienthe_id === variant.bienthe_id} onChange={() => { setSelected(variant); setQuantity(1) }} className="accent-brand" />{label(variant)}</span>{variantStock <= 0 ? <span className="text-xs text-danger">Hết hàng</span> : variantStock <= 3 ? <span className="text-xs text-warning">Còn {variantStock}</span> : null}</label> })}</div></fieldset>}<div className="mt-6 flex items-center justify-between gap-4"><span className="text-sm font-medium text-fg-muted">Số lượng</span><QuantityStepper value={quantity} onChange={setQuantity} max={max} disabled={outOfStock} label={`số lượng ${product.ten}`} /></div><Button type="button" variant="primary" size="lg" onClick={add} disabled={adding || outOfStock || (variants.length > 0 && !selected)} className="mt-6 w-full">{adding ? 'Đang thêm...' : <><ShoppingBag className="size-5" />Thêm vào giỏ hàng</>}</Button></Card><div className="mt-6 grid gap-3 text-sm text-fg-muted sm:grid-cols-2"><div className="rounded-md border border-border-subtle bg-bg-surface p-4"><Check className="mb-2 size-5 text-success" /><p className="font-medium text-fg">Làm theo mẻ nhỏ</p><p className="mt-1">Ưu tiên độ tươi và vị ngon.</p></div><div className="rounded-md border border-border-subtle bg-bg-surface p-4"><Check className="mb-2 size-5 text-success" /><p className="font-medium text-fg">Giao tại Sài Gòn</p><p className="mt-1">Chọn khung giờ khi thanh toán.</p></div></div></div></div></div></div>
}
