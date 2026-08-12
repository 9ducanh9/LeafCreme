import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Eye, EyeOff, LockKeyhole, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import Button from '../components/ui/Button'
import DateInput from '../components/ui/DateInput'
import { useAuth } from '../contexts/AuthContext'
import { FALLBACK_IMAGE } from '../constants/images'
import { cognitoEnabled } from '../config/cognito'

const inputClassName = 'w-full rounded-md border border-interactive bg-bg-surface px-4 py-3 text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow] focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:bg-bg-inset disabled:opacity-70'
const iconInputClassName = inputClassName.replace('px-4', 'px-11')

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    ten_dang_nhap: '', email: '', mat_khau: '', confirmPassword: '', ho_ten: '', so_dien_thoai: '', dia_chi: '', ngay_sinh: '', gioi_tinh: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOptionalFields, setShowOptionalFields] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.mat_khau !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (formData.mat_khau.length < (cognitoEnabled ? 10 : 6)) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    setLoading(true)
    try {
      const registration = await register({
        ten_dang_nhap: formData.ten_dang_nhap,
        email: formData.email,
        mat_khau: formData.mat_khau,
        ho_ten: formData.ho_ten,
        so_dien_thoai: formData.so_dien_thoai || undefined,
        dia_chi: formData.dia_chi || undefined,
        ngay_sinh: formData.ngay_sinh || undefined,
        gioi_tinh: formData.gioi_tinh || undefined,
      })
      navigate(registration.confirmationRequired ? `/verify-email?email=${encodeURIComponent(registration.email)}` : '/')
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
      setError((typeof detail === 'string' && detail) || 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // <div> chứ không <main>: MainLayout đã render <main id="main-content">.
  // HTML chỉ được có MỘT main landmark — hai main làm lệnh "nhảy tới main" của
  // screen reader có hai đích, và skip link trỏ vào main ngoài chứ không phải
  // nội dung của trang này.
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <img src={FALLBACK_IMAGE.giftBoxDetail} alt="Hộp bánh thủ công Leaf Creme" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-bg-overlay" />
        <div className="relative flex h-full max-w-xl flex-col justify-between px-12 py-12 text-fg-on-brand xl:px-16">
          <Link to="/" className="font-heading text-3xl leading-none text-fg-on-brand">Leaf Creme</Link>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-fg-on-brand/70">Bắt đầu thật ngọt ngào</p>
            <h1 className="mt-4 max-w-md text-5xl leading-tight text-fg-on-brand">Những chiếc bánh được làm dành cho bạn.</h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-fg-on-brand/80">Tạo tài khoản để lưu đơn hàng, nhận ưu đãi và quay lại bất cứ lúc nào.</p>
          </div>
          <p className="text-xs tracking-wide text-fg-on-brand/65">Leaf Creme · Bánh làm theo từng mẻ nhỏ</p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-lg">
          <Link to="/" className="font-heading text-3xl leading-none text-text-primary lg:hidden">Leaf Creme</Link>
          <div className="mb-7 mt-12 lg:mt-0">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-accent-brown">Khách hàng mới</p>
            <h1 className="mt-3 text-3xl text-text-primary sm:text-4xl">Tạo tài khoản</h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">Chỉ cần vài thông tin cơ bản để bắt đầu mua sắm.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && <div role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-4 py-3 text-sm leading-6 text-danger">{error}</div>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ho_ten" className="mb-2 block text-sm font-medium text-text-primary">Họ và tên</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} aria-hidden="true" />
                  <input id="ho_ten" name="ho_ten" type="text" autoComplete="name" value={formData.ho_ten} onChange={handleChange} required className={iconInputClassName} placeholder="Nhập họ và tên" disabled={loading} />
                </div>
              </div>
              <div>
                <label htmlFor="ten_dang_nhap" className="mb-2 block text-sm font-medium text-text-primary">Tên đăng nhập</label>
                <input id="ten_dang_nhap" name="ten_dang_nhap" type="text" autoComplete="username" value={formData.ten_dang_nhap} onChange={handleChange} required minLength={3} className={inputClassName} placeholder="Tối thiểu 3 ký tự" disabled={loading} />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-text-primary">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} aria-hidden="true" />
                  <input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} required className={iconInputClassName} placeholder="email@cuaban.com" disabled={loading} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField id="mat_khau" label="Mật khẩu" autoComplete="new-password" value={formData.mat_khau} onChange={handleChange} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} disabled={loading} placeholder="Tối thiểu 6 ký tự" />
              <PasswordField id="confirmPassword" label="Xác nhận mật khẩu" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} disabled={loading} placeholder="Nhập lại mật khẩu" />
            </div>

            <div className="border-y border-border/70 py-3">
              <button type="button" onClick={() => setShowOptionalFields((value) => !value)} className="flex w-full items-center justify-between text-left text-sm font-medium text-text-secondary transition-default hover:text-text-primary" disabled={loading} aria-expanded={showOptionalFields}>
                <span>Thông tin thêm <span className="font-normal">(có thể bổ sung sau)</span></span>
                {showOptionalFields ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {showOptionalFields && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="so_dien_thoai" className="mb-2 block text-sm font-medium text-text-primary">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} aria-hidden="true" />
                      <input id="so_dien_thoai" name="so_dien_thoai" type="tel" autoComplete="tel" value={formData.so_dien_thoai} onChange={handleChange} className={iconInputClassName} placeholder="Tùy chọn" disabled={loading} />
                    </div>
                  </div>
                  <DateInput id="ngay_sinh" name="ngay_sinh" value={formData.ngay_sinh} onChange={(value) => setFormData({ ...formData, ngay_sinh: value })} label="Ngày sinh" disabled={loading} className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="dia_chi" className="mb-2 block text-sm font-medium text-text-primary">Địa chỉ</label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} aria-hidden="true" />
                    <input id="dia_chi" name="dia_chi" type="text" autoComplete="street-address" value={formData.dia_chi} onChange={handleChange} className={iconInputClassName} placeholder="Tùy chọn" disabled={loading} />
                  </div>
                </div>
                <div>
                  <label htmlFor="gioi_tinh" className="mb-2 block text-sm font-medium text-text-primary">Giới tính</label>
                  <select id="gioi_tinh" name="gioi_tinh" value={formData.gioi_tinh} onChange={handleChange} className={inputClassName} disabled={loading}>
                    <option value="">Chọn</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" className="mt-2 w-full py-3.5" disabled={loading}>
              {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-text-secondary">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-accent-brown underline-offset-4 hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </section>
    </div>
  )
}

interface PasswordFieldProps {
  id: 'mat_khau' | 'confirmPassword'
  label: string
  autoComplete: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  visible: boolean
  onToggle: () => void
  disabled: boolean
  placeholder: string
}

function PasswordField({ id, label, autoComplete, value, onChange, visible, onToggle, disabled, placeholder }: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-text-primary">{label}</label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} aria-hidden="true" />
        <input id={id} name={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} required minLength={cognitoEnabled ? 10 : 6} className={iconInputClassName} placeholder={placeholder} disabled={disabled} />
              <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg focus-visible:ring-2 focus-visible:ring-focus" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={visible} disabled={disabled}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}
