# Account UI and Google Sign-In

Login and registration share a compact responsive form with seasonal accents. Existing password login, registration and verification flows remain in use. Required browser validation is enabled; password requirements follow the selected authentication provider.

Both pages expose the Google entry point through the existing Cognito authorization-code flow with PKCE. The button is disabled with an explicit explanation if Cognito configuration or the Google provider is missing. This is not a verified Google integration in an unconfigured deployment.

The inspected local frontend has no active Cognito settings. Do not switch production authentication or link existing users merely to enable a button.

To enable the existing integration, configure the backend and frontend consistently for Cognito, then configure Google in the existing Cognito user pool/app client. Frontend requires VITE_AUTH_PROVIDER=cognito, VITE_COGNITO_REGION, VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_APP_CLIENT_ID, VITE_COGNITO_DOMAIN and VITE_COGNITO_SOCIAL_PROVIDERS=Google. Google secrets belong in the identity provider configuration, never VITE variables. Allow each deployed origin's /auth/callback in Cognito. Review existing-user linking behavior before changing production authentication.

Verification still required with actual credentials: Google consent, callback state/PKCE validation, backend session creation, user refresh, cancellation, logout and existing-account handling. Automated UI tests mock the API; they do not prove live Google authentication.
