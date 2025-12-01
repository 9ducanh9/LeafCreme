import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import BakeryHomePage from './pages/BakeryHomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UserProfilePage from './pages/UserProfilePage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import CategoryListingPage from './pages/CategoryListingPage'
import SearchPage from './pages/SearchPage'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<BakeryHomePage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/categories/:category" element={<CategoryListingPage />} />
            <Route path="/search" element={<SearchPage />} />
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
            <Route path="/orders/:id/success" element={<OrderSuccessPage />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}

export default App

