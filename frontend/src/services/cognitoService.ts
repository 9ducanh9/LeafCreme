import { API_BASE_URL } from '../config/runtimeConfig'
import { cognitoRedirectUri, getCognitoConfig } from '../config/cognito'
import type { RegisterData, User } from '../types/user'

type CognitoAuthResult = {
  AccessToken: string
  IdToken: string
  RefreshToken?: string
}

type PendingProfile = Pick<RegisterData, 'ten_dang_nhap' | 'email' | 'ho_ten' | 'so_dien_thoai' | 'dia_chi' | 'ngay_sinh' | 'gioi_tinh'>

const STATE_KEY = 'cognito_oauth_state'
const VERIFIER_KEY = 'cognito_pkce_verifier'
const PENDING_PROFILE_KEY = 'cognito_pending_profile'
const OAUTH_TRANSACTION_COOKIE = 'leafcreme_cognito_oauth'

type OAuthTransaction = {
  state: string
  verifier: string
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomValue(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

function sharedOAuthCookieDomain(): string | undefined {
  const host = window.location.hostname
  return host === 'logantai.com' || host.endsWith('.logantai.com') ? '.logantai.com' : undefined
}

function readOAuthCookie(): OAuthTransaction | undefined {
  const prefix = `${OAUTH_TRANSACTION_COOKIE}=`
  const entry = document.cookie.split('; ').find((item) => item.startsWith(prefix))
  if (!entry) return undefined
  try {
    return JSON.parse(decodeURIComponent(entry.slice(prefix.length))) as OAuthTransaction
  } catch {
    return undefined
  }
}

function clearOAuthTransaction(): void {
  localStorage.removeItem(STATE_KEY)
  localStorage.removeItem(VERIFIER_KEY)
  const domain = sharedOAuthCookieDomain()
  if (domain) {
    document.cookie = `${OAUTH_TRANSACTION_COOKIE}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=Lax; Secure`
  }
}

function persistOAuthTransaction(transaction: OAuthTransaction): void {
  localStorage.setItem(STATE_KEY, transaction.state)
  localStorage.setItem(VERIFIER_KEY, transaction.verifier)
  const domain = sharedOAuthCookieDomain()
  if (domain) {
    // Fallback for the public logantai.com and leafcr.logantai.com aliases.
    document.cookie = `${OAUTH_TRANSACTION_COOKIE}=${encodeURIComponent(JSON.stringify(transaction))}; Path=/; Domain=${domain}; Max-Age=600; SameSite=Lax; Secure`
  }
}

async function cognitoApi<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const { region } = getCognitoConfig()
  const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw {
      error: 'Authentication failed',
      detail: payload.message || 'Không thể hoàn tất yêu cầu xác thực.',
      status: response.status,
    }
  }
  return payload as T
}

function persistTokens(tokens: CognitoAuthResult): void {
  localStorage.setItem('access_token', tokens.AccessToken)
  localStorage.setItem('id_token', tokens.IdToken)
  if (tokens.RefreshToken) {
    localStorage.setItem('refresh_token', tokens.RefreshToken)
  }
}

function clearPersistedTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('id_token')
  localStorage.removeItem('refresh_token')
}

function pendingProfile(): PendingProfile | undefined {
  const value = sessionStorage.getItem(PENDING_PROFILE_KEY)
  if (!value) return undefined
  try {
    return JSON.parse(value) as PendingProfile
  } catch {
    sessionStorage.removeItem(PENDING_PROFILE_KEY)
    return undefined
  }
}

