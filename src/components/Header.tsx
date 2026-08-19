import { ShoppingCartSimpleIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { useState, useEffect, useContext } from 'react'
import { CartContext } from '../context/CartContext'

function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const { count } = useContext(CartContext)

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
        <Link to="/varukorg" className="nav-link">
          <ShoppingCartSimpleIcon size={22} />
          {count > 0 && <span className="cart-count">{count}</span>}
        </Link>
      </nav>
    </header>
  )
}

export default Header
