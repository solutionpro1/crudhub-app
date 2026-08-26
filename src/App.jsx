import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import Storefront from './Storefront'
import Admin from './Admin'
import MerchantPortal from './MerchantPortal'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The Front Door */}
        <Route path="/" element={<LandingPage />} />
        
        {/* The Super Admin Dashboard */}
        <Route path="/admin" element={<Admin />} />
        
        {/* The client's management portal */}
        <Route path="/:storeSlug/manage" element={<MerchantPortal />} />
        
        {/* The public storefront */}
        <Route path="/:storeSlug" element={<Storefront />} />
      </Routes>
    </BrowserRouter>
  )
}
