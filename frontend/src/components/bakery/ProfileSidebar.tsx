// Profile sidebar navigation component
import Card from '../ui/Card'
import { User as UserIcon, Lock } from 'lucide-react'

interface ProfileSidebarProps {
  activeTab: 'profile' | 'password'
  onTabChange: (tab: 'profile' | 'password') => void
}

export default function ProfileSidebar({ activeTab, onTabChange }: ProfileSidebarProps) {
  return (
    <Card>
      <div className="space-y-2">
        <button
          onClick={() => onTabChange('profile')}
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
          onClick={() => onTabChange('password')}
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
  )
}

