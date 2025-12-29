import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { LeafieProvider } from './contexts/LeafieContext'
import ProtectedRoute from './components/routing/ProtectedRoute'
import AdminProtectedRoute from './components/admin/routing/AdminProtectedRoute'
import MainLayout from './components/layout/MainLayout'
import AdminLayout from './layout/admin/AdminLayout'
import ToastContainer from './components/ui/ToastContainer'
import BakeryHomePage from './pages/BakeryHomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UserProfilePage from './pages/UserProfilePage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import PaymentQRPage from './pages/PaymentQRPage'
import CategoryListingPage from './pages/CategoryListingPage'
import SearchPage from './pages/SearchPage'
import GiftBoxListPage from './pages/GiftBoxListPage'
import GiftBoxDetailPage from './pages/GiftBoxDetailPage'
import ContactPage from './pages/ContactPage'
import PolicyPage from './pages/PolicyPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminProductPage from './pages/admin/AdminProductPage'
import AdminGiftBoxPage from './pages/admin/AdminGiftBoxPage'
import AdminGiftBoxBomPage from './pages/admin/AdminGiftBoxBomPage'
import AdminVoucherPage from './pages/admin/AdminVoucherPage'
import AdminPreOrderPage from './pages/admin/AdminPreOrderPage'
import AdminPreOrderDetailPage from './pages/admin/AdminPreOrderDetailPage'
import AdminSalesPage from './pages/admin/AdminSalesPage'
import AdminSalesDetailPage from './pages/admin/AdminSalesDetailPage'
import AdminInventoryPage from './pages/admin/AdminInventoryPage'
import AdminBatchCreatePage from './pages/admin/AdminBatchCreatePage'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <LeafieProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <MainLayout>
                <Routes>
                <Route path="/" element={<BakeryHomePage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/categories/:category" element={<CategoryListingPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/gift-boxes" element={<GiftBoxListPage />} />
                <Route path="/gift-boxes/:id" element={<GiftBoxDetailPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/policies" element={<PolicyPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <UserProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders/:id/payment-qr" element={<PaymentQRPage />} />
                <Route path="/orders/:id/success" element={<OrderSuccessPage />} />

                {/* Admin Routes */}
                <Route
                  path="/admin/*"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout />
                    </AdminProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="products" element={<AdminProductPage />} />
                  <Route path="gift-boxes" element={<AdminGiftBoxPage />} />
                  <Route path="gift-boxes/:id/bom" element={<AdminGiftBoxBomPage />} />
                  <Route path="vouchers" element={<AdminVoucherPage />} />
                  <Route path="preorders" element={<AdminPreOrderPage />} />
                  <Route path="preorders/:id" element={<AdminPreOrderDetailPage />} />
                  <Route path="sales" element={<AdminSalesPage />} />
                  <Route path="sales/:id" element={<AdminSalesDetailPage />} />
                  <Route path="inventory" element={<AdminInventoryPage />} />
                  <Route path="batches" element={<AdminBatchCreatePage />} />
                </Route>
                </Routes>
              </MainLayout>
              <ToastContainer />
            </BrowserRouter>
          </LeafieProvider>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  )
}

export default App

