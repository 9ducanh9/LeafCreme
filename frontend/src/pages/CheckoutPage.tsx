// Checkout page - order placement
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/vi'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { formatPrice } from '../utils/formatPrice'
import { createOrder, OrderCreate } from '../services/orderService'
import { ArrowLeft } from 'lucide-react'
import ProtectedRoute from '../components/routing/ProtectedRoute'
import GiftBoxInfo from '../components/cart/GiftBoxInfo'
import { parseGiftBoxMetadata } from '../utils/giftBoxHelpers'
import { FALLBACK_IMAGE } from '../constants/images'

// Configure dayjs
dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('vi')

function CheckoutPageContent() {
  const navigate = useNavigate()
  const { cart, clearCart } = useCart()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [shippingInfo, setShippingInfo] = useState({
    ten_khach_hang: user?.ho_ten || '',
    so_dien_thoai_khach: user?.so_dien_thoai || '',
    dia_chi_giao_hang: user?.dia_chi || '',
    ngay_giao_du_kien: '',
    ghi_chu: '',
  })
  const [deliveryDateTime, setDeliveryDateTime] = useState<Dayjs | null>(null)
  const [deliveryTimeError, setDeliveryTimeError] = useState<string>('')

  const [voucherCode, setVoucherCode] = useState('')

  useEffect(() => {
    if (cart.items.length === 0) {
      navigate('/cart')
    }
  }, [cart.items.length, navigate])

  const handleShippingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!shippingInfo.ten_khach_hang.trim()) {
      setError('Vui lòng nhập tên khách hàng')
      return
    }

    if (!shippingInfo.so_dien_thoai_khach.trim()) {
      setError('Vui lòng nhập số điện thoại')
      return
    }

    if (!shippingInfo.dia_chi_giao_hang.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng')
      return
    }

    // Validate delivery time
    if (deliveryDateTime) {
      const timeError = validateDeliveryTime(deliveryDateTime)
      if (timeError) {
        setError(timeError)
        return
      }
    }

    // Convert cart items to order items
    // Gift boxes use hop_qua_id, products use bienthe_id
    const orderItems = cart.items.map((item) => {
      // Check if this is a gift box (SKU starts with "GIFTBOX-" or variantLabel contains gift_box metadata)
      const isGiftBox = item.sku?.startsWith('GIFTBOX-') || 
                       (item.variantLabel && parseGiftBoxMetadata(item.variantLabel) !== null)
      
      if (isGiftBox) {
        // Extract gift box ID from SKU (format: GIFTBOX-{id})
        const giftBoxId = item.sku?.replace('GIFTBOX-', '')
        return {
          hop_qua_id: giftBoxId ? parseInt(giftBoxId) : undefined,
          so_luong: item.quantity,
        }
      } else {
        // Regular product variant
        return {
          bienthe_id: item.variantId || undefined,
          so_luong: item.quantity,
        }
      }
    })

    // Filter out items without valid ID (either bienthe_id or hop_qua_id)
    const validItems = orderItems.filter((item) => 
      'bienthe_id' in item ? item.bienthe_id : item.hop_qua_id
    )

    if (validItems.length === 0) {
      setError('Giỏ hàng không hợp lệ. Vui lòng kiểm tra lại.')
      return
    }

    setLoading(true)

    try {
      const orderData: OrderCreate = {
        items: validItems,
        ten_khach_hang: shippingInfo.ten_khach_hang,
        so_dien_thoai_khach: shippingInfo.so_dien_thoai_khach,
        dia_chi_giao_hang: shippingInfo.dia_chi_giao_hang,
        ngay_giao_du_kien: deliveryDateTime
          ? deliveryDateTime.toISOString()
          : undefined,
        ghi_chu: shippingInfo.ghi_chu || undefined,
        phieu_giam_gia_codes: voucherCode ? [voucherCode] : undefined,
      }

      const order = await createOrder(orderData, 'online')

      // Clear cart after successful order
      clearCart()

      // Redirect to order confirmation
      navigate(`/orders/${order.donhang_id}/success`)
    } catch (err: any) {
      console.error('Error creating order:', err)
      
      // Handle specific error cases
      let errorMessage = 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.'
      
      if (err.status === 404 && err.detail?.includes('Hộp quà')) {
        // Gift box not found in database
        errorMessage = 'Hộp quà này hiện chưa có sẵn trong hệ thống. Vui lòng liên hệ cửa hàng để đặt hàng hoặc chọn sản phẩm khác.'
      } else if (err.detail) {
        errorMessage = err.detail
      } else if (err.error) {
        errorMessage = err.error
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Calculate minimum delivery time: current time + 2 hours
  // But must be within store hours (8AM - 8PM)
  const getMinDeliveryTime = (): Dayjs => {
    const now = dayjs()
    const minTime = now.add(2, 'hour')
    
    // If minimum time is before 8AM today, set to 8AM today
    const today8AM = now.hour(8).minute(0).second(0).millisecond(0)
    if (minTime.isBefore(today8AM)) {
      return today8AM
    }
    
    // If minimum time is after 8PM today, set to 8AM tomorrow
    const today8PM = now.hour(20).minute(0).second(0).millisecond(0)
    if (minTime.isAfter(today8PM)) {
      return now.add(1, 'day').hour(8).minute(0).second(0).millisecond(0)
    }
    
    return minTime
  }

  const minDeliveryTime = getMinDeliveryTime()
  
  // Store hours: 8AM - 8PM
  const storeOpenHour = 8
  const storeCloseHour = 20

  const validateDeliveryTime = (selectedTime: Dayjs | null): string => {
    if (!selectedTime) return ''
    
    const hour = selectedTime.hour()
    
    // Check if within store hours
    if (hour < storeOpenHour || hour >= storeCloseHour) {
      return 'Thời gian giao hàng phải trong khoảng 8:00 - 20:00'
    }
    
    // Check if at least 2 hours from now
    const now = dayjs()
    const minTime = now.add(2, 'hour')
    if (selectedTime.isBefore(minTime)) {
      return 'Phải đặt trước tối thiểu 2 giờ để chuẩn bị'
    }
    
    return ''
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <Button
          variant="outline"
          onClick={() => navigate('/cart')}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại giỏ hàng
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="sticky top-24">
              <h2 className="font-heading text-2xl font-semibold text-text-primary mb-6">
                Đơn hàng của bạn
              </h2>

              <div className="space-y-4 mb-6">
                {cart.items.map((item) => {
                  const isGiftBox = item.sku?.startsWith('GIFTBOX-') || 
                                   (item.variantLabel && parseGiftBoxMetadata(item.variantLabel) !== null)
                  
                  return (
                    <div 
                      key={`${item.productId}-${item.variantId || 'none'}`} 
                      className={`flex gap-3 ${isGiftBox ? 'pb-4 border-b border-border last:border-b-0' : ''}`}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={item.productImage || FALLBACK_IMAGE.cart}
                          alt={item.productName}
                          className={`object-cover rounded-card ${
                            isGiftBox ? 'w-20 h-20' : 'w-16 h-16'
                          }`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = FALLBACK_IMAGE.cart
                          }}
                        />
                        {isGiftBox && (
                          <div className="absolute -top-1 -right-1 bg-accent-brown text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                            Quà
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-text-primary ${isGiftBox ? 'text-base mb-1' : 'text-sm'}`}>
                          {item.productName}
                        </p>
                        {isGiftBox && (
                          <div className="mt-2 space-y-1.5">
                            <GiftBoxInfo variantLabel={item.variantLabel} />
                          </div>
                        )}
                        {!isGiftBox && !parseGiftBoxMetadata(item.variantLabel) && item.variantLabel && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            {item.variantLabel}
                          </p>
                        )}
                        <p className={`text-text-secondary mt-1 ${isGiftBox ? 'text-sm font-medium' : 'text-sm'}`}>
                          {item.quantity} x {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-text-secondary">
                  <span>Tạm tính:</span>
                  <span className="font-medium text-text-primary">
                    {formatPrice(cart.total)}
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Phí vận chuyển:</span>
                  <span className="font-medium text-text-primary">
                    {formatPrice(0)}
                  </span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between">
                    <span className="font-heading text-xl font-semibold text-text-primary">
                      Tổng cộng:
                    </span>
                    <span className="font-heading text-xl font-semibold text-text-primary">
                      {formatPrice(cart.total)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card>
              <h2 className="font-heading text-3xl font-semibold text-text-primary mb-6">
                Thông tin giao hàng
              </h2>

              {error && <ErrorMessage message={error} />}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="ten_khach_hang"
                      className="block text-sm font-medium text-text-primary mb-2"
                    >
                      Tên khách hàng <span className="text-accent-brown">*</span>
                    </label>
                    <input
                      id="ten_khach_hang"
                      name="ten_khach_hang"
                      type="text"
                      value={shippingInfo.ten_khach_hang}
                      onChange={handleShippingChange}
                      required
                      className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="so_dien_thoai_khach"
                      className="block text-sm font-medium text-text-primary mb-2"
                    >
                      Số điện thoại <span className="text-accent-brown">*</span>
                    </label>
                    <input
                      id="so_dien_thoai_khach"
                      name="so_dien_thoai_khach"
                      type="tel"
                      value={shippingInfo.so_dien_thoai_khach}
                      onChange={handleShippingChange}
                      required
                      className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="dia_chi_giao_hang"
                    className="block text-sm font-medium text-text-primary mb-2"
                  >
                    Địa chỉ giao hàng <span className="text-accent-brown">*</span>
                  </label>
                  <textarea
                    id="dia_chi_giao_hang"
                    name="dia_chi_giao_hang"
                    value={shippingInfo.dia_chi_giao_hang}
                    onChange={handleShippingChange}
                    required
                    rows={3}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default resize-none"
                    disabled={loading}
                    placeholder="Nhập địa chỉ chi tiết"
                  />
                </div>

                <div>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                    <DateTimePicker
                      label="Ngày và giờ giao dự kiến"
                      value={deliveryDateTime}
                      onChange={(newValue) => {
                        setDeliveryDateTime(newValue)
                        const error = validateDeliveryTime(newValue)
                        setDeliveryTimeError(error)
                        
                        if (newValue && !error) {
                          setShippingInfo({
                            ...shippingInfo,
                            ngay_giao_du_kien: newValue.format('YYYY-MM-DD HH:mm'),
                          })
                        } else {
                          setShippingInfo({
                            ...shippingInfo,
                            ngay_giao_du_kien: '',
                          })
                        }
                      }}
                      minDateTime={minDeliveryTime}
                      shouldDisableTime={(value, view) => {
                        if (view === 'hours') {
                          const hour = value.hour()
                          return hour < storeOpenHour || hour >= storeCloseHour
                        }
                        return false
                      }}
                      format="DD/MM/YYYY HH:mm"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          disabled: loading,
                          error: !!deliveryTimeError,
                          helperText: deliveryTimeError || 'Giờ cửa hàng: 8:00 - 20:00. Đặt trước tối thiểu 2 giờ',
                          className: 'w-full',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px',
                              borderColor: '#E8E5DD',
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#C59B72',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#C59B72',
                              },
                              '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#d32f2f',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#7A6F63',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              '&.Mui-focused': {
                                color: '#C59B72',
                              },
                            },
                            '& .MuiInputBase-input': {
                              padding: '12px 16px',
                              color: '#473C2F',
                            },
                            '& .MuiFormHelperText-root': {
                              color: '#7A6F63',
                              fontSize: '0.75rem',
                            },
                          },
                        },
                      }}
                    />
                  </LocalizationProvider>
                </div>

                <div>
                  <label
                    htmlFor="voucherCode"
                    className="block text-sm font-medium text-text-primary mb-2"
                  >
                    Mã giảm giá (nếu có)
                  </label>
                  <input
                    id="voucherCode"
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                    disabled={loading}
                    placeholder="Nhập mã giảm giá"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ghi_chu"
                    className="block text-sm font-medium text-text-primary mb-2"
                  >
                    Ghi chú đơn hàng
                  </label>
                  <textarea
                    id="ghi_chu"
                    name="ghi_chu"
                    value={shippingInfo.ghi_chu}
                    onChange={handleShippingChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default resize-none"
                    disabled={loading}
                    placeholder="Ghi chú thêm cho đơn hàng (tùy chọn)"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full py-4 text-lg"
                    disabled={loading || cart.items.length === 0}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        Đang xử lý...
                      </span>
                    ) : (
                      'Đặt hàng'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutPageContent />
    </ProtectedRoute>
  )
}


