// Search results page - displays search results with filters
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import ProductCard from '../components/bakery/ProductCard'
import { getProducts, Product } from '../services/productService'
import { Search, Filter, X } from 'lucide-react'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || '')
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name')
  const [showFilters, setShowFilters] = useState(false)

  // Get unique categories from products
  const categories = Array.from(
    new Set(products.map((p) => p.danh_muc).filter(Boolean))
  ).sort()

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError(null)
        
        const filters: any = {
          dang_hoat_dong: true,
          limit: 1000, // Get all products for search
        }
        
        if (searchQuery.trim()) {
          filters.search = searchQuery.trim()
        }
        
        if (categoryFilter) {
          filters.danh_muc = categoryFilter
        }

        const data = await getProducts(filters)
        setProducts(data)
        setFilteredProducts(data)
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Không thể tải sản phẩm. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [searchQuery, categoryFilter])

  // Sort products
  useEffect(() => {
    const sorted = [...products].sort((a, b) => {
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
    setFilteredProducts(sorted)
  }, [products, sortBy])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    }
    if (categoryFilter) {
      params.set('category', categoryFilter)
    }
    setSearchParams(params)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setSearchParams({})
  }

  const hasActiveFilters = searchQuery.trim() || categoryFilter

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-semibold text-text-primary mb-6">
            Tìm kiếm sản phẩm
          </h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm, mô tả, SKU..."
                  className="w-full pl-12 pr-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                />
              </div>
              <Button type="submit" variant="primary">
                Tìm kiếm
              </Button>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearFilters}
                >
                  <X className="w-4 h-4 mr-2" />
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </form>

          {/* Filters Toggle (Mobile) */}
          <div className="md:hidden mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Ẩn bộ lọc' : 'Hiển thị bộ lọc'}
            </Button>
          </div>

          {/* Filters */}
          <Card className={`${showFilters ? 'block' : 'hidden'} md:block mb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
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
                  }}
                  className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Sắp xếp
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as 'name' | 'price-asc' | 'price-desc'
                    )
                  }
                  className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                >
                  <option value="name">Sắp xếp theo tên</option>
                  <option value="price-asc">Giá: Thấp đến cao</option>
                  <option value="price-desc">Giá: Cao đến thấp</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

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
              <p className="text-text-secondary">
                {hasActiveFilters ? (
                  <>
                    Tìm thấy <span className="font-semibold text-text-primary">{filteredProducts.length}</span> sản phẩm
                    {searchQuery && ` cho "${searchQuery}"`}
                    {categoryFilter && ` trong danh mục "${categoryFilter}"`}
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
                <h2 className="font-heading text-2xl font-semibold text-text-primary mb-2">
                  Không tìm thấy sản phẩm
                </h2>
                <p className="text-text-secondary mb-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.sanpham_id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


