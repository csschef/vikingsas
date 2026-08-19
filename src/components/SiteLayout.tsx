import { Outlet } from 'react-router'
import Header from './Header'
import Footer from './Footer'

function SiteLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  )
}

export default SiteLayout
