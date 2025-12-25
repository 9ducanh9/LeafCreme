// Gift box detail page - compact, product-focused layout
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useGiftBoxDetail } from '../hooks/useGiftBoxDetail'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { FALLBACK_IMAGE, GIFT_BOX_IMAGES } from '../constants/images'
import Button from '../components/ui/Button'
import { useToast } from '../contexts/ToastContext'
import { formatPrice } from '../utils/formatPrice'
import GiftBoxGallery from '../components/bakery/GiftBoxGallery'
import GiftBoxSummary from '../components/bakery/GiftBoxSummary'
import GiftBoxStory from '../components/bakery/GiftBoxStory'
import Card from '../components/ui/Card'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
  const [showMobileOptions, setShowMobileOptions] = useState(false)

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
        {/* Back Button */}
        <button
          onClick={() => navigate('/gift-boxes')}
          className="text-sm text-text-secondary hover:text-text-primary transition-default mb-6"
        >
          ← Quay lại danh sách
        </button>

        {/* Main Content - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Image Gallery */}
          <div>
            <GiftBoxGallery giftBox={giftBox} />
          </div>

          {/* Right Column: Product Info + Summary */}
          <div className="flex flex-col gap-6">
            {/* Title & Subtitle - Always visible */}
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-semibold text-text-primary mb-2">
                {giftBox.name}
              </h1>
              <p className="text-sm text-text-secondary">{giftBox.subtitle}</p>
            </div>

            {/* All-in-one Summary Card - Desktop only, sticky */}
            <div className="hidden lg:block">
              <GiftBoxSummary
                giftBox={giftBox}
                giftMessage={giftMessage}
                addCard={addCard}
                onGiftMessageChange={setGiftMessage}
                onAddCardChange={setAddCard}
                onAddToCart={handleAddToCart}
                loading={isAddingToCart}
              />
            </div>

            {/* Mobile: Separate sections */}
            <div className="lg:hidden space-y-6">
              {/* Included Items */}
              <Card className="p-4">
                <h2 className="font-heading text-base font-semibold text-text-primary mb-3">
                  Sản phẩm bao gồm
                </h2>
                <ul className="space-y-2">
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
              </Card>

              {/* Price & CTA */}
              <Card className="p-4">
                <div className="mb-4">
                  <span className="font-heading text-2xl font-semibold text-text-primary">
                    {formatPrice(giftBox.price)}
                  </span>
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}
                </Button>

                {/* Optional Add-ons - Collapsible */}
                <div className="border-t border-border pt-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowMobileOptions(!showMobileOptions)}
                    className="w-full flex items-center justify-between text-sm font-medium text-text-secondary hover:text-text-primary transition-default py-1"
                  >
                    <span>Tùy chọn thêm</span>
                    {showMobileOptions ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showMobileOptions && (
                    <div className="mt-4 space-y-4">
                      {/* Gift Message */}
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-2">
                          Lời nhắn tặng kèm (tùy chọn)
                        </label>
                        <textarea
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value)}
                          placeholder="Nhập lời nhắn của bạn..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:border-accent-brown transition-default resize-none"
                        />
                      </div>

                      {/* Add Card */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="addCardMobile"
                          checked={addCard}
                          onChange={(e) => setAddCard(e.target.checked)}
                          className="w-4 h-4 text-accent-brown border-border rounded focus:ring-accent-brown"
                        />
                        <label htmlFor="addCardMobile" className="ml-2 text-sm text-text-secondary">
                          Thêm thiệp chúc mừng
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Story - Collapsible, below summary */}
            <GiftBoxStory story={giftBox.story} />
          </div>
        </div>
      </div>
    </div>
  )
}

