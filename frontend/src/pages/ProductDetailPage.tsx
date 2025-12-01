// Product detail page - displays full product information with variants
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { formatPrice } from '../utils/formatPrice'
import { getProductById, Product, getProductVariants, ProductVariant } from '../services/productService'
import { useCart } from '../contexts/CartContext'
import { ArrowLeft } from 'lucide-react'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    async function fetchProductData() {
      if (!id) {
        setError('Không tìm thấy sản phẩm')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const productId = parseInt(id, 10)
        if (isNaN(productId)) {
          throw new Error('ID sản phẩm không hợp lệ')
        }

        // Fetch product and variants in parallel
        const [productData, variantsData] = await Promise.all([
          getProductById(productId),
          getProductVariants(productId).catch(() => []), // Variants are optional
        ])

        setProduct(productData)
        setVariants(variantsData.filter((v) => v.dang_hoat_dong))

        // Auto-select first variant if available
        if (variantsData.length > 0 && variantsData[0].dang_hoat_dong) {
          setSelectedVariant(variantsData[0])
        }
      } catch (err) {
        console.error('Error fetching product:', err)
        setError('Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    fetchProductData()
  }, [id])

  const handleAddToCart = async () => {
    if (!product) return

    // Check if variant is required but not selected
    if (variants.length > 0 && !selectedVariant) {
      alert('Vui lòng chọn biến thể sản phẩm')
      return
    }

    // Check stock
    if (selectedVariant && selectedVariant.muc_gioi_han_ton <= 0) {
      alert('Sản phẩm đã hết hàng')
      return
    }

    try {
      setAddingToCart(true)

      const price = selectedVariant
        ? Number(selectedVariant.gia_bienthe)
        : Number(product.gia_co_ban)

      const variantLabel = selectedVariant
        ? getVariantLabel(selectedVariant)
        : undefined

      addToCart({
        productId: product.sanpham_id,
        productName: product.ten,
        productImage: product.hinh_anh_url,
        variantId: selectedVariant?.bienthe_id,
        variantLabel,
        price,
        sku: selectedVariant?.sku_bienthe || product.sku,
      })

      // Show success feedback
      alert('Đã thêm vào giỏ hàng!')
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setAddingToCart(false)
    }
  }

  const getDisplayPrice = (): number => {
    if (selectedVariant) {
      return Number(selectedVariant.gia_bienthe)
    }
    if (product) {
      return Number(product.gia_co_ban)
    }
    return 0
  }

  const getVariantLabel = (variant: ProductVariant): string => {
    const parts: string[] = []
    if (variant.huong_vi) parts.push(variant.huong_vi)
    if (variant.kich_thuoc) parts.push(variant.kich_thuoc)
    return parts.join(' - ') || 'Mặc định'
  }

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

  if (error || !product) {
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
            message={error || 'Sản phẩm không tồn tại'}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div>
            <Card className="p-0 overflow-hidden">
              <img
                src={product.hinh_anh_url || FALLBACK_IMAGE}
                alt={product.ten}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = FALLBACK_IMAGE
                }}
              />
            </Card>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-6">
              {product.danh_muc && (
                <Badge className="mb-4">{product.danh_muc}</Badge>
              )}
              <h1 className="font-heading text-4xl font-semibold text-text-primary mb-4">
                {product.ten}
              </h1>
              <p className="text-text-secondary text-lg mb-6">
                {product.mo_ta || 'Sản phẩm chất lượng cao từ Leaf Creme.'}
              </p>
            </div>

            {/* Variants Selection */}
            {variants.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-text-primary mb-3">
                  Chọn biến thể:
                </h3>
                <div className="flex flex-wrap gap-3">
                  {variants.map((variant) => (
                    <button
                      key={variant.bienthe_id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 rounded-button border transition-default ${
                        selectedVariant?.bienthe_id === variant.bienthe_id
                          ? 'border-accent-brown bg-accent-brown/10'
                          : 'border-border hover:border-accent-brown'
                      }`}
                    >
                      <span className="text-sm text-text-primary">
                        {getVariantLabel(variant)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="mb-8">
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-4xl font-semibold text-text-primary tracking-tight">
                  {formatPrice(getDisplayPrice())}
                </span>
                {selectedVariant && (
                  <span className="text-text-secondary text-sm line-through">
                    {formatPrice(Number(product.gia_co_ban))}
                  </span>
                )}
              </div>
              {selectedVariant && (
                <p className="text-text-secondary text-sm mt-2">
                  {selectedVariant.muc_gioi_han_ton > 0
                    ? `Còn ${selectedVariant.muc_gioi_han_ton} sản phẩm`
                    : 'Hết hàng'}
                </p>
              )}
            </div>

            {/* Add to Cart Button */}
            <div className="mt-auto">
              <Button
                variant="primary"
                className="w-full py-4 text-lg"
                onClick={handleAddToCart}
                disabled={
                  addingToCart ||
                  (variants.length > 0 &&
                    (!selectedVariant ||
                      (selectedVariant.muc_gioi_han_ton <= 0)))
                }
              >
                {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}
              </Button>
            </div>

            {/* Product Details */}
            <div className="mt-8 pt-8 border-t border-border">
              <h3 className="font-semibold text-text-primary mb-3">
                Thông tin sản phẩm
              </h3>
              <div className="space-y-2 text-sm text-text-secondary">
                <p>
                  <span className="font-medium">SKU:</span> {product.sku}
                </p>
                {product.don_vi_tinh && (
                  <p>
                    <span className="font-medium">Đơn vị:</span>{' '}
                    {product.don_vi_tinh}
                  </p>
                )}
                {product.loai && (
                  <p>
                    <span className="font-medium">Loại:</span>{' '}
                    {product.loai === 'don'
                      ? 'Đơn'
                      : product.loai === 'bien_the'
                      ? 'Biến thể'
                      : 'Hộp quà'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

