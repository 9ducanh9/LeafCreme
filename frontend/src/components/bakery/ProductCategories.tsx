import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Card, { CardMedia } from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import { getProducts } from '../../services/productService'
import { IMAGE_PATHS, FALLBACK_IMAGE } from '../../constants/images'

const definitions = [
  { name: 'Bánh kem', description: 'Cho những khoảnh khắc đáng nhớ, ngọt ngào và ấm áp.', image: IMAGE_PATHS.categories.banhKem },
  { name: 'Bông lan', description: 'Mềm mại, nhẹ nhàng như một cái ôm ấm áp.', image: IMAGE_PATHS.categories.bongLan },
  { name: 'Mousse', description: 'Mịn màng, thanh nhẹ cho những phút giây thư giãn.', image: IMAGE_PATHS.categories.mousse },
  { name: 'Tiramisu', description: 'Cổ điển và đậm đà, như một tách cà phê buổi sáng.', image: IMAGE_PATHS.categories.tiramisu },
]

export default function ProductCategories() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => { getProducts({ dang_hoat_dong: true, limit: 100 }).then((products) => { const next: Record<string, number> = {}; definitions.forEach((definition) => { next[definition.name] = products.filter((product) => product.danh_muc?.toLowerCase() === definition.name.toLowerCase()).length }); setCounts(next) }).catch(() => undefined).finally(() => setLoading(false)) }, [])
  return <section className="bg-bg-subtle py-12 sm:py-16"><div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Từ căn bếp nhỏ</p><h2 className="mt-2 text-h2">Chọn theo cảm hứng</h2></div><Link to="/search" className="hidden items-center gap-1 text-sm font-medium text-brand-fg hover:text-brand-hover sm:flex">Xem tất cả <ArrowUpRight className="size-4" /></Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{loading ? definitions.map((definition) => <div key={definition.name} className="space-y-3"><Skeleton className="aspect-[4/3]" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /></div>) : definitions.map((definition) => <Link key={definition.name} to={`/categories/${encodeURIComponent(definition.name)}`} className="group rounded-lg focus-visible:ring-2 focus-visible:ring-focus"><Card className="h-full p-0 transition-[box-shadow,transform] duration-normal group-hover:-translate-y-1 group-hover:shadow-md"><CardMedia ratio="square"><img src={definition.image} alt={definition.name} width="600" height="600" loading="lazy" className="size-full object-cover transition-transform duration-slow group-hover:scale-105" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE.product }} /></CardMedia><div className="p-5"><h3 className="font-heading text-lg font-semibold text-fg-strong">{definition.name}</h3><p className="mt-2 text-sm leading-relaxed text-fg-muted">{definition.description}</p>{counts[definition.name] > 0 && <p className="mt-3 text-xs font-medium text-brand-fg">{counts[definition.name]} sản phẩm</p>}</div></Card></Link>)}</div></div></section>
}
