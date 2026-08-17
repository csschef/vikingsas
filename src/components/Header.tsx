import { Link } from 'react-router'
import { useState, useEffect } from 'react'

function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

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
          Varukorg
        </Link>
      </nav>
    </header>
  )
}

export default Header
