import { BrowserRouter as Router, Routes, Route } from 'react-router'
import HomePage from './pages/HomePage'
import CheckoutPage from './pages/CheckoutPage'
import ThankYouPage from './pages/ThankYouPage'
import CartPage from './pages/CartPage'
import Header from './components/Header'
import { CartProvider } from './context/CartContext'

function App() {
  return (
    <CartProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/kassa" element={<CheckoutPage />} />
          <Route path="/tack" element={<ThankYouPage />} />
          <Route path="/varukorg" element={<CartPage />} />
        </Routes>
      </Router>
    </CartProvider>
  )
}

export default App
