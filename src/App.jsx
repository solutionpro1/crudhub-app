import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Storefront from './Storefront'
import Admin from './Admin'
import MerchantPortal from './MerchantPortal'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        {/* NEW: The client's management portal */}
        <Route path="/:storeSlug/manage" element={<MerchantPortal />} />
        {/* The public storefront */}
        <Route path="/:storeSlug" element={<Storefront />} />
      </Routes>
    </BrowserRouter>
  )
}
