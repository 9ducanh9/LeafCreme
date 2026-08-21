import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { LeafieProvider } from './contexts/LeafieContext'
import ProtectedRoute from './components/routing/ProtectedRoute'
import AdminProtectedRoute, { AdminCapabilityRoute } from './components/admin/routing/AdminProtectedRoute'
import MainLayout from './components/layout/main-layout'
import ToastContainer from './components/ui/ToastContainer'
import ErrorBoundary from './components/ui/ErrorBoundary'

const AdminLayout = lazy(() => import('./layout/admin/AdminLayout'))
const BakeryHomePage = lazy(() => import('./pages/BakeryHomePage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'))
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'))
const PaymentQRPage = lazy(() => import('./pages/PaymentQRPage'))
const CategoryListingPage = lazy(() => import('./pages/CategoryListingPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const GiftBoxListPage = lazy(() => import('./pages/GiftBoxListPage'))
const GiftBoxDetailPage = lazy(() => import('./pages/GiftBoxDetailPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PolicyPage = lazy(() => import('./pages/PolicyPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const DataDeletionPage = lazy(() => import('./pages/DataDeletionPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminProductPage = lazy(() => import('./pages/admin/AdminProductPage'))
const AdminGiftBoxPage = lazy(() => import('./pages/admin/AdminGiftBoxPage'))
const AdminGiftBoxBomPage = lazy(() => import('./pages/admin/AdminGiftBoxBomPage'))
const AdminVoucherPage = lazy(() => import('./pages/admin/AdminVoucherPage'))
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'))
const AdminOrderDetailPage = lazy(() => import('./pages/admin/AdminOrderDetailPage'))
const AdminInventoryPage = lazy(() => import('./pages/admin/AdminInventoryPage'))
const AdminBatchCreatePage = lazy(() => import('./pages/admin/AdminBatchCreatePage'))
const AdminAlertsPage = lazy(() => import('./pages/admin/AdminAlertsPage'))
const AdminStockLedgerPage = lazy(() => import('./pages/admin/AdminStockLedgerPage'))
const AdminBatchTracePage = lazy(() => import('./pages/admin/AdminBatchTracePage'))
const AdminAgentPage = lazy(() => import('./pages/admin/AdminAgentPage'))

// useBlocker (see hooks/admin/useUnsavedChanges) only works within a data
// router, so routes are declared via createBrowserRouter/RouterProvider
// rather than <BrowserRouter>/<Routes>.
function RootLayout() {
  return (
    <>
      <MainLayout>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </MainLayout>
      <ToastContainer />
    </>
  )
}

function RouteFallback() {
  return (
    <div className="mx-auto flex min-h-[18rem] max-w-container items-center justify-center px-4" role="status" aria-live="polite">
      <span className="size-8 animate-spin rounded-full border-2 border-border-subtle border-t-brand" aria-hidden="true" />
      <span className="sr-only">Đang tải trang</span>
    </div>
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
            { index: true, element: <AdminCapabilityRoute capability="dashboard.read"><AdminDashboardPage /></AdminCapabilityRoute> },
            { path: 'dashboard', element: <AdminCapabilityRoute capability="dashboard.read"><AdminDashboardPage /></AdminCapabilityRoute> },
            { path: 'products', element: <AdminCapabilityRoute capability="products.read"><AdminProductPage /></AdminCapabilityRoute> },
            { path: 'gift-boxes', element: <AdminCapabilityRoute capability="giftbox.read"><AdminGiftBoxPage /></AdminCapabilityRoute> },
            { path: 'gift-boxes/:id/bom', element: <AdminCapabilityRoute capability="bom.write"><AdminGiftBoxBomPage /></AdminCapabilityRoute> },
            { path: 'vouchers', element: <AdminCapabilityRoute capability="vouchers.read"><AdminVoucherPage /></AdminCapabilityRoute> },
            { path: 'orders', element: <AdminCapabilityRoute capability="orders.read.own_created"><AdminOrdersPage /></AdminCapabilityRoute> },
            { path: 'orders/:id', element: <AdminCapabilityRoute capability="orders.read.own_created"><AdminOrderDetailPage /></AdminCapabilityRoute> },
            // Trang "Đơn đặt trước" + "Bán tại quầy" đã gộp thành "Đơn hàng"
            // (/admin/orders) — giữ redirect để link/bookmark cũ không vỡ.
            { path: 'preorders', element: <Navigate to="/admin/orders" replace /> },
            { path: 'preorders/:id', element: <Navigate to="/admin/orders" replace /> },
            { path: 'sales', element: <Navigate to="/admin/orders" replace /> },
            { path: 'sales/:id', element: <Navigate to="/admin/orders" replace /> },
            { path: 'inventory', element: <AdminCapabilityRoute capability="inventory.read"><AdminInventoryPage /></AdminCapabilityRoute> },
            { path: 'stock-ledger', element: <AdminCapabilityRoute capability="inventory.read"><AdminStockLedgerPage /></AdminCapabilityRoute> },
            { path: 'batch-trace', element: <AdminCapabilityRoute capability="inventory.read"><AdminBatchTracePage /></AdminCapabilityRoute> },
            { path: 'batch-trace/:batchType/:batchId', element: <AdminCapabilityRoute capability="inventory.read"><AdminBatchTracePage /></AdminCapabilityRoute> },
            { path: 'batches', element: <AdminCapabilityRoute capability="batches.write"><AdminBatchCreatePage /></AdminCapabilityRoute> },
            { path: 'alerts', element: <AdminCapabilityRoute capability="alerts.read"><AdminAlertsPage /></AdminCapabilityRoute> },
            { path: 'agent', element: <AdminCapabilityRoute capability="agent.chat"><AdminAgentPage /></AdminCapabilityRoute> },
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
