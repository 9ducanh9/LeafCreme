// Gift box detail page - compact, product-focused layout
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useGiftBoxDetail } from '../hooks/useGiftBoxDetail'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { FALLBACK_IMAGE, GIFT_BOX_IMAGES } from '../constants/images'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { useToast } from '../contexts/ToastContext'
import PriceDisplay from '../components/ui/PriceDisplay'
import GiftBoxGallery from '../components/bakery/GiftBoxGallery'
import GiftBoxStory from '../components/bakery/GiftBoxStory'
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'

export default function GiftBoxDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { giftBox, loading, error } = useGiftBoxDetail(id || '')
  const { addToCart } = useCart()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [giftMessage, setGiftMessage] = useState('')
  const [addCard, setAddCard] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const getImageUrl = () => {
    if (!giftBox) return FALLBACK_IMAGE.giftBoxDetail
    if (giftBox.imageUrl) return giftBox.imageUrl
    if (giftBox.imageKey && GIFT_BOX_IMAGES[giftBox.imageKey]) {
      return GIFT_BOX_IMAGES[giftBox.imageKey]
    }
    return FALLBACK_IMAGE.giftBoxDetail
  }

  const handleAddToCart = async () => {
    if (!giftBox) return

    if (!user) {
      showError('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng')
      navigate('/login', { state: { returnTo: `/gift-boxes/${id}` } })
      return
    }

    setIsAddingToCart(true)
    try {
      addToCart({
        productId: parseInt(giftBox.id) || 0,
        productName: giftBox.name,
        productImage: getImageUrl(),
        price: giftBox.price,
        quantity: 1,
        sku: `GIFTBOX-${giftBox.id}`,
        variantLabel: JSON.stringify({
          type: 'gift_box',
          giftMessage: giftMessage || undefined,
          addCard,
        }),
      })

      showSuccess('Đã thêm hộp quà vào giỏ hàng')
    } catch (err) {
      showError('Không thể thêm vào giỏ hàng')
    } finally {
      setIsAddingToCart(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <div className="text-center py-16">
            <p className="text-text-secondary">Đang tải...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !giftBox) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <div className="text-center py-16">
            <p className="text-text-secondary text-lg mb-4">
              {error || 'Không tìm thấy hộp quà'}
            </p>
            <Button variant="outline" onClick={() => navigate('/gift-boxes')}>
              Quay lại danh sách
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        {/* Back Button - Consistent with Product Page */}
        <Button
          variant="outline"
          onClick={() => navigate('/gift-boxes')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại danh sách
        </Button>

        {/* Main Content - Same Grid as Product Page */}
        <div className="grid grid-cols-1 lg:grid-cols-[52%_48%] gap-8 lg:gap-10">
          {/* Left: Image Gallery - Limited height */}
          <div className="lg:sticky lg:top-6 lg:self-start" style={{ maxHeight: '75vh' }}>
            <GiftBoxGallery giftBox={giftBox} />
          </div>

          {/* Right Column: Same Structure as Product Page */}
          <div className="flex flex-col">
            {/* Product Identity - Consistent with Product Page */}
            <div className="mb-5">
              <Badge className="mb-3">Hộp quà</Badge>
              <h1 className="font-heading text-3xl md:text-4xl font-semibold text-text-primary mb-3 leading-tight">
                {giftBox.name}
              </h1>
              <p className="text-text-secondary text-base leading-relaxed">
                {giftBox.subtitle}
              </p>
            </div>

            {/* Configuration Group - Same Visual Style as Product Variants */}
            <div className="bg-background-secondary/30 rounded-2xl p-5 mb-5">
              {/* Included Items - Aligned with Variant Selection Style */}
              <div className="mb-5">
                <h3 className="font-semibold text-text-primary mb-2.5 text-sm">
                  Sản phẩm bao gồm:
                </h3>
                <ul className="space-y-1.5">
                  {(giftBox.includedItems || []).map((item, index) => (
                    <li key={index} className="flex items-center text-sm text-text-secondary">
                      <span className="w-1.5 h-1.5 bg-accent-brown rounded-full mr-2 flex-shrink-0"></span>
                      <span>
                        {item.name} {item.quantity > 1 && <span className="text-text-primary font-medium">(x{item.quantity})</span>}
                      </span>
                    </li>
                  ))}
                  {(!giftBox.includedItems || giftBox.includedItems.length === 0) && (
                    <li className="text-sm text-text-secondary italic">Đang cập nhật thông tin...</li>
                  )}
                </ul>
              </div>

              {/* Optional Add-ons - Collapsible */}
              <div className="mb-5 pb-4 border-b border-border/50">
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-text-primary hover:text-accent-brown transition-default"
                >
                  <span>Tùy chọn thêm</span>
                  {showOptions ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showOptions && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-border/30">
                    {/* Gift Message */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        Lời nhắn tặng kèm (tùy chọn)
                      </label>
                      <textarea
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="Nhập lời nhắn..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent-brown transition-default resize-none"
                      />
                    </div>

                    {/* Add Card */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="addCard"
                        checked={addCard}
                        onChange={(e) => setAddCard(e.target.checked)}
                        className="w-4 h-4 text-accent-brown border-border rounded focus:ring-accent-brown"
                      />
                      <label htmlFor="addCard" className="ml-2 text-sm text-text-secondary">
                        Thêm thiệp chúc mừng
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Price - Same Position as Product Page */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-baseline gap-3">
                  <PriceDisplay 
                    price={giftBox.price} 
                    className="text-3xl md:text-4xl font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Add to Cart - Same Style as Product Page */}
            <div className="mb-5">
              <Button
                variant="primary"
                className="w-full py-3.5 text-base font-semibold shadow-md hover:shadow-lg"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
              </Button>
            </div>

            {/* Story - Additional Content Below */}
            <GiftBoxStory story={giftBox.story} />
          </div>
        </div>
      </div>
    </div>
  )
}

