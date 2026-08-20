import { BrowserRouter as Router, Routes, Route } from 'react-router'
import HomePage from './pages/HomePage'
import CheckoutPage from './pages/CheckoutPage'
import ThankYouPage from './pages/ThankYouPage'
import CartPage from './pages/CartPage'
import SiteLayout from './components/SiteLayout'
import AdminLayout from './components/AdminLayout'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import { CartProvider } from './context/CartContext'
import AdminProductsPage from './pages/AdminProductsPage'
import AdminProductFormPage from './pages/AdminProductFormPage'
import AdminOrdersPage from './pages/AdminOrdersPage'
import AdminOrderDetailPage from './pages/AdminOrderDetailPage'

function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/kassa" element={<CheckoutPage />} />
            <Route path="/tack" element={<ThankYouPage />} />
            <Route path="/varukorg" element={<CartPage />} />
          </Route>

          <Route path="/admin/logga-in" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="produkter" element={<AdminProductsPage />} />
            <Route path="produkter/ny" element={<AdminProductFormPage />} />
            <Route path="produkter/:id" element={<AdminProductFormPage />} />
            <Route path="bestallningar" element={<AdminOrdersPage />} />
            <Route
              path="bestallningar/:id"
              element={<AdminOrderDetailPage />}
            />
          </Route>
        </Routes>
      </Router>
    </CartProvider>
  )
}

export default App
