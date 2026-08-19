import { Link } from 'react-router-dom'
import Card, { CardBody, CardFooter, CardMedia, CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatPrice } from '../../utils/formatPrice'
import { getImageUrl } from '../../utils/getImageUrl'
import type { Product } from '../../types/product'
import { FALLBACK_IMAGE } from '../../constants/images'
import { ArrowUpRight } from 'lucide-react'

export default function ProductCard({ product }: { product: Product }) {
  return <Card interactive className="group h-full p-0">
    <CardMedia ratio="landscape" className="bg-bg-subtle"><img src={product.hinh_anh_url ? getImageUrl(product.hinh_anh_url) : FALLBACK_IMAGE.product} alt={product.ten} width="800" height="600" loading="lazy" className="size-full object-cover transition-transform duration-slow group-hover:scale-[1.02]" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE.product }} /><div className="absolute left-3 top-3">{product.danh_muc && <Badge variant="brand">{product.danh_muc}</Badge>}</div></CardMedia>
    <CardBody className="gap-1.5 px-4 pb-4 pt-4 sm:gap-2 sm:px-5 sm:pb-5"><CardTitle className="line-clamp-2 text-base sm:text-lg"><Link to={`/products/${product.sanpham_id}`} className="outline-none after:absolute after:inset-0 after:z-raised after:content-['']">{product.ten}</Link></CardTitle><p className="line-clamp-1 text-sm text-fg-muted sm:line-clamp-2">{product.mo_ta || 'Một món bánh thủ công từ Leaf Creme.'}</p></CardBody>
    <CardFooter className="relative z-sticky mt-auto justify-between gap-2 p-4 sm:gap-3 sm:p-5"><span className="font-semibold tabular-nums text-brand-fg">{formatPrice(Number(product.gia_co_ban))}</span><Button href={`/products/${product.sanpham_id}`} variant="ghost" size="sm" className="relative z-sticky shrink-0 px-2 sm:px-3"><span className="sm:hidden">Xem</span><span className="hidden sm:inline">Xem bánh</span><ArrowUpRight className="size-4" /></Button></CardFooter>
  </Card>
}
