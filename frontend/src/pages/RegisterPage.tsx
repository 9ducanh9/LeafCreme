// Register page component
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import ErrorMessage from '../components/ui/ErrorMessage'

// Default customer role ID (vaitro_id = 4 for customer)
// This should match your database setup
const DEFAULT_CUSTOMER_ROLE_ID = 4

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    ten_dang_nhap: '',
    email: '',
    mat_khau: '',
    confirmPassword: '',
    ho_ten: '',
    so_dien_thoai: '',
    dia_chi: '',
    ngay_sinh: '',
    gioi_tinh: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (formData.mat_khau !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    if (formData.mat_khau.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)

    try {
      await register({
        ten_dang_nhap: formData.ten_dang_nhap,
        email: formData.email,
        mat_khau: formData.mat_khau,
        ho_ten: formData.ho_ten,
        vaitro_id: DEFAULT_CUSTOMER_ROLE_ID,
        so_dien_thoai: formData.so_dien_thoai || undefined,
        dia_chi: formData.dia_chi || undefined,
        ngay_sinh: formData.ngay_sinh || undefined,
        gioi_tinh: formData.gioi_tinh || undefined,
      })
      // Redirect to home page after successful registration
      navigate('/')
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
      setError((typeof detail === 'string' && detail) || 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-16 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-semibold text-text-primary mb-2">
            Leaf Creme
          </h1>
          <p className="text-text-secondary">Tạo tài khoản mới</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <ErrorMessage message={error} />}

            <div>
              <label htmlFor="ho_ten" className="block text-sm font-medium text-text-primary mb-2">
                Họ và tên <span className="text-accent-brown">*</span>
              </label>
              <input
                id="ho_ten"
                name="ho_ten"
                type="text"
                value={formData.ho_ten}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                placeholder="Nhập họ và tên"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="ten_dang_nhap" className="block text-sm font-medium text-text-primary mb-2">
                Tên đăng nhập <span className="text-accent-brown">*</span>
              </label>
              <input
                id="ten_dang_nhap"
                name="ten_dang_nhap"
                type="text"
                value={formData.ten_dang_nhap}
                onChange={handleChange}
                required
                minLength={3}
                className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                placeholder="Nhập tên đăng nhập (tối thiểu 3 ký tự)"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Email <span className="text-accent-brown">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                placeholder="Nhập email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="mat_khau" className="block text-sm font-medium text-text-primary mb-2">
                Mật khẩu <span className="text-accent-brown">*</span>
              </label>
              <input
                id="mat_khau"
                name="mat_khau"
                type="password"
                value={formData.mat_khau}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                Xác nhận mật khẩu <span className="text-accent-brown">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                placeholder="Nhập lại mật khẩu"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="so_dien_thoai" className="block text-sm font-medium text-text-primary mb-2">
                Số điện thoại
              </label>
              <input
                id="so_dien_thoai"
                name="so_dien_thoai"
                type="tel"
                value={formData.so_dien_thoai}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                placeholder="Nhập số điện thoại (tùy chọn)"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="dia_chi" className="block text-sm font-medium text-text-primary mb-2">
                Địa chỉ
              </label>
              <input
                id="dia_chi"
                name="dia_chi"
                type="text"
                value={formData.dia_chi}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                placeholder="Nhập địa chỉ (tùy chọn)"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ngay_sinh" className="block text-sm font-medium text-text-primary mb-2">
                  Ngày sinh
                </label>
                <input
                  id="ngay_sinh"
                  name="ngay_sinh"
                  type="date"
                  value={formData.ngay_sinh}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="gioi_tinh" className="block text-sm font-medium text-text-primary mb-2">
                  Giới tính
                </label>
                <select
                  id="gioi_tinh"
                  name="gioi_tinh"
                  value={formData.gioi_tinh}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                  disabled={loading}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-4 mt-6"
              disabled={loading}
            >
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-secondary text-sm">
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                className="text-accent-brown hover:underline font-medium"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}


