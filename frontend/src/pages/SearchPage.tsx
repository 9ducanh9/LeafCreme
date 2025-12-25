// Search results page - displays search results with filters
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import ProductCard from '../components/bakery/ProductCard'
import { getProducts, getProductVariants } from '../services/productService'
import type { Product, ProductFilters, ProductVariant } from '../types/product'
import { Search, X } from 'lucide-react'

const PAGE_SIZE = 8
const SEARCH_DEBOUNCE_MS = 500 // Debounce 500ms

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Record<number, ProductVariant[]>>({})
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams.get('q') || '')
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || '')
  const [flavorFilter, setFlavorFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name')
  const [currentPage, setCurrentPage] = useState(1)
  const debounceTimerRef = useRef<number | null>(null)

  // Get unique categories and flavors from products
  const categories = Array.from(
    new Set(products.map((p) => p.danh_muc).filter(Boolean))
  ).sort()

  const flavorOptions = Array.from(
    new Set(
      Object.values(variants)
        .flat()
        .map((v) => v.huong_vi)
        .filter(Boolean)
    )
  ).sort()

  // Debounce search query
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, SEARCH_DEBOUNCE_MS)

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  // Fetch all products and variants (only when debounced query or category changes)
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError(null)
        
        const filters: ProductFilters = {
          dang_hoat_dong: true,
          limit: 1000,
        }
        
        if (debouncedSearchQuery.trim()) {
          filters.search = debouncedSearchQuery.trim()
        }
        
        if (categoryFilter) {
          filters.danh_muc = categoryFilter
        }

        const data = await getProducts(filters)
        setProducts(data)

        // Fetch variants for bien_the products
        const bienTheProducts = data.filter(p => p.loai === 'bien_the')
        const variantsMap: Record<number, ProductVariant[]> = {}
        
        await Promise.all(
          bienTheProducts.map(async (product) => {
            try {
              const productVariants = await getProductVariants(product.sanpham_id)
              variantsMap[product.sanpham_id] = productVariants
            } catch (error) {
              // Skip if variant fetch fails
            }
          })
        )
        
        setVariants(variantsMap)
      } catch (err) {
        setError('Không thể tải sản phẩm. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [debouncedSearchQuery, categoryFilter])

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products]

    // Filter by flavor
    if (flavorFilter) {
      filtered = filtered.filter(p => {
        if (p.loai !== 'bien_the') return false
        const productVariants = variants[p.sanpham_id] || []
        return productVariants.some(v => v.huong_vi === flavorFilter)
      })
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.ten.localeCompare(b.ten)
        case 'price-asc':
          return Number(a.gia_co_ban) - Number(b.gia_co_ban)
        case 'price-desc':
          return Number(b.gia_co_ban) - Number(a.gia_co_ban)
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [products, variants, flavorFilter, sortBy])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Update debounced query immediately when form is submitted
    setDebouncedSearchQuery(searchQuery)
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    }
    if (categoryFilter) {
      params.set('category', categoryFilter)
    }
    setSearchParams(params)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setFlavorFilter('')
    setSearchParams({})
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery.trim() || categoryFilter || flavorFilter

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        {/* Filters Bar - All in one row */}
        <Card className="mb-8 mt-8">
            <form onSubmit={handleSearch}>
              <div className="flex flex-wrap items-end gap-4">
                {/* Search Input */}
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Tìm kiếm
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm sản phẩm..."
                      className="w-full pl-10 pr-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default text-sm"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-default"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Filter */}
                <div className="w-full sm:w-44">
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Danh mục
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value)
                      const params = new URLSearchParams()
                      if (searchQuery.trim()) {
                        params.set('q', searchQuery.trim())
                      }
                      if (e.target.value) {
                        params.set('category', e.target.value)
                      }
                      setSearchParams(params)
                      setCurrentPage(1)
                    }}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default text-sm"
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Flavor Filter */}
                <div className="w-full sm:w-44">
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Hương vị
                  </label>
                  <select
                    value={flavorFilter}
                    onChange={(e) => {
                      setFlavorFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    disabled={flavorOptions.length === 0}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Tất cả hương vị</option>
                    {flavorOptions.map((flavor) => (
                      <option key={flavor} value={flavor}>
                        {flavor}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="w-full sm:w-44">
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Sắp xếp
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as 'name' | 'price-asc' | 'price-desc')
                      setCurrentPage(1)
                    }}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default text-sm"
                  >
                    <option value="name">Mặc định</option>
                    <option value="price-asc">Giá: Thấp đến cao</option>
                    <option value="price-desc">Giá: Cao đến thấp</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="w-full sm:w-auto">
                    <label className="block text-xs font-medium text-text-secondary mb-2 opacity-0">
                      &nbsp;
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearFilters}
                      className="w-full sm:w-auto text-sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Xóa bộ lọc
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </Card>

        {/* Error State */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {/* Results */}
        {!error && (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-xs md:text-sm text-text-secondary">
                {hasActiveFilters ? (
                  <>
                    Tìm thấy <span className="font-semibold text-text-primary">{filteredProducts.length}</span> sản phẩm
                    {searchQuery && ` cho "${searchQuery}"`}
                    {categoryFilter && ` trong danh mục "${categoryFilter}"`}
                    {flavorFilter && ` với hương vị "${flavorFilter}"`}
                  </>
                ) : (
                  <>
                    Hiển thị <span className="font-semibold text-text-primary">{filteredProducts.length}</span> sản phẩm
                  </>
                )}
              </p>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <Card className="text-center py-16">
                <Search className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
                <h2 className="font-heading text-2xl font-semibold text-text-primary mb-3">
                  Không tìm thấy sản phẩm
                </h2>
                <p className="text-text-secondary mb-8">
                  {hasActiveFilters
                    ? 'Không có sản phẩm nào phù hợp với bộ lọc của bạn. Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.'
                    : 'Chưa có sản phẩm nào trong hệ thống.'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.sanpham_id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm rounded-button border border-border text-text-secondary hover:border-accent-brown transition-default disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    
                    <div className="flex items-center gap-3">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`transition-default text-base ${
                            currentPage === page
                              ? 'text-text-primary font-medium'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm rounded-button border border-border text-text-secondary hover:border-accent-brown transition-default disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
