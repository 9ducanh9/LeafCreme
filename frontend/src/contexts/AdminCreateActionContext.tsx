import { createContext, useCallback, useContext, useEffect, useRef } from 'react'

// Phím tắt "n" (spec 13 §8) phải gọi đúng hành động "Tạo mới" của trang
// đang mở — mỗi trang khác nhau (mở dialog sản phẩm, mở dialog voucher...).
// Trang tự đăng ký hành động của nó qua useAdminCreateAction khi mount, gỡ
// khi unmount; AdminLayout (chủ sở hữu registry) gọi lại qua trigger().
interface AdminCreateActionContextValue {
  register: (action: (() => void) | null) => void
}

const AdminCreateActionContext = createContext<AdminCreateActionContextValue | null>(null)

// AdminLayout gọi hook này để vừa lấy `Provider` bọc quanh <Outlet/>, vừa
// lấy `trigger()` để tự gọi trong shortcut của chính nó — cùng một registry,
// không đi qua useContext (AdminLayout đứng NGOÀI cây mà Provider bọc).
export function useAdminCreateActionRegistry() {
  const actionRef = useRef<(() => void) | null>(null)
  const register = useCallback((action: (() => void) | null) => { actionRef.current = action }, [])
  const trigger = useCallback(() => { actionRef.current?.() }, [])
  return { Provider: AdminCreateActionContext.Provider, value: { register }, trigger }
}

export function useAdminCreateAction(action: (() => void) | null) {
  const ctx = useContext(AdminCreateActionContext)
  useEffect(() => {
    ctx?.register(action)
    return () => ctx?.register(null)
  }, [ctx, action])
}
