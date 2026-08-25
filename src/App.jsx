import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Storefront from './Storefront'
import Admin from './Admin'
import MerchantPortal from './MerchantPortal'
import SuperAdmin from './SuperAdmin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin" element={<SuperAdmin />} />
        {/* NEW: The client's management portal */}
        <Route path="/:storeSlug/manage" element={<MerchantPortal />} />
        {/* The public storefront */}
        <Route path="/:storeSlug" element={<Storefront />} />
      </Routes>
    </BrowserRouter>
  )
}