async function synchronizeUser(idToken: string): Promise<User> {
  const profile = pendingProfile()
  const response = await fetch(`${API_BASE_URL}/auth/cognito/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken, profile }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw {
      error: 'Authentication failed',
      detail: payload.detail || 'Không thể đồng bộ tài khoản.',
      status: response.status,
    }
  }
  sessionStorage.removeItem(PENDING_PROFILE_KEY)
  return payload as User
}

export async function cognitoLogin(username: string, password: string): Promise<User> {
  const { appClientId } = getCognitoConfig()
  const result = await cognitoApi<{ AuthenticationResult?: CognitoAuthResult }>('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: appClientId,
    AuthParameters: { USERNAME: username.trim(), PASSWORD: password },
  })
  if (!result.AuthenticationResult?.AccessToken || !result.AuthenticationResult.IdToken) {
    throw { error: 'Authentication failed', detail: 'Cần hoàn tất bước xác thực bổ sung.', status: 400 }
  }
  persistTokens(result.AuthenticationResult)
  return synchronizeUser(result.AuthenticationResult.IdToken)
}

export async function cognitoRegister(data: RegisterData): Promise<void> {
  const { appClientId } = getCognitoConfig()
  await cognitoApi('SignUp', {
    ClientId: appClientId,
    Username: data.email.trim().toLowerCase(),
    Password: data.mat_khau,
    UserAttributes: [
      { Name: 'email', Value: data.email.trim().toLowerCase() },
      { Name: 'name', Value: data.ho_ten.trim() },
      { Name: 'preferred_username', Value: data.ten_dang_nhap.trim() },
    ],
  })
  const profile: PendingProfile = {
    ten_dang_nhap: data.ten_dang_nhap,
    email: data.email,
    ho_ten: data.ho_ten,
    so_dien_thoai: data.so_dien_thoai,
    dia_chi: data.dia_chi,
    ngay_sinh: data.ngay_sinh,
    gioi_tinh: data.gioi_tinh,
  }
  sessionStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile))
}

export async function confirmCognitoEmail(email: string, code: string): Promise<void> {
  const { appClientId } = getCognitoConfig()
  await cognitoApi('ConfirmSignUp', {
    ClientId: appClientId,
    Username: email.trim().toLowerCase(),
    ConfirmationCode: code.trim(),
  })
}

export async function resendCognitoConfirmation(email: string): Promise<void> {
  const { appClientId } = getCognitoConfig()
  await cognitoApi('ResendConfirmationCode', {
    ClientId: appClientId,
    Username: email.trim().toLowerCase(),
  })
}

export async function refreshCognitoSession(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) throw new Error('No refresh token available')

  const { appClientId } = getCognitoConfig()
  const result = await cognitoApi<{ AuthenticationResult?: CognitoAuthResult }>('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: appClientId,
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  })
  if (!result.AuthenticationResult?.AccessToken || !result.AuthenticationResult.IdToken) {
    throw new Error('Refresh response missing tokens')
  }
  persistTokens(result.AuthenticationResult)
  return result.AuthenticationResult.AccessToken
}

export async function beginCognitoSocialLogin(provider: string): Promise<void> {
  const { appClientId, domain } = getCognitoConfig()
  const state = randomValue()
  const verifier = randomValue()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = toBase64Url(new Uint8Array(digest))
  persistOAuthTransaction({ state, verifier })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: appClientId,
    redirect_uri: cognitoRedirectUri(),
    scope: 'openid email profile',
    identity_provider: provider,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  window.location.assign(`${domain}/oauth2/authorize?${params.toString()}`)
}

export async function completeCognitoOAuthCallback(search: string): Promise<User> {
  const { appClientId, domain } = getCognitoConfig()
  const params = new URLSearchParams(search)
  const code = params.get('code')
  const state = params.get('state')
  const localTransaction: OAuthTransaction = {
    state: localStorage.getItem(STATE_KEY) || '',
    verifier: localStorage.getItem(VERIFIER_KEY) || '',
  }
  const sharedTransaction = readOAuthCookie()
  const transaction = [localTransaction, sharedTransaction].find(
    (candidate): candidate is OAuthTransaction => Boolean(candidate?.state && candidate.verifier && candidate.state === state),
  )
  clearOAuthTransaction()

  if (!code || !state || !transaction) {
    throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng thử lại.')
  }

  const response = await fetch(`${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appClientId,
      code,
      redirect_uri: cognitoRedirectUri(),
      code_verifier: transaction.verifier,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token || !payload.id_token) {
    throw new Error(payload.error_description || 'Không thể hoàn tất đăng nhập.')
  }

  const tokens = {
    AccessToken: payload.access_token,
    IdToken: payload.id_token,
    RefreshToken: payload.refresh_token,
  }
  persistTokens(tokens)
  try {
    return await synchronizeUser(tokens.IdToken)
  } catch (error) {
    // Do not leave a rejected social-login token to poison the next page load.
    clearPersistedTokens()
    throw error
  }
}

export function cognitoLogout(): void {
  clearPersistedTokens()
  clearOAuthTransaction()
  sessionStorage.removeItem(PENDING_PROFILE_KEY)
}
