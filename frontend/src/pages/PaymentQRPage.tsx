// Payment QR Page - Giống MoMo Gateway
import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { formatPrice } from '../utils/formatPrice'
import type { MomoQRPaymentInfo } from '../services/paymentService'

export default function PaymentQRPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState(600) // 10 phút = 600 giây
  
  const paymentInfo = location.state?.paymentInfo as MomoQRPaymentInfo | undefined

  useEffect(() => {
    if (!paymentInfo) {
      navigate('/')
    }
  }, [paymentInfo, navigate])

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  if (!paymentInfo) {
    return null
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const handleBack = () => {
    navigate(`/orders/${id}/success?payment_status=pending&payment_method=momo_qr`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header giống MoMo */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center gap-3">
          <div className="w-12 h-12 bg-[#A50064] rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">
            Cổng thanh toán MoMo
          </h1>
        </div>
      </div>

      {/* Main Content - Layout 2 cột giống MoMo */}
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Bên trái - Thông tin đơn hàng */}
          <div className="bg-white">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Thông tin đơn hàng
              </h2>

              {/* Nhà cung cấp */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Nhà cung cấp</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">LC</span>
                  </div>
                  <span className="font-semibold text-gray-800">{paymentInfo.account_name}</span>
                </div>
              </div>

              {/* Mã đơn hàng */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Mã đơn hàng</p>
                <p className="font-semibold text-gray-800">{paymentInfo.transfer_content}</p>
              </div>

              {/* Mô tả */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Mô tả</p>
                <p className="text-gray-700">
                  Thanh toán đơn {paymentInfo.transfer_content}
                </p>
              </div>

              {/* Số tiền - BIG */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Số tiền</p>
                <p className="text-4xl font-bold text-gray-900">
                  {(paymentInfo.amount / 1000).toFixed(3)}đ
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="bg-pink-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-3">Đơn hàng sẽ hết hạn sau:</p>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="bg-white rounded-lg px-4 py-3 shadow-sm">
                      <p className="text-3xl font-bold text-[#A50064]">
                        {minutes.toString().padStart(2, '0')}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Phút</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-white rounded-lg px-4 py-3 shadow-sm">
                      <p className="text-3xl font-bold text-[#A50064]">
                        {seconds.toString().padStart(2, '0')}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Giây</p>
                  </div>
                </div>
              </div>

              {/* Button Quay về */}
              <button
                onClick={handleBack}
                className="w-full mt-6 py-3 text-[#A50064] font-semibold text-center hover:bg-pink-50 rounded-xl transition-colors"
              >
                Quay về
              </button>
            </div>
          </div>

          {/* Bên phải - QR Code với background gradient pink */}
          <div className="bg-gradient-to-br from-[#D82D8B] to-[#A50064] rounded-2xl p-8 text-white flex flex-col items-center justify-center min-h-[600px]">
            <h2 className="text-2xl font-bold mb-2 text-center">
              Quét mã QR để thanh toán
            </h2>
            <p className="text-white/90 mb-8 text-center text-sm">
              Sử dụng App MoMo hoặc ứng dụng Camera hỗ trợ QR code để quét mã
            </p>

            {/* QR Code - White background */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl mb-6">
              {paymentInfo.qr_code ? (
                <img 
                  src={paymentInfo.qr_code} 
                  alt="MoMo QR Code"
                  className="w-80 h-80"
                />
              ) : paymentInfo.qr_image ? (
                <img 
                  src={paymentInfo.qr_image} 
                  alt="MoMo QR Code"
                  className="w-80 h-80"
                />
              ) : (
                <div className="w-80 h-80 flex items-center justify-center bg-gray-100 rounded-2xl">
                  <p className="text-gray-500">Đang tải QR...</p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                </svg>
                <span className="text-sm font-medium">
                  Sử dụng <strong>App MoMo</strong> hoặc ứng dụng camera hỗ trợ QR code để quét mã
                </span>
              </div>
              
              <p className="text-white/80 text-sm">
                Gặp khó khăn khi thanh toán? <a href="#" className="underline font-semibold text-white hover:text-white/90">Xem Hướng dẫn</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

