import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import Admin from './Admin'
import MerchantPortal from './MerchantPortal'
import Storefront from './Storefront'
import Terms from './Terms'
import Privacy from './Privacy'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/:storeSlug/manage" element={<MerchantPortal />} />
        <Route path="/:storeSlug" element={<Storefront />} />
      </Routes>
    </Router>
  )
}
export default App
