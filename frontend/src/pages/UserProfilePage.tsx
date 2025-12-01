// User Profile page - view and edit user information
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile, UserUpdateData } from '../services/userService'
import { ArrowLeft, User as UserIcon, Lock } from 'lucide-react'

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
  })

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
      })
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

