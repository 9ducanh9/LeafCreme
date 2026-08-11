// User Profile page - view and edit user information
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import DateInput from '../components/ui/DateInput'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile, UserUpdateData, uploadAvatar } from '../services/userService'
import { ArrowLeft, User as UserIcon, Lock, Package } from 'lucide-react'
import { MAX_AVATAR_SIZE, ALLOWED_IMAGE_TYPES } from '../constants/fileUpload'
import { API_BASE_URL } from '../config/runtimeConfig'
import Container from '../components/layout/container'

type ProfileTab = 'profile' | 'password'

export default function UserProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [profileData, setProfileData] = useState<UserUpdateData>({
    ho_ten: '',
    email: '',
    so_dien_thoai: '',
    dia_chi: '',
    ngay_sinh: '',
    gioi_tinh: '',
    avatar_url: '',
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setProfileData({
        ho_ten: user.ho_ten || '',
        email: user.email || '',
        so_dien_thoai: user.so_dien_thoai || '',
        dia_chi: user.dia_chi || '',
        ngay_sinh: user.ngay_sinh ? user.ngay_sinh.split('T')[0] : '',
        gioi_tinh: user.gioi_tinh || '',
        avatar_url: user.avatar_url || '',
      })
      setAvatarPreview(user.avatar_url || null)
    }
  }, [user])

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    })
  }

  const handleAvatarClick = () => {
    if (!uploadingAvatar && !loading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Vui lòng chọn file ảnh (JPG, PNG, GIF, WebP)')
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError('Kích thước ảnh không được vượt quá 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setUploadingAvatar(true)
    setError(null)
    try {
      const avatarUrl = await uploadAvatar(user.nguoidung_id, file)
      setProfileData({ ...profileData, avatar_url: avatarUrl })
      await refreshUser()
      setSuccess('Cập nhật avatar thành công!')
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
      setError((typeof detail === 'string' && detail) || 'Có lỗi xảy ra khi upload avatar.')
      setAvatarPreview(user.avatar_url || null)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const updateData: UserUpdateData = {
        ...profileData,
        ngay_sinh: profileData.ngay_sinh || undefined,
      }

      await updateUserProfile(user.nguoidung_id, updateData)
      await refreshUser()
      setSuccess('Cập nhật thông tin thành công!')
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
      setError((typeof detail === 'string' && detail) || 'Có lỗi xảy ra khi cập nhật thông tin.')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background py-16">
        <Container>
          <ErrorMessage message="Vui lòng đăng nhập để xem thông tin cá nhân" />
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <Container className="py-8 md:py-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-default mb-8 whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          <span>Về trang chủ</span>
        </button>

        <h1 className="sr-only">Tài khoản của tôi</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          <div className="lg:col-span-1">
            <Card className="p-4 md:p-6">
              <div className="mb-6">
                <h3 className="text-xs font-normal text-text-secondary/70 mb-5">
                  Cài đặt tài khoản
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-default ${
                      activeTab === 'profile'
                        ? 'bg-accent-brown/8 text-text-primary font-medium'
                        : 'text-text-secondary hover:bg-bg-alt/30 hover:text-text-primary'
                    }`}
                  >
                    <UserIcon
                      className={`w-[18px] h-[18px] ${
                        activeTab === 'profile' ? 'text-accent-brown' : 'text-text-secondary/70'
                      }`}
                    />
                    <span className="text-[15px]">Thông tin cá nhân</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('password')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-default ${
                      activeTab === 'password'
                        ? 'bg-accent-brown/8 text-text-primary font-medium'
                        : 'text-text-secondary hover:bg-bg-alt/30 hover:text-text-primary'
                    }`}
                  >
                    <Lock
                      className={`w-[18px] h-[18px] ${
                        activeTab === 'password' ? 'text-accent-brown' : 'text-text-secondary/70'
                      }`}
                    />
                    <span className="text-[15px]">Đổi mật khẩu</span>
                  </button>
                  <button
                    onClick={() => navigate('/orders')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-default text-text-secondary hover:bg-bg-alt/30 hover:text-text-primary"
                  >
                    <Package className="w-[18px] h-[18px] text-text-secondary/70" />
                    <span className="text-[15px]">Đơn hàng của tôi</span>
                  </button>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {activeTab === 'profile' ? (
              <Card className="p-8 md:p-10">
                <div className="mb-8">
                  <p className="text-xs font-normal text-text-secondary/70 mb-2">
                    Cài đặt tài khoản
                  </p>
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-text-primary mb-3 leading-tight">
                    Thông tin cá nhân
                  </h2>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                    Cập nhật thông tin tài khoản và cách chúng tôi liên hệ với bạn.
                  </p>
                </div>

                {error && (
                  <div className="mb-6">
                    <ErrorMessage message={error} />
                  </div>
                )}
                {success && (
                  <div className="mb-6 p-4 bg-accent-yellow/20 border border-accent-yellow rounded-card text-text-primary">
                    {success}
                  </div>
                )}

                <form onSubmit={handleProfileSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="md:col-span-1 flex flex-col items-center">
                      <div className="relative mb-6">
                        <button
                          type="button"
                          onClick={handleAvatarClick}
                          disabled={uploadingAvatar || loading}
                          className="relative w-40 h-40 rounded-full bg-gradient-to-br from-accent-yellow/20 to-accent-brown/10 border-4 border-accent-brown/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent-brown/40 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          {uploadingAvatar && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-bg-overlay">
                              <LoadingSpinner size="sm" />
                            </div>
                          )}
                          {avatarPreview ? (
                            <img
                              src={
                                avatarPreview.startsWith('http') || avatarPreview.startsWith('data:')
                                  ? avatarPreview
                                  : `${API_BASE_URL}${avatarPreview}`
                              }
                              alt="Avatar"
                              className="w-full h-full object-cover group-hover:opacity-80 transition-default"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-accent-yellow/20">
                              {user.ho_ten ? (
                                <span className="text-4xl font-semibold text-accent-brown">
                                  {getInitials(user.ho_ten)}
                                </span>
                              ) : (
                                <UserIcon className="w-16 h-16 text-text-secondary" />
                              )}
                            </div>
                          )}
                        </button>
                      </div>
                      <p className="text-sm font-medium text-text-primary text-center mb-2">
                        Nhấn vào ảnh để thay đổi
                      </p>
                      <p className="text-xs text-text-secondary/70 text-center leading-relaxed">
                        Định dạng: JPG, PNG, GIF
                        <br />
                        Kích thước tối đa: 5MB
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_IMAGE_TYPES.join(',')}
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={uploadingAvatar || loading}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label htmlFor="ho_ten" className="block text-sm font-semibold text-text-primary mb-2">
                            Họ và tên <span className="text-accent-brown font-bold">*</span>
                          </label>
                          <input
                            id="ho_ten"
                            name="ho_ten"
                            type="text"
                            value={profileData.ho_ten}
                            onChange={handleProfileChange}
                            required
                            className="w-full rounded-input border border-interactive bg-bg-surface px-4 py-3.5 text-fg placeholder:text-fg-subtle outline-none transition-all duration-200 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-2">
                            Email <span className="text-accent-brown font-bold">*</span>
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            value={profileData.email}
                            onChange={handleProfileChange}
                            required
                            className="w-full rounded-input border border-interactive bg-bg-surface px-4 py-3.5 text-fg placeholder:text-fg-subtle outline-none transition-all duration-200 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="so_dien_thoai" className="block text-sm font-semibold text-text-primary mb-2">
                            Số điện thoại
                          </label>
                          <input
                            id="so_dien_thoai"
                            name="so_dien_thoai"
                            type="tel"
                            value={profileData.so_dien_thoai}
                            onChange={handleProfileChange}
                            className="w-full rounded-input border border-interactive bg-bg-surface px-4 py-3.5 text-fg placeholder:text-fg-subtle outline-none transition-all duration-200 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <DateInput
                            id="ngay_sinh"
                            name="ngay_sinh"
                            value={profileData.ngay_sinh}
                            onChange={(value) => setProfileData({ ...profileData, ngay_sinh: value })}
                            label="Ngày sinh"
                            placeholder="dd/mm/yyyy"
                            disabled={loading}
                            className="w-full rounded-input border border-interactive bg-bg-surface px-4 py-3.5 text-fg outline-none transition-all duration-200 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="gioi_tinh" className="block text-sm font-semibold text-text-primary mb-2">
                            Giới tính
                          </label>
                          <select
                            id="gioi_tinh"
                            name="gioi_tinh"
                            value={profileData.gioi_tinh}
                            onChange={handleProfileChange}
                            className="w-full cursor-pointer rounded-input border border-interactive bg-bg-surface px-4 py-3.5 text-fg outline-none transition-all duration-200 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                            disabled={loading}
                          >
                            <option value="">Chọn giới tính</option>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                            <option value="Khác">Khác</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="dia_chi" className="block text-sm font-semibold text-text-primary mb-2">
                          Địa chỉ
                        </label>
                        <textarea
                          id="dia_chi"
                          name="dia_chi"
                          value={profileData.dia_chi}
                          onChange={handleProfileChange}
                          rows={4}
                          className="w-full resize-none rounded-input border border-interactive bg-bg-surface px-4 py-3.5 text-fg placeholder:text-fg-subtle outline-none transition-all duration-200 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 mt-8 border-t border-border/60 flex items-center justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      disabled={loading}
                      className="px-8 py-3.5 rounded-button border border-border text-text-secondary hover:bg-background hover:border-accent-brown/30 hover:text-text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-button bg-brand px-8 py-3.5 font-semibold text-fg-on-brand transition-all duration-200 hover:bg-brand-hover hover:shadow-md focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card className="p-8 md:p-10">
                <div className="mb-8">
                  <p className="text-xs font-normal text-text-secondary/70 mb-2">
                    Bảo mật
                  </p>
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-text-primary mb-3 leading-tight">
                    Đổi mật khẩu
                  </h2>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                    Chức năng đổi mật khẩu chưa được triển khai backend trong dự án này.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg-alt/30 p-4 text-sm text-text-secondary leading-relaxed">
                  Để tránh gây hiểu lầm, biểu mẫu đổi mật khẩu đã được ẩn cho đến khi endpoint thật sẵn sàng.
                  Hiện tại bạn có thể quay lại tab thông tin cá nhân hoặc liên hệ quản trị viên để hỗ trợ đổi mật khẩu.
                </div>
              </Card>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
