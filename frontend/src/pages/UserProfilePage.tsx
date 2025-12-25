// User Profile page - view and edit user information
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile, UserUpdateData, uploadAvatar } from '../services/userService'
import { ArrowLeft, User as UserIcon, Lock } from 'lucide-react'
import { MAX_AVATAR_SIZE, ALLOWED_IMAGE_TYPES } from '../constants/fileUpload'

export default function UserProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
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

  const [passwordData, setPasswordData] = useState({
    mat_khau_cu: '',
    mat_khau_moi: '',
    xac_nhan_mat_khau_moi: '',
  })

  // Load user data into form
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
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

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Vui lòng chọn file ảnh (JPG, PNG, GIF, WebP)')
      return
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Kích thước ảnh không được vượt quá 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload avatar
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
      // Format ngay_sinh to YYYY-MM-DD if provided
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validation
    if (passwordData.mat_khau_moi !== passwordData.xac_nhan_mat_khau_moi) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp')
      return
    }

    if (passwordData.mat_khau_moi.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)

    try {
      // TODO: Implement when backend endpoint is available
      setError('Tính năng đổi mật khẩu đang được phát triển')
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'detail' in err ? (err as { detail?: unknown }).detail : undefined
      setError((typeof detail === 'string' && detail) || 'Có lỗi xảy ra khi đổi mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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
        <div className="max-w-[1440px] mx-auto px-6">
          <ErrorMessage message="Vui lòng đăng nhập để xem thông tin cá nhân" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Back to Home Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-default mb-8 whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          <span>Về trang chủ</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 md:p-6">
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
                  Cài đặt tài khoản
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-default ${
                      activeTab === 'profile'
                        ? 'bg-accent-yellow/20 border-l-4 border-accent-brown text-text-primary font-medium'
                        : 'text-text-secondary hover:bg-background'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activeTab === 'profile' ? 'bg-accent-yellow/30' : 'bg-transparent'
                      }`}
                    >
                      <UserIcon
                        className={`w-4 h-4 ${
                          activeTab === 'profile' ? 'text-accent-brown' : 'text-text-secondary'
                        }`}
                      />
                    </div>
                    <span>Thông tin cá nhân</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('password')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-default ${
                      activeTab === 'password'
                        ? 'bg-accent-yellow/20 border-l-4 border-accent-brown text-text-primary font-medium'
                        : 'text-text-secondary hover:bg-background'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activeTab === 'password' ? 'bg-accent-yellow/30' : 'bg-transparent'
                      }`}
                    >
                      <Lock
                        className={`w-4 h-4 ${
                          activeTab === 'password' ? 'text-accent-brown' : 'text-text-secondary'
                        }`}
                      />
                    </div>
                    <span>Đổi mật khẩu</span>
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' ? (
              <Card className="p-8 md:p-10">
                {/* Header */}
                <div className="mb-10">
                  <h1 className="font-heading text-4xl md:text-5xl font-semibold text-text-primary mb-4 leading-tight">
                    Thông tin cá nhân
                  </h1>
                  <p className="text-base text-text-secondary/80 leading-relaxed max-w-2xl">
                    Cập nhật thông tin tài khoản và cách chúng tôi liên hệ với bạn.
                  </p>
                </div>

                {/* Error & Success Messages */}
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
                  {/* Avatar & Form Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
                    {/* Avatar Section */}
                    <div className="md:col-span-1 flex flex-col items-center">
                      <div className="relative mb-6">
                        <button
                          type="button"
                          onClick={handleAvatarClick}
                          disabled={uploadingAvatar || loading}
                          className="relative w-40 h-40 rounded-full bg-gradient-to-br from-accent-yellow/20 to-accent-brown/10 border-4 border-accent-brown/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent-brown/40 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          {uploadingAvatar && (
                            <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center z-10">
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
                              onError={e => {
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

                    {/* Form Fields */}
                    <div className="md:col-span-2 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label
                            htmlFor="ho_ten"
                            className="block text-sm font-semibold text-text-primary mb-2"
                          >
                            Họ và tên <span className="text-accent-brown font-bold">*</span>
                          </label>
                          <input
                            id="ho_ten"
                            name="ho_ten"
                            type="text"
                            value={profileData.ho_ten}
                            onChange={handleProfileChange}
                            required
                            className="w-full px-4 py-3.5 rounded-input border border-border bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-brown focus:ring-2 focus:ring-accent-brown/10 transition-all duration-200 disabled:opacity-50"
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="email"
                            className="block text-sm font-semibold text-text-primary mb-2"
                          >
                            Email <span className="text-accent-brown font-bold">*</span>
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            value={profileData.email}
                            onChange={handleProfileChange}
                            required
                            className="w-full px-4 py-3.5 rounded-input border border-border bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-brown focus:ring-2 focus:ring-accent-brown/10 transition-all duration-200 disabled:opacity-50"
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="so_dien_thoai"
                            className="block text-sm font-semibold text-text-primary mb-2"
                          >
                            Số điện thoại
                          </label>
                          <input
                            id="so_dien_thoai"
                            name="so_dien_thoai"
                            type="tel"
                            value={profileData.so_dien_thoai}
                            onChange={handleProfileChange}
                            className="w-full px-4 py-3.5 rounded-input border border-border bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-brown focus:ring-2 focus:ring-accent-brown/10 transition-all duration-200 disabled:opacity-50"
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="ngay_sinh"
                            className="block text-sm font-semibold text-text-primary mb-2"
                          >
                            Ngày sinh
                          </label>
                          <input
                            id="ngay_sinh"
                            name="ngay_sinh"
                            type="date"
                            value={profileData.ngay_sinh}
                            onChange={handleProfileChange}
                            className="w-full px-4 py-3.5 rounded-input border border-border bg-surface text-text-primary focus:outline-none focus:border-accent-brown focus:ring-2 focus:ring-accent-brown/10 transition-all duration-200 disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="gioi_tinh"
                            className="block text-sm font-semibold text-text-primary mb-2"
                          >
                            Giới tính
                          </label>
                          <select
                            id="gioi_tinh"
                            name="gioi_tinh"
                            value={profileData.gioi_tinh}
                            onChange={handleProfileChange}
                            className="w-full px-4 py-3.5 rounded-input border border-border bg-surface text-text-primary focus:outline-none focus:border-accent-brown focus:ring-2 focus:ring-accent-brown/10 transition-all duration-200 disabled:opacity-50 cursor-pointer"
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
                        <label
                          htmlFor="dia_chi"
                          className="block text-sm font-semibold text-text-primary mb-2"
                        >
                          Địa chỉ
                        </label>
                        <textarea
                          id="dia_chi"
                          name="dia_chi"
                          value={profileData.dia_chi}
                          onChange={handleProfileChange}
                          rows={4}
                          className="w-full px-4 py-3.5 rounded-input border border-border bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-brown focus:ring-2 focus:ring-accent-brown/10 transition-all duration-200 resize-none disabled:opacity-50"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
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
                      className="px-8 py-3.5 rounded-button bg-accent-brown text-white font-semibold hover:bg-accent-brown/90 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card className="p-8 md:p-10">
                {/* Header */}
                <div className="mb-10">
                  <h1 className="font-heading text-4xl md:text-5xl font-semibold text-text-primary mb-4 leading-tight">
                    Đổi mật khẩu
                  </h1>
                  <p className="text-base text-text-secondary/80 leading-relaxed max-w-2xl">
                    Cập nhật mật khẩu của bạn để bảo vệ tài khoản.
                  </p>
                </div>

                {/* Error & Success Messages */}
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

                <form onSubmit={handlePasswordSubmit} className="max-w-lg">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label
                        htmlFor="mat_khau_cu"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        Mật khẩu hiện tại <span className="text-accent-brown font-bold">*</span>
                      </label>
                      <input
                        id="mat_khau_cu"
                        name="mat_khau_cu"
                        type="password"
                        value={passwordData.mat_khau_cu}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-4 py-3.5 rounded-input border border-border bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-brown focus:ring-2 focus:ring-accent-brown/10 transition-all duration-200 disabled:opacity-50"
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="mat_khau_moi"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        Mật khẩu mới <span className="text-accent-brown font-bold">*</span>
                      </label>
                      <input
                        id="mat_khau_moi"
                        name="mat_khau_moi"
                        type="password"
                        value={passwordData.mat_khau_moi}
                        onChange={handlePasswordChange}
                        required
                        minLength={6}
                        className="w-full px-4 py-3.5 rounded-input border border-border bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-brown focus:ring-2 focus:ring-accent-brown/10 transition-all duration-200 disabled:opacity-50"
                        disabled={loading}
                      />
                      <p className="text-xs text-text-secondary/70 mt-1">
                        Mật khẩu phải có ít nhất 6 ký tự
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="xac_nhan_mat_khau_moi"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        Xác nhận mật khẩu mới <span className="text-accent-brown font-bold">*</span>
                      </label>
                      <input
                        id="xac_nhan_mat_khau_moi"
                        name="xac_nhan_mat_khau_moi"
                        type="password"
                        value={passwordData.xac_nhan_mat_khau_moi}
                        onChange={handlePasswordChange}
                        required
                        minLength={6}
                        className="w-full px-4 py-3.5 rounded-input border border-border bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-brown focus:ring-2 focus:ring-accent-brown/10 transition-all duration-200 disabled:opacity-50"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-8 mt-8 border-t border-border/60 flex items-center justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordData({
                          mat_khau_cu: '',
                          mat_khau_moi: '',
                          xac_nhan_mat_khau_moi: '',
                        })
                        setError(null)
                      }}
                      disabled={loading}
                      className="px-8 py-3.5 rounded-button border border-border text-text-secondary hover:bg-background hover:border-accent-brown/30 hover:text-text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3.5 rounded-button bg-accent-brown text-white font-semibold hover:bg-accent-brown/90 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
