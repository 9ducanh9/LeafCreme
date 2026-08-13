import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { LeafieProvider } from './contexts/LeafieContext'
import ProtectedRoute from './components/routing/ProtectedRoute'
import AdminProtectedRoute from './components/admin/routing/AdminProtectedRoute'
import MainLayout from './components/layout/main-layout'
import AdminLayout from './layout/admin/AdminLayout'
import ToastContainer from './components/ui/ToastContainer'
import ErrorBoundary from './components/ui/ErrorBoundary'
import BakeryHomePage from './pages/BakeryHomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import UserProfilePage from './pages/UserProfilePage'
import MyOrdersPage from './pages/MyOrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import PaymentQRPage from './pages/PaymentQRPage'
import CategoryListingPage from './pages/CategoryListingPage'
import SearchPage from './pages/SearchPage'
import GiftBoxListPage from './pages/GiftBoxListPage'
import GiftBoxDetailPage from './pages/GiftBoxDetailPage'
import ContactPage from './pages/ContactPage'
import PolicyPage from './pages/PolicyPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import DataDeletionPage from './pages/DataDeletionPage'
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
import AdminAlertsPage from './pages/admin/AdminAlertsPage'
import AdminStockLedgerPage from './pages/admin/AdminStockLedgerPage'
import AdminBatchTracePage from './pages/admin/AdminBatchTracePage'

// useBlocker (see hooks/admin/useUnsavedChanges) only works within a data
// router, so routes are declared via createBrowserRouter/RouterProvider
// rather than <BrowserRouter>/<Routes>.
function RootLayout() {
  return (
    <>
      <MainLayout>
        <Outlet />
      </MainLayout>
      <ToastContainer />
    </>
  )
}

const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
        { path: '/', element: <BakeryHomePage /> },
        { path: '/products/:id', element: <ProductDetailPage /> },
        { path: '/categories/:category', element: <CategoryListingPage /> },
        { path: '/search', element: <SearchPage /> },
        { path: '/gift-boxes', element: <GiftBoxListPage /> },
        { path: '/gift-boxes/:id', element: <GiftBoxDetailPage /> },
        { path: '/contact', element: <ContactPage /> },
        { path: '/policies', element: <PolicyPage /> },
        { path: '/privacy-policy', element: <PrivacyPolicyPage /> },
        { path: '/data-deletion', element: <DataDeletionPage /> },
        { path: '/cart', element: <CartPage /> },
        { path: '/login', element: <LoginPage /> },
        { path: '/register', element: <RegisterPage /> },
        { path: '/auth/callback', element: <AuthCallbackPage /> },
        { path: '/verify-email', element: <VerifyEmailPage /> },
        {
          path: '/profile',
          element: (
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/orders',
          element: (
            <ProtectedRoute>
              <MyOrdersPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/orders/:id',
          element: (
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/checkout',
          element: (
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/orders/:id/payment-qr',
          element: (
            <ProtectedRoute>
              <PaymentQRPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/orders/:id/success',
          element: (
            <ProtectedRoute>
              <OrderSuccessPage />
            </ProtectedRoute>
          ),
        },

        // Admin Routes
        {
          path: '/admin',
          element: (
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          ),
          children: [
            { index: true, element: <AdminDashboardPage /> },
            { path: 'dashboard', element: <AdminDashboardPage /> },
            { path: 'products', element: <AdminProductPage /> },
            { path: 'gift-boxes', element: <AdminGiftBoxPage /> },
            { path: 'gift-boxes/:id/bom', element: <AdminGiftBoxBomPage /> },
            { path: 'vouchers', element: <AdminVoucherPage /> },
            { path: 'preorders', element: <AdminPreOrderPage /> },
            { path: 'preorders/:id', element: <AdminPreOrderDetailPage /> },
            { path: 'sales', element: <AdminSalesPage /> },
            { path: 'sales/:id', element: <AdminSalesDetailPage /> },
            { path: 'inventory', element: <AdminInventoryPage /> },
            { path: 'stock-ledger', element: <AdminStockLedgerPage /> },
            { path: 'batch-trace', element: <AdminBatchTracePage /> },
            { path: 'batch-trace/:batchType/:batchId', element: <AdminBatchTracePage /> },
            { path: 'batches', element: <AdminBatchCreatePage /> },
            { path: 'alerts', element: <AdminAlertsPage /> },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
)

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <LeafieProvider>
            <ErrorBoundary>
              <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </ErrorBoundary>
          </LeafieProvider>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  )
}

export default App

