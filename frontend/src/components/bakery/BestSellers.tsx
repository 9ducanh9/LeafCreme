// Best Sellers section with 4 specific product cards - fetches from API
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatPrice } from '../../utils/formatPrice'
import { getProducts, Product } from '../../services/productService'
import { FALLBACK_IMAGE } from '../../constants/images'

// Specific product names to display
const BEST_SELLER_PRODUCT_NAMES = [
  'Bánh vanilla trái cây',
  'Bông lan trứng muối phô mai',
  'Mousse matcha phô mai',
  'Tiramisu dâu',
]

export default function BestSellers() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBestSellers() {
      try {
        setLoading(true)
        setError(null)
        // Fetch all active products
        const allProducts = await getProducts({ 
          dang_hoat_dong: true,
          limit: 1000 
        })
        
        // Filter to get only the specific products by name (fuzzy matching)
        const bestSellerProducts = BEST_SELLER_PRODUCT_NAMES.map(productName => {
          const searchTerms = productName.toLowerCase().split(/\s+/)
          return allProducts.find(p => {
            const productNameLower = p.ten.toLowerCase()
            // Try exact match first
            if (productNameLower.includes(productName.toLowerCase())) {
              return true
            }
            // Try matching all key words
            return searchTerms.every(term => productNameLower.includes(term))
          })
        }).filter((p): p is Product => p !== undefined)
        
        // If we don't have enough products, fill with other products
        if (bestSellerProducts.length < 4 && allProducts.length > 0) {
          const foundProductIds = new Set(bestSellerProducts.map(p => p.sanpham_id))
          const additionalProducts = allProducts
            .filter(p => !foundProductIds.has(p.sanpham_id))
            .slice(0, 4 - bestSellerProducts.length)
          
          bestSellerProducts.push(...additionalProducts)
        }
        
        // Log if any products are missing
        if (bestSellerProducts.length < BEST_SELLER_PRODUCT_NAMES.length) {
          console.warn('Best sellers: Some products not found. Expected:', BEST_SELLER_PRODUCT_NAMES.length, 'Found:', bestSellerProducts.length)
          console.warn('Available products:', allProducts.map(p => p.ten))
        }
        
        setProducts(bestSellerProducts.slice(0, 4))
      } catch (err) {
        console.error('Error fetching best sellers:', err)
        setError('Không thể tải sản phẩm. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    fetchBestSellers()
  }, [])

  return (
    <section id="best-sellers" className="py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-medium text-text-primary mb-3 leading-tight">
            Best Sellers Season
          </h2>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed">
            Bốn sản phẩm được yêu thích nhất mùa này, được chọn lọc kỹ lưỡng từ bếp Leaf Crème.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="flex flex-col">
                <div className="relative mb-4 -mx-6 -mt-6 h-64 bg-border animate-pulse rounded-t-card" />
                <div className="h-6 bg-border rounded animate-pulse mb-2" />
                <div className="h-4 bg-border rounded animate-pulse mb-4" />
                <div className="h-8 bg-border rounded animate-pulse" />
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tải lại
            </Button>
          </div>
        )}

        {/* Product Cards Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.length === 0 ? (
              <div className="col-span-4 text-center py-12 text-text-secondary">
                Chưa có sản phẩm nào
              </div>
            ) : (
              products.map((product) => (
                <Card key={product.sanpham_id} className="flex flex-col hover:scale-[1.01] transition-default">
                  {/* Product Image */}
                  <div className="relative mb-4 -mx-6 -mt-6">
                    <img
                      src={product.hinh_anh_url || FALLBACK_IMAGE.product}
                      alt={product.ten}
                      className="w-full h-64 object-cover rounded-t-card"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = FALLBACK_IMAGE.product
                      }}
                    />
                    <div className="absolute top-4 left-4">
                      <Badge>Best Seller</Badge>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="font-heading text-xl font-medium text-text-primary mb-2 leading-tight">
                      {product.ten}
                    </h3>
                    <p className="text-text-secondary mb-4 flex-1">
                      {product.mo_ta || 'Sản phẩm chất lượng cao từ Leaf Creme.'}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-semibold text-xl text-text-primary tracking-tight">
                        {formatPrice(Number(product.gia_co_ban))}
                      </span>
                      <Button
                        variant="outline"
                        className="text-sm"
                        onClick={() => navigate(`/products/${product.sanpham_id}`)}
                      >
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  )
}

