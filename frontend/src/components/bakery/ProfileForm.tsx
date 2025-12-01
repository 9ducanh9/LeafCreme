// Profile form component for editing user information
import Button from '../ui/Button'
import { UserUpdateData } from '../../types/user'

interface ProfileFormProps {
  profileData: UserUpdateData
  loading: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  onCancel: () => void
}

export default function ProfileForm({
  profileData,
  loading,
  onChange,
  onSubmit,
  onCancel,
}: ProfileFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="ho_ten" className="block text-sm font-medium text-text-primary mb-3">
            Họ và tên <span className="text-accent-brown">*</span>
          </label>
          <input
            id="ho_ten"
            name="ho_ten"
            type="text"
            value={profileData.ho_ten}
            onChange={onChange}
            required
            className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-3">
            Email <span className="text-accent-brown">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={profileData.email}
            onChange={onChange}
            required
            className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="so_dien_thoai" className="block text-sm font-medium text-text-primary mb-3">
            Số điện thoại
          </label>
          <input
            id="so_dien_thoai"
            name="so_dien_thoai"
            type="tel"
            value={profileData.so_dien_thoai}
            onChange={onChange}
            className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="ngay_sinh" className="block text-sm font-medium text-text-primary mb-3">
            Ngày sinh
          </label>
          <input
            id="ngay_sinh"
            name="ngay_sinh"
            type="date"
            value={profileData.ngay_sinh}
            onChange={onChange}
            className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="gioi_tinh" className="block text-sm font-medium text-text-primary mb-3">
            Giới tính
          </label>
          <select
            id="gioi_tinh"
            name="gioi_tinh"
            value={profileData.gioi_tinh}
            onChange={onChange}
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
        <label htmlFor="dia_chi" className="block text-sm font-medium text-text-primary mb-3">
          Địa chỉ
        </label>
        <textarea
          id="dia_chi"
          name="dia_chi"
          value={profileData.dia_chi}
          onChange={onChange}
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
          onClick={onCancel}
          disabled={loading}
        >
          Hủy
        </Button>
      </div>
    </form>
  )
}

