import { useState } from 'react'
import { cognitoEnabled, cognitoSocialProviders, getCognitoConfig } from '../../config/cognito'
import { IMAGE_PATHS } from '../../constants/images'
import { beginCognitoSocialLogin } from '../../services/cognitoService'

export default function SocialSignIn({ disabled, onBusyChange }: { disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  let configured = false
  try {
    getCognitoConfig()
    configured = cognitoEnabled && cognitoSocialProviders.some(provider => provider.toLowerCase() === 'google')
  } catch { /* Unconfigured deployments keep password authentication available. */ }

  async function signIn() {
    setError(null)
    setBusy(true)
    onBusyChange(true)
    try {
      await beginCognitoSocialLogin('Google')
    } catch {
      setError('Chưa thể kết nối Google. Bạn vui lòng thử lại hoặc dùng email.')
      setBusy(false)
      onBusyChange(false)
    }
  }

  return <div className="auth-social">
    <button type="button" onClick={signIn} disabled={disabled || busy || !configured} aria-describedby={!configured ? 'google-unavailable' : undefined}>
      <img src={IMAGE_PATHS.logos.google} alt="" aria-hidden="true" />
      {busy ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}
    </button>
    {!configured && <p id="google-unavailable" className="auth-provider-note">Google chưa được kích hoạt. Bạn vẫn có thể sử dụng tài khoản và mật khẩu.</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="auth-divider"><span />hoặc dùng tài khoản<span /></div>
  </div>
}
