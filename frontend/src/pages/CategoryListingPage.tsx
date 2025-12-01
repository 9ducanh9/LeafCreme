// Category listing page - displays products by category
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import ProductCard from '../components/bakery/ProductCard'
import { getProductsByCategory, Product } from '../services/productService'
import { ArrowLeft, Search, Filter } from 'lucide-react'

const CATEGORY_INFO: Record<string, { name: string; description: string }> = {
  'Mousse Cakes': {
    name: 'Mousse Cakes',
    description: 'Bánh mousse với lớp kem mịn màng, hương vị thanh nhẹ.',
  },
  'Cheesecakes': {
    name: 'Cheesecakes',
    description: 'Bánh phô mai với vị béo ngậy, kết cấu mịn màng.',
  },
  'Crepe Cakes': {
    name: 'Crepe Cakes',
    description: 'Bánh crepe nhiều lớp, nhẹ nhàng và tinh tế.',
  },
  'Gift Boxes': {
    name: 'Gift Boxes',
    description: 'Hộp quà tặng với nhiều loại bánh nhỏ xinh.',
  },
}

export default function CategoryListingPage() {
  const { category } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name')

  useEffect(() => {
    async function fetchProducts() {
      if (!category) {
        setError('Không tìm thấy danh mục')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await getProductsByCategory(category)
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
  }, [category])

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.ten.toLowerCase().includes(query) ||
          p.mo_ta?.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
      )
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
  }, [products, searchQuery, sortBy])

  const categoryInfo = category ? CATEGORY_INFO[category] : null

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

  if (error || !category) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="max-w-[1440px] mx-auto px-6">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Button>
          <ErrorMessage
            message={error || 'Danh mục không tồn tại'}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Header */}
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        {/* Category Header */}
        {categoryInfo && (
          <div className="mb-8">
            <h1 className="font-heading text-4xl font-semibold text-text-primary mb-3">
              {categoryInfo.name}
            </h1>
            <p className="text-text-secondary text-lg">
              {categoryInfo.description}
            </p>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-12 pr-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-text-secondary" />
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'name' | 'price-asc' | 'price-desc'
                  )
                }
                className="px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
              >
                <option value="name">Sắp xếp theo tên</option>
                <option value="price-asc">Giá: Thấp đến cao</option>
                <option value="price-desc">Giá: Cao đến thấp</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-text-secondary">
            Tìm thấy <span className="font-semibold text-text-primary">{filteredProducts.length}</span> sản phẩm
            {searchQuery && ` cho "${searchQuery}"`}
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card className="text-center py-16">
            <p className="text-text-secondary text-lg mb-4">
              {searchQuery
                ? 'Không tìm thấy sản phẩm nào phù hợp với từ khóa của bạn.'
                : 'Chưa có sản phẩm nào trong danh mục này.'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSearchQuery('')}
              >
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
      </div>
    </div>
  )
}


