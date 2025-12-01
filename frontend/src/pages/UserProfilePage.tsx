// User Profile page - view and edit user information
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { useAuth } from '../contexts/AuthContext'
import { updateUserProfile, UserUpdateData, uploadAvatar } from '../services/userService'
import { ArrowLeft } from 'lucide-react'
import AvatarUploadSection from '../components/bakery/AvatarUploadSection'
import ProfileForm from '../components/bakery/ProfileForm'
import PasswordForm from '../components/bakery/PasswordForm'
import ProfileSidebar from '../components/bakery/ProfileSidebar'
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
            <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' ? (
              <Card>
                <h2 className="font-heading text-3xl font-semibold text-text-primary mb-8">
                  Thông tin cá nhân
                </h2>

                {error && <ErrorMessage message={error} />}
                {success && (
                  <div className="mb-8 p-4 bg-accent-yellow/20 border border-accent-yellow rounded-card text-text-primary">
                    {success}
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <AvatarUploadSection
                    avatarPreview={avatarPreview}
                    uploadingAvatar={uploadingAvatar}
                    loading={loading}
                    onAvatarChange={handleAvatarChange}
                    onRemoveAvatar={handleRemoveAvatar}
                  />
                  
                  <ProfileForm
                    profileData={profileData}
                    loading={loading}
                    onChange={handleProfileChange}
                    onSubmit={handleProfileSubmit}
                    onCancel={() => navigate('/')}
                  />
                </form>
              </Card>
            ) : (
              <Card>
                <h2 className="font-heading text-3xl font-semibold text-text-primary mb-8">
                  Đổi mật khẩu
                </h2>

                {error && <ErrorMessage message={error} />}
                {success && (
                  <div className="mb-8 p-4 bg-accent-yellow/20 border border-accent-yellow rounded-card text-text-primary">
                    {success}
                  </div>
                )}

                <PasswordForm
                  passwordData={passwordData}
                  loading={loading}
                  onChange={handlePasswordChange}
                  onSubmit={handlePasswordSubmit}
                  onCancel={() => {
                    setPasswordData({
                      mat_khau_cu: '',
                      mat_khau_moi: '',
                      xac_nhan_mat_khau_moi: '',
                    })
                    setError(null)
                  }}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

