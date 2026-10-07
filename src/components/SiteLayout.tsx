import { Outlet } from 'react-router'
import Header from './Header'
import Footer from './Footer'
import { CurrencyProvider } from '../context/CurrencyContext'

function SiteLayout() {
  return (
    <CurrencyProvider>
      <Header />
      <Outlet />
      <Footer />
    </CurrencyProvider>
  )
}

export default SiteLayout
