type CognitoConfig = {
  region: string
  userPoolId: string
  appClientId: string
  domain: string
}

const requestedProvider = (import.meta.env.VITE_AUTH_PROVIDER || 'local').toLowerCase()

export const cognitoEnabled = requestedProvider === 'cognito'
export const cognitoSocialProviders = String(import.meta.env.VITE_COGNITO_SOCIAL_PROVIDERS || '')
  .split(',')
  .map((provider) => provider.trim())
  // Keep the provider configured in Cognito so it can be restored later, but
  // do not expose Facebook while the Meta app is disabled.
  .filter((provider) => provider && provider.toLowerCase() !== 'facebook')

export function getCognitoConfig(): CognitoConfig {
  const config = {
    region: String(import.meta.env.VITE_COGNITO_REGION || '').trim(),
    userPoolId: String(import.meta.env.VITE_COGNITO_USER_POOL_ID || '').trim(),
    appClientId: String(import.meta.env.VITE_COGNITO_APP_CLIENT_ID || '').trim(),
    domain: String(import.meta.env.VITE_COGNITO_DOMAIN || '').trim().replace(/\/+$/, ''),
  }

  if (!cognitoEnabled) {
    throw new Error('Cognito authentication is not enabled.')
  }
  if (!config.region || !config.userPoolId || !config.appClientId || !config.domain) {
    throw new Error('Cognito authentication is not fully configured.')
  }
  return config
}

export function cognitoRedirectUri(): string {
  return `${window.location.origin}/auth/callback`
}
