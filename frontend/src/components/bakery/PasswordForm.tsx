// Password change form component
import Button from '../ui/Button'

interface PasswordFormProps {
  passwordData: {
    mat_khau_cu: string
    mat_khau_moi: string
    xac_nhan_mat_khau_moi: string
  }
  loading: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  onCancel: () => void
}

export default function PasswordForm({
  passwordData,
  loading,
  onChange,
  onSubmit,
  onCancel,
}: PasswordFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-md">
      <div>
        <label htmlFor="mat_khau_cu" className="block text-sm font-medium text-text-primary mb-3">
          Mật khẩu hiện tại <span className="text-accent-brown">*</span>
        </label>
        <input
          id="mat_khau_cu"
          name="mat_khau_cu"
          type="password"
          value={passwordData.mat_khau_cu}
          onChange={onChange}
          required
          className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="mat_khau_moi" className="block text-sm font-medium text-text-primary mb-3">
          Mật khẩu mới <span className="text-accent-brown">*</span>
        </label>
        <input
          id="mat_khau_moi"
          name="mat_khau_moi"
          type="password"
          value={passwordData.mat_khau_moi}
          onChange={onChange}
          required
          minLength={6}
          className="w-full px-4 py-3 rounded-input border border-border focus:outline-none focus:border-accent-brown transition-default"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="xac_nhan_mat_khau_moi" className="block text-sm font-medium text-text-primary mb-3">
          Xác nhận mật khẩu mới <span className="text-accent-brown">*</span>
        </label>
        <input
          id="xac_nhan_mat_khau_moi"
          name="xac_nhan_mat_khau_moi"
          type="password"
          value={passwordData.xac_nhan_mat_khau_moi}
          onChange={onChange}
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
          onClick={onCancel}
          disabled={loading}
        >
          Hủy
        </Button>
      </div>
    </form>
  )
}

