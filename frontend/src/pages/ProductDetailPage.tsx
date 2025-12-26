// Product detail page - displays full product information with variants
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import PriceDisplay from '../components/ui/PriceDisplay'
import { getImageUrl } from '../utils/getImageUrl'
import { getProductById, Product, getProductVariants, ProductVariant } from '../services/productService'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { ArrowLeft } from 'lucide-react'

import { FALLBACK_IMAGE } from '../constants/images'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { showSuccess, showError, showWarning } = useToast()
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
      showWarning('Vui lòng chọn biến thể sản phẩm')
      return
    }

    // Check stock
    if (selectedVariant && selectedVariant.muc_gioi_han_ton <= 0) {
      showError('Sản phẩm đã hết hàng')
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
      showSuccess('Đã thêm vào giỏ hàng!')
    } catch (error) {
      console.error('Error adding to cart:', error)
      showError('Có lỗi xảy ra. Vui lòng thử lại.')
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
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-[52%_48%] gap-8 lg:gap-10">
          {/* Product Image - Limited height for balance */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card className="p-0 overflow-hidden" style={{ maxHeight: '75vh' }}>
              <img
                src={product.hinh_anh_url ? getImageUrl(product.hinh_anh_url) : FALLBACK_IMAGE.productDetail}
                alt={product.ten}
                className="w-full h-full object-cover"
                style={{ maxHeight: '75vh' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = FALLBACK_IMAGE.productDetail
                }}
              />
            </Card>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Product Identity */}
            <div className="mb-5">
              {product.danh_muc && (
                <Badge className="mb-3">{product.danh_muc}</Badge>
              )}
              <h1 className="font-heading text-3xl md:text-4xl font-semibold text-text-primary mb-3 leading-tight">
                {product.ten}
              </h1>
              <p className="text-text-secondary text-base leading-relaxed">
                {product.mo_ta || 'Sản phẩm chất lượng cao từ Leaf Creme.'}
              </p>
            </div>

            {/* Purchase Decision Group */}
            <div className="bg-background-secondary/30 rounded-2xl p-5 mb-5">
              {/* Variants Selection */}
              {variants.length > 0 && (
                <div className="mb-5">
                  <h3 className="font-semibold text-text-primary mb-2.5 text-sm">
                    Chọn biến thể:
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {variants.map((variant) => (
                      <button
                        key={variant.bienthe_id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-3.5 py-2 rounded-lg border transition-default text-sm ${
                          selectedVariant?.bienthe_id === variant.bienthe_id
                            ? 'border-accent-brown bg-accent-brown/10 font-medium'
                            : 'border-border hover:border-accent-brown'
                        }`}
                      >
                        {getVariantLabel(variant)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-baseline gap-3">
                  <PriceDisplay 
                    price={getDisplayPrice()} 
                    className="text-3xl md:text-4xl font-medium"
                  />
                  {selectedVariant && (
                    <PriceDisplay 
                      price={Number(product.gia_co_ban)}
                      className="text-sm"
                      strikethrough
                    />
                  )}
                </div>
                {selectedVariant && (
                  <p className="text-text-secondary text-sm mt-1.5">
                    {selectedVariant.muc_gioi_han_ton > 0
                      ? `Còn ${selectedVariant.muc_gioi_han_ton} sản phẩm`
                      : 'Hết hàng'}
                  </p>
                )}
              </div>
            </div>

            {/* Add to Cart - Prominent CTA */}
            <div>
              <Button
                variant="primary"
                className="w-full py-3.5 text-base font-semibold shadow-md hover:shadow-lg"
                onClick={handleAddToCart}
                disabled={
                  addingToCart ||
                  (variants.length > 0 &&
                    (!selectedVariant ||
                      (selectedVariant.muc_gioi_han_ton <= 0)))
                }
              >
                {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

