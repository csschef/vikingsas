import { useEffect, useState } from 'react'
import { Outlet, useNavigate, Link } from 'react-router'

function AdminLayout() {
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/admin/me')
      .then((res) => {
        if (!res.ok) {
          navigate('/admin/logga-in')
        } else {
          setChecking(false)
        }
      })
      .catch(() => navigate('/admin/logga-in'))
  }, [navigate])

  function handleLogout() {
    fetch('/api/admin/logout', { method: 'POST' }).then(() => {
      navigate('/admin/logga-in')
    })
  }

  if (checking) {
    return <p className="admin-loading">Laddar...</p>
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <span>Adminpanel - Vikingsås</span>
        <div className="admin-nav-links">
          <Link to="/admin/ordrar">Ordrar</Link>
          <Link to="/admin/produkter">Produkter</Link>
          <button type="button" onClick={handleLogout}>
            Logga ut
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}

export default AdminLayout
