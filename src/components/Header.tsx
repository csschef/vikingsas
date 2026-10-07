import { ShoppingCartSimpleIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { useState, useEffect, useContext } from 'react'
import { CartContext } from '../context/CartContext'
import { CurrencyContext } from '../context/CurrencyContext'

function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const { count } = useContext(CartContext)
  const { currency, currencies, changeCurrency } = useContext(CurrencyContext)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`site-header ${isScrolled ? 'is-scrolled' : ''}`}>
      <Link to="/" className="logo">
        Vikingsås
      </Link>
      <nav className="site-nav">
        {currencies.length > 1 && (
          <select
            className="currency-select"
            value={currency}
            onChange={(e) => changeCurrency(e.target.value)}
            aria-label="Valuta"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        )}
        <Link to="/varukorg" className="nav-link">
          <ShoppingCartSimpleIcon size={22} />
          {count > 0 && <span className="cart-count">{count}</span>}
        </Link>
      </nav>
    </header>
  )
}

export default Header
