import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function MerchantPortal() {
  const { storeSlug } = useParams()
  const [merchant, setMerchant] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState('')

  // Dashboard State
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetchMerchantDetails()
  }, [storeSlug])

  async function fetchMerchantDetails() {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('slug', storeSlug)
      .single()

    if (error || !data) {
      alert('Store not found!')
    } else {
      setMerchant(data)
    }
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (pinInput === merchant.pin_code) {
      setIsAuthenticated(true)
      fetchOrders(merchant.id)
      fetchProducts(merchant.id)
    } else {
      setAuthError('Incorrect PIN code. Please try again.')
    }
  }

  async function fetchOrders(merchantId) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function fetchProducts(merchantId) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', merchantId)
    setProducts(data || [])
  }

  async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
    
    if (!error) {
      fetchOrders(merchant.id)
    } else {
      alert('Failed to update status: ' + error.message)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Loading space...</div>
  if (!merchant) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-red-600">Store not found.</div>

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          {merchant.logo_url ? (
            <img src={merchant.logo_url} alt="Logo" className="w-24 h-24 mx-auto rounded-full object-cover border-4 mb-4 shadow-sm" style={{ borderColor: merchant.theme_color || '#000' }} />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-sm" style={{ backgroundColor: merchant.theme_color || '#000' }}>
              {merchant.business_name.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{merchant.business_name}</h1>
          <p className="text-gray-500 mb-6 font-medium">Enter your 4-digit Manager PIN to access your workspace.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              maxLength="4"
              required
              className="w-full text-center text-3xl tracking-[1em] font-mono border-2 p-4 rounded-xl outline-none focus:border-black transition-colors" 
              value={pinInput} 
              onChange={e => { setPinInput(e.target.value); setAuthError(''); }} 
            />
            {authError && <p className="text-red-500 text-sm font-bold">{authError}</p>}
            <button type="submit" className="w-full text-white font-bold py-4 rounded-xl text-lg shadow-sm transition-transform active:scale-95" style={{ backgroundColor: merchant.theme_color || '#000' }}>
              Unlock Portal
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- DASHBOARD SCREEN ---
  const storeUrl = `https://crudhub-app.vercel.app/${merchant.slug}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(storeUrl)}`

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {merchant.logo_url && <img src={merchant.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border" />}
            <h1 className="text-xl font-black text-gray-900">{merchant.business_name} Workspace</h1>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="text-gray-500 hover:text-red-600 font-bold text-sm bg-gray-50 px-4 py-2 rounded-lg border hover:bg-red-50 transition-colors">Lock Portal</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="space-y-2">
          <button onClick={() => setActiveTab('orders')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'orders' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}>🛍️ Order History</button>
          <button onClick={() => setActiveTab('qr')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'qr' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}>📲 Store QR Code</button>
          <button onClick={() => setActiveTab('catalog')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'catalog' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}>📦 My Catalog</button>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3">
          
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-800">Recent Orders</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                      <th className="p-4 font-bold">Date</th>
                      <th className="p-4 font-bold">Customer</th>
                      <th className="p-4 font-bold">Total</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm font-medium text-gray-600">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{order.customer_name}</p>
                          <p className="text-xs text-gray-500">{order.customer_address}</p>
                        </td>
                        <td className="p-4 font-bold text-green-700">₦{Number(order.total_amount).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <select 
                            className="border border-gray-300 rounded-lg text-sm p-1.5 outline-none focus:ring-2 focus:ring-black font-medium cursor-pointer"
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <div className="p-12 text-center text-gray-400 font-medium text-lg">No orders yet. Keep pushing your link!</div>}
              </div>
            </div>
          )}

          {/* QR CODE TAB */}
          {activeTab === 'qr' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-lg mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Store QR Code</h2>
              <p className="text-gray-500 mb-8 font-medium">Print this and place it on your tables or counter. Customers can scan it to order directly from their phones!</p>
              
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 inline-block mb-6 shadow-inner">
                <img src={qrCodeUrl} alt="Store QR Code" className="w-64 h-64 mx-auto rounded-lg" />
              </div>
              
              <div className="flex gap-4 justify-center">
                <a href={qrCodeUrl} download="Store_QRCode.png" target="_blank" rel="noreferrer" className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2">
                  ⬇️ Download QR
                </a>
                <a href={storeUrl} target="_blank" rel="noreferrer" className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors">
                  Visit Store
                </a>
              </div>
            </div>
          )}

          {/* CATALOG TAB (Read-only summary for now) */}
          {activeTab === 'catalog' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
               <h2 className="text-xl font-bold text-gray-800 mb-6">Your Active Products</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {products.map(p => (
                   <div key={p.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50">
                     {p.image_url ? <img src={p.image_url} alt={p.name} className="w-16 h-16 object-cover rounded-lg shadow-sm" /> : <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">No Img</div>}
                     <div>
                       <h4 className="font-bold text-gray-900">{p.name}</h4>
                       <p className="text-green-700 font-bold text-sm mb-1">₦{Number(p.price).toLocaleString()}</p>
                       <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-bold">{p.category}</span>
                     </div>
                   </div>
                 ))}
                 {products.length === 0 && <p className="text-gray-500 font-medium">No products loaded yet.</p>}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
