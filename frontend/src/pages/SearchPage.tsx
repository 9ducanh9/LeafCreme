import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import ProductCard from '../components/bakery/ProductCard'
import Container from '../components/layout/container'
import ProductGrid from '../components/layout/product-grid'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Alert from '../components/ui/Alert'
import { getProducts } from '../services/productService'
import type { Product } from '../types/product'

type Sort = 'name' | 'price-asc' | 'price-desc'
const pageSize = 12

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const query = params.get('q') || ''
  const category = params.get('category') || ''
  const sort = (params.get('sort') as Sort) || 'name'
  const page = Math.max(1, Number(params.get('page') || 1))
  const [search, setSearch] = useState(query)

  useEffect(() => setSearch(query), [query])
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    getProducts({ dang_hoat_dong: true, limit: 100, search: query || undefined, danh_muc: category || undefined })
      .then((data) => { if (!cancelled) setProducts(data) })
      .catch(() => { if (!cancelled) setError('Không thể tải sản phẩm. Vui lòng thử lại sau.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [category, query])

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.danh_muc).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)), [products])
  const sorted = useMemo(() => [...products].sort((a, b) => sort === 'name' ? a.ten.localeCompare(b.ten) : sort === 'price-asc' ? Number(a.gia_co_ban) - Number(b.gia_co_ban) : Number(b.gia_co_ban) - Number(a.gia_co_ban)), [products, sort])
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const visible = sorted.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize)
  const update = (next: Record<string, string | undefined>) => { const nextParams = new URLSearchParams(params); Object.entries(next).forEach(([key, value]) => value ? nextParams.set(key, value) : nextParams.delete(key)); if ('page' in next === false) nextParams.delete('page'); setParams(nextParams) }
  const submit = (event: FormEvent) => { event.preventDefault(); update({ q: search.trim() || undefined }) }
  const clear = () => { setSearch(''); setParams({}) }

  return <div className="bg-bg-canvas py-8 sm:py-12"><Container><div className="mb-10"><p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Menu Leaf Creme</p><h1 className="mt-2 text-h1">Tìm món bánh cho hôm nay</h1><p className="mt-3 max-w-2xl text-fg-muted">Những món bánh làm thủ công, chọn theo dịp hoặc theo một cơn thèm ngọt.</p></div><Card className="mb-8"><form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]"><div><label htmlFor="catalog-search" className="mb-2 block text-sm font-medium text-fg">Tìm kiếm</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" /><input id="catalog-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên bánh, hương vị..." className="h-11 w-full rounded-md border border-interactive bg-bg-surface pl-10 pr-10 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-fg-subtle hover:bg-bg-subtle" aria-label="Xóa tìm kiếm"><X className="size-4" /></button>}</div></div><div><label htmlFor="catalog-category" className="mb-2 block text-sm font-medium text-fg">Danh mục</label><select id="catalog-category" value={category} onChange={(event) => update({ category: event.target.value || undefined })} className="h-11 w-full rounded-md border border-interactive bg-bg-surface px-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus"><option value="">Tất cả</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div><label htmlFor="catalog-sort" className="mb-2 block text-sm font-medium text-fg">Sắp xếp</label><select id="catalog-sort" value={sort} onChange={(event) => update({ sort: event.target.value })} className="h-11 w-full rounded-md border border-interactive bg-bg-surface px-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus"><option value="name">Tên sản phẩm</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select></div><div className="flex items-end gap-2"><Button type="submit" variant="primary" className="flex-1 lg:flex-none"><Search className="size-4" />Tìm</Button>{(query || category || sort !== 'name') && <Button type="button" variant="ghost" onClick={clear} aria-label="Xóa bộ lọc"><SlidersHorizontal className="size-4" /></Button>}</div></form></Card>{error && <Alert variant="danger" title="Không tải được menu" className="mb-8">{error}</Alert>}{loading ? <ProductGrid>{Array.from({ length: 8 }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="aspect-[4/3]" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /></div>)}</ProductGrid> : sorted.length === 0 ? <EmptyState title="Chưa tìm thấy món phù hợp" description="Thử một từ khóa khác hoặc xem toàn bộ menu của Leaf Creme." action={<Button variant="outline" onClick={clear}>Xem toàn bộ menu</Button>} /> : <><div className="mb-5 flex items-center justify-between text-sm text-fg-muted"><p><span className="font-semibold text-fg">{sorted.length}</span> món bánh</p>{query && <p>Cho “{query}”</p>}</div><ProductGrid>{visible.map((product) => <ProductCard key={product.sanpham_id} product={product} />)}</ProductGrid>{totalPages > 1 && <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Phân trang"><Button variant="outline" size="sm" onClick={() => update({ page: String(Math.max(1, page - 1)) })} disabled={page <= 1}>Trước</Button><span className="text-sm text-fg-muted">Trang {page} / {totalPages}</span><Button variant="outline" size="sm" onClick={() => update({ page: String(Math.min(totalPages, page + 1)) })} disabled={page >= totalPages}>Sau</Button></nav>}</>}</Container></div>
}
