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
  return <Card interactive className="group p-0">
    <CardMedia ratio="product"><img src={product.hinh_anh_url ? getImageUrl(product.hinh_anh_url) : FALLBACK_IMAGE.product} alt={product.ten} width="600" height="750" loading="lazy" className="size-full object-cover transition-transform duration-slow group-hover:scale-105" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE.product }} /><div className="absolute left-4 top-4">{product.danh_muc && <Badge variant="brand">{product.danh_muc}</Badge>}</div></CardMedia>
    <CardBody className="gap-2"><CardTitle><Link to={`/products/${product.sanpham_id}`} className="outline-none after:absolute after:inset-0 after:z-raised after:content-['']">{product.ten}</Link></CardTitle><p className="line-clamp-2 text-sm text-fg-muted">{product.mo_ta || 'Một món bánh thủ công từ Leaf Creme.'}</p></CardBody>
    <CardFooter className="relative z-sticky justify-between"><span className="font-semibold tabular-nums text-brand-fg">{formatPrice(Number(product.gia_co_ban))}</span><Button href={`/products/${product.sanpham_id}`} variant="ghost" size="sm" className="relative z-sticky">Xem bánh <ArrowUpRight className="size-4" /></Button></CardFooter>
  </Card>
}
