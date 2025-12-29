// Auth Context for user authentication state management
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { login as loginService, register as registerService, getCurrentUser, logout as logoutService, isAuthenticated, User } from '../services/authService'
import { onLogout as cartOnLogout, clearGuestCart } from '../services/cartService'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

interface RegisterData {
  ten_dang_nhap: string
  email: string
  mat_khau: string
  ho_ten: string
  vaitro_id: number
  so_dien_thoai?: string
  dia_chi?: string
  ngay_sinh?: string
  gioi_tinh?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user on mount if authenticated
  useEffect(() => {
    async function loadUser() {
      if (isAuthenticated()) {
        try {
          const userData = await getCurrentUser()
          console.log('✅ User loaded:', {
            id: userData.nguoidung_id,
            username: userData.ten_dang_nhap,
            hasAvatar: !!userData.avatar_url,
            avatarUrl: userData.avatar_url,
            role: userData.vaitro?.ten_vai_tro
          })
          setUser(userData)
        } catch (error: unknown) {
          // Token might be invalid or expired, clear it silently
          const status =
            error && typeof error === 'object' && 'status' in error ? (error as { status?: unknown }).status : undefined
          if (status === 401) {
            // 401 is expected when user is not authenticated - don't log error
            logoutService()
            setUser(null)
          } else {
            // Only log non-401 errors
            console.error('Error loading user:', error)
          }
        }
      }
      setLoading(false)
    }

    loadUser()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const authResponse = await loginService({ username, password })
      
      // Ensure token is stored before fetching user
      if (authResponse.access_token) {
        localStorage.setItem('access_token', authResponse.access_token)
        localStorage.setItem('refresh_token', authResponse.refresh_token)
        
        // Clear guest cart when logging in (user will use their own cart)
        clearGuestCart()
        
        // Small delay to ensure localStorage is updated
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Now fetch user data
      const userData = await getCurrentUser()
      setUser(userData)
      
      // Dispatch custom event to notify CartContext to reload cart for this user
      window.dispatchEvent(new CustomEvent('auth-change', { detail: { type: 'login', userId: userData.nguoidung_id } }))
    } catch (error) {
      // Clear tokens if login failed
      logoutService()
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const authResponse = await registerService(data)
      
      // Ensure token is stored before fetching user
      if (authResponse.access_token) {
        localStorage.setItem('access_token', authResponse.access_token)
        localStorage.setItem('refresh_token', authResponse.refresh_token)
        
        // Small delay to ensure localStorage is updated
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Now fetch user data
      const userData = await getCurrentUser()
      setUser(userData)
    } catch (error) {
      // Clear tokens if register failed
      logoutService()
      throw error
    }
  }

  const logout = () => {
    // Clear cart data on logout (user's cart stays in localStorage, just switching to guest mode)
    cartOnLogout()
    logoutService()
    setUser(null)
    // Dispatch custom event to notify CartContext to reload cart
    window.dispatchEvent(new CustomEvent('auth-change', { detail: { type: 'logout' } }))
  }

  const refreshUser = async () => {
    if (isAuthenticated()) {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error('Error refreshing user:', error)
        logout()
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}


