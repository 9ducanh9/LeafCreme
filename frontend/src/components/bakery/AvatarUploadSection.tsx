// Avatar upload section component
import { useRef } from 'react'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import { User as UserIcon, Camera, X } from 'lucide-react'
import { ALLOWED_IMAGE_TYPES } from '../../constants/fileUpload'

interface AvatarUploadSectionProps {
  avatarPreview: string | null
  uploadingAvatar: boolean
  loading: boolean
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onRemoveAvatar: () => Promise<void>
}

export default function AvatarUploadSection({
  avatarPreview,
  uploadingAvatar,
  loading,
  onAvatarChange,
  onRemoveAvatar,
}: AvatarUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col items-center mb-8">
      <div className="relative mb-4">
        <div className="w-32 h-32 rounded-full bg-background border-4 border-border flex items-center justify-center overflow-hidden">
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
          className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-accent-brown text-white flex items-center justify-center border-2 border-surface hover:bg-accent-brown/90 transition-default disabled:opacity-50 disabled:cursor-not-allowed"
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
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={onAvatarChange}
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
            onClick={onRemoveAvatar}
            disabled={uploadingAvatar || loading}
            className="text-sm text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <X className="w-4 h-4 mr-2" />
            Xóa ảnh
          </Button>
        )}
      </div>
      
      <p className="text-xs text-text-secondary mt-3 text-center">
        Định dạng: JPG, PNG, GIF. Kích thước tối đa: 5MB
      </p>
    </div>
  )
}

