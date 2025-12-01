// User Profile page - view and edit user information
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile, UserUpdateData, uploadAvatar } from '../services/userService'
import { ArrowLeft, User as UserIcon, Lock, Camera, X } from 'lucide-react'

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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
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
    } catch (err: any) {
      setError(err.detail || 'Có lỗi xảy ra khi upload avatar.')
      setAvatarPreview(user.avatar_url || null)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user) return
    setUploadingAvatar(true)
    setError(null)
    try {
      await updateUserProfile(user.nguoidung_id, { avatar_url: null as any })
      setProfileData({ ...profileData, avatar_url: '' })
      setAvatarPreview(null)
      await refreshUser()
      setSuccess('Đã xóa avatar!')
    } catch (err: any) {
      setError(err.detail || 'Có lỗi xảy ra khi xóa avatar.')
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
    } catch (err: any) {
      setError(err.detail || 'Có lỗi xảy ra khi cập nhật thông tin.')
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
    } catch (err: any) {
      setError(err.detail || 'Có lỗi xảy ra khi đổi mật khẩu.')
    } finally {
      setLoading(false)
    }
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
        <div className="max-w-[1440px] mx-auto px-6">
          <ErrorMessage message="Vui lòng đăng nhập để xem thông tin cá nhân" />
        </div>
      </div>
    )
  }

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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-button transition-default ${
                    activeTab === 'profile'
                      ? 'bg-accent-brown/10 border border-accent-brown text-accent-brown'
                      : 'hover:bg-background text-text-secondary'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="font-medium">Thông tin cá nhân</span>
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-button transition-default ${
                    activeTab === 'password'
                      ? 'bg-accent-brown/10 border border-accent-brown text-accent-brown'
                      : 'hover:bg-background text-text-secondary'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span className="font-medium">Đổi mật khẩu</span>
                </button>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' ? (
              <Card>
                <h2 className="font-heading text-3xl font-semibold text-text-primary mb-6">
                  Thông tin cá nhân
                </h2>

                {error && <ErrorMessage message={error} />}
                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-card text-green-800">
                    {success}
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Avatar Upload Section - Centered */}
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                      <div className="w-32 h-32 rounded-full bg-background border-4 border-border flex items-center justify-center overflow-hidden shadow-lg">
                        {avatarPreview ? (
                          <img
                            src={
                              avatarPreview.startsWith('http') || avatarPreview.startsWith('data:')
                                ? avatarPreview
                                : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${avatarPreview}`
                            }
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <UserIcon className="w-16 h-16 text-text-secondary" />
                        )}
                      </div>
                      
                      {/* Camera Icon Overlay */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar || loading}
                        className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-accent-brown text-white flex items-center justify-center shadow-lg hover:bg-accent-brown/90 transition-default disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Đổi ảnh đại diện"
                      >
                        {uploadingAvatar ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Camera className="w-5 h-5" />
                        )}
                      </button>
                      
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                          <LoadingSpinner size="sm" />
                        </div>
                      )}
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={uploadingAvatar || loading}
                    />
                    
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar || loading}
                        className="text-sm"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {avatarPreview ? 'Đổi ảnh' : 'Chọn ảnh'}
                      </Button>
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveAvatar}
                          disabled={uploadingAvatar || loading}
                          className="text-sm text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Xóa ảnh
                        </Button>
                      )}
                    </div>
                    
                    <p className="text-xs text-text-secondary mt-2 text-center">
                      Định dạng: JPG, PNG, GIF. Kích thước tối đa: 5MB
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="ho_ten" className="block text-sm font-medium text-text-primary mb-2">
                        Họ và tên <span className="text-accent-brown">*</span>
                      </label>
                      <input
                        id="ho_ten"
                        name="ho_ten"
                        type="text"
                        value={profileData.ho_ten}
                        onChange={handleProfileChange}
                        required
                        className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
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
                        value={profileData.email}
                        onChange={handleProfileChange}
                        required
                        className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
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
                        value={profileData.so_dien_thoai}
                        onChange={handleProfileChange}
                        className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label htmlFor="ngay_sinh" className="block text-sm font-medium text-text-primary mb-2">
                        Ngày sinh
                      </label>
                      <input
                        id="ngay_sinh"
                        name="ngay_sinh"
                        type="date"
                        value={profileData.ngay_sinh}
                        onChange={handleProfileChange}
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
                        value={profileData.gioi_tinh}
                        onChange={handleProfileChange}
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

                  <div>
                    <label htmlFor="dia_chi" className="block text-sm font-medium text-text-primary mb-2">
                      Địa chỉ
                    </label>
                    <textarea
                      id="dia_chi"
                      name="dia_chi"
                      value={profileData.dia_chi}
                      onChange={handleProfileChange}
                      rows={3}
                      className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default resize-none"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                    >
                      {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/')}
                      disabled={loading}
                    >
                      Hủy
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card>
                <h2 className="font-heading text-3xl font-semibold text-text-primary mb-6">
                  Đổi mật khẩu
                </h2>

                {error && <ErrorMessage message={error} />}
                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-card text-green-800">
                    {success}
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                  <div>
                    <label htmlFor="mat_khau_cu" className="block text-sm font-medium text-text-primary mb-2">
                      Mật khẩu hiện tại <span className="text-accent-brown">*</span>
                    </label>
                    <input
                      id="mat_khau_cu"
                      name="mat_khau_cu"
                      type="password"
                      value={passwordData.mat_khau_cu}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="mat_khau_moi" className="block text-sm font-medium text-text-primary mb-2">
                      Mật khẩu mới <span className="text-accent-brown">*</span>
                    </label>
                    <input
                      id="mat_khau_moi"
                      name="mat_khau_moi"
                      type="password"
                      value={passwordData.mat_khau_moi}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="xac_nhan_mat_khau_moi" className="block text-sm font-medium text-text-primary mb-2">
                      Xác nhận mật khẩu mới <span className="text-accent-brown">*</span>
                    </label>
                    <input
                      id="xac_nhan_mat_khau_moi"
                      name="xac_nhan_mat_khau_moi"
                      type="password"
                      value={passwordData.xac_nhan_mat_khau_moi}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                    >
                      {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPasswordData({
                          mat_khau_cu: '',
                          mat_khau_moi: '',
                          xac_nhan_mat_khau_moi: '',
                        })
                        setError(null)
                      }}
                      disabled={loading}
                    >
                      Hủy
                    </Button>
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

