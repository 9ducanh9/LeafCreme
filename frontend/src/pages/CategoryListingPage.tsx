import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ProductCard from '../components/bakery/ProductCard'
import Container from '../components/layout/container'
import ProductGrid from '../components/layout/product-grid'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Alert from '../components/ui/Alert'
import { getProductsByCategory } from '../services/productService'
import type { Product } from '../types/product'

const descriptions: Record<string, string> = { 'Bánh kem': 'Cho những khoảnh khắc đáng nhớ, ngọt ngào và ấm áp.', 'Bông lan': 'Mềm mại, nhẹ nhàng như một cái ôm ấm áp.', Mousse: 'Mịn màng, thanh nhẹ cho những phút giây thư giãn.', Tiramisu: 'Cổ điển và đậm đà, như một tách cà phê buổi sáng.' }
type Sort = 'name' | 'price-asc' | 'price-desc'

export default function CategoryListingPage() {
  const { category } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sort = (params.get('sort') as Sort) || 'name'
  useEffect(() => { if (!category) return; setLoading(true); getProductsByCategory(category).then(setProducts).catch(() => setError('Không thể tải danh mục này.')).finally(() => setLoading(false)) }, [category])
  const sorted = useMemo(() => [...products].sort((a, b) => sort === 'name' ? a.ten.localeCompare(b.ten) : sort === 'price-asc' ? Number(a.gia_co_ban) - Number(b.gia_co_ban) : Number(b.gia_co_ban) - Number(a.gia_co_ban)), [products, sort])
  const title = category || 'Danh mục sản phẩm'
  if (loading) return <div className="py-12"><Container><Skeleton className="mb-3 h-4 w-24" /><Skeleton className="mb-10 h-12 w-72" /><ProductGrid>{Array.from({ length: 8 }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="aspect-[4/3]" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /></div>)}</ProductGrid></Container></div>
  return <div className="bg-bg-canvas py-8 sm:py-12"><Container><Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 -ml-2"><ArrowLeft className="size-4" />Quay lại</Button><div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Danh mục</p><h1 className="mt-2 text-h1">{title}</h1><p className="mt-3 max-w-2xl text-fg-muted">{descriptions[title] || 'Khám phá những món bánh thủ công của Leaf Creme.'}</p></div><label className="flex items-center gap-3 text-sm text-fg-muted">Sắp xếp<select value={sort} onChange={(event) => setParams({ sort: event.target.value })} className="h-10 rounded-md border border-interactive bg-bg-surface px-3 text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus"><option value="name">Tên</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select></label></div>{error && <Alert variant="danger" className="mb-8">{error}</Alert>}{!error && sorted.length === 0 ? <EmptyState title="Danh mục đang được chuẩn bị" description="Bếp chưa có món nào trong danh mục này. Hãy xem menu đầy đủ để tìm một món khác." action={<Button href="/search" variant="outline">Xem toàn bộ menu</Button>} /> : <><p className="mb-5 text-sm text-fg-muted"><span className="font-semibold text-fg">{sorted.length}</span> món bánh</p><ProductGrid>{sorted.map((product) => <ProductCard key={product.sanpham_id} product={product} />)}</ProductGrid></>}</Container></div>
}
