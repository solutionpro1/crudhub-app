import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function MerchantPortal() {
  const { storeSlug } = useParams()
  const [merchant, setMerchant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [editMerchant, setEditMerchant] = useState({})
  const [logoFile, setLogoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' })
  const [productImageFile, setProductImageFile] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [isProductUploading, setIsProductUploading] = useState(false)
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  useEffect(() => { fetchMerchantDetails() }, [storeSlug])

  async function fetchMerchantDetails() {
    const { data, error } = await supabase.from('merchants').select('*').eq('slug', storeSlug).single()
    if (error || !data) alert('Store not found!')
    else { setMerchant(data); setEditMerchant(data); }
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (pinInput === merchant.pin_code) { setIsAuthenticated(true); fetchOrders(merchant.id); fetchProducts(merchant.id); }
    else setAuthError('Incorrect PIN code. Please try again.')
  }

  async function fetchOrders(merchantId) {
    const { data } = await supabase.from('orders').select('*').eq('merchant_id', merchantId).order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function fetchProducts(merchantId) {
    const { data } = await supabase.from('products').select('*').eq('merchant_id', merchantId)
    setProducts(data || [])
  }

  async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) fetchOrders(merchant.id)
    else alert('Failed to update status: ' + error.message)
  }

  async function uploadFile(file, pathPrefix) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('crudhub-images').upload(fileName, file);
    if (error) { alert('Upload failed: ' + error.message); return null; }
    const { data } = supabase.storage.from('crudhub-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleUpdateSettings(e) {
    e.preventDefault(); setIsUploading(true); let logo_url = editMerchant.logo_url;
    if (logoFile) { const uploadedUrl = await uploadFile(logoFile, `logos/${editMerchant.slug}`); if (uploadedUrl) logo_url = uploadedUrl; }
    
    const { error } = await supabase.from('merchants').update({ 
      theme_color: editMerchant.theme_color, 
      logo_url: logo_url, 
      pin_code: editMerchant.pin_code, 
      currency: editMerchant.currency,
      facebook_url: editMerchant.facebook_url, 
      instagram_url: editMerchant.instagram_url,
      linkedin_url: editMerchant.linkedin_url,
      tiktok_url: editMerchant.tiktok_url, 
      x_url: editMerchant.x_url,
      contact_email: editMerchant.contact_email,
      physical_address: editMerchant.physical_address,
      hero_text: editMerchant.hero_text,
      hero_font: editMerchant.hero_font,
      hero_text_color: editMerchant.hero_text_color,
      delivery_enabled: editMerchant.delivery_enabled,
      delivery_rate_per_km: editMerchant.delivery_rate_per_km
    }).eq('id', merchant.id)
    
    if (!error) { alert('Store settings updated successfully!'); setMerchant({...editMerchant, logo_url}); setLogoFile(null); }
    else alert('Error: ' + error.message) 
    setIsUploading(false)
  }

  async function handleSaveProduct(e) {
    e.preventDefault(); setIsProductUploading(true);
    let image_url = editingProductId ? products.find(p => p.id === editingProductId)?.image_url : null;
    if (productImageFile) { const uploadedUrl = await uploadFile(productImageFile, `products/${merchant.slug}`); if (uploadedUrl) image_url = uploadedUrl; }
    if (editingProductId) {
      const { error } = await supabase.from('products').update({ ...newProduct, image_url: image_url }).eq('id', editingProductId)
      if (error) alert('Error updating item: ' + error.message)
    } else {
      const { error } = await supabase.from('products').insert([{ ...newProduct, merchant_id: merchant.id, image_url: image_url }])
      if (error) alert('Error adding item: ' + error.message)
    }
    fetchProducts(merchant.id); setNewProduct({ name: '', description: '', price: '', category: '' }); setProductImageFile(null); setEditingProductId(null);
    const fileInput = document.getElementById('product-image'); if(fileInput) fileInput.value = '';
    setIsProductUploading(false);
  }

  async function handleDeleteProduct(id) { if(window.confirm('Are you sure you want to delete this item?')) { await supabase.from('products').delete().eq('id', id); fetchProducts(merchant.id); } }
  function handleEditClick(product) { setEditingProductId(product.id); setNewProduct({ name: product.name, description: product.description || '', price: product.price, category: product.category }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function cancelEdit() { setEditingProductId(null); setNewProduct({ name: '', description: '', price: '', category: '' }); setProductImageFile(null); const fileInput = document.getElementById('product-image'); if(fileInput) fileInput.value = ''; }

  function getDaysRemaining(endDateString) {
    if (!endDateString) return 0;
    const end = new Date(endDateString);
    const today = new Date();
    const diffTime = end - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async function handleShareStore() {
    const storeUrl = `https://crudhub.com.ng/${merchant.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: merchant.business_name, text: 'Check out our online store and place your order on WhatsApp!', url: storeUrl }); } 
      catch (err) { console.log('Share canceled or not supported.'); }
    } else { navigator.clipboard.writeText(storeUrl); alert('Store link copied to clipboard!'); }
  }

  async function handleClearNotification() {
    const { error } = await supabase.from('merchants').update({ admin_message: null }).eq('id', merchant.id)
    if (!error) { setMerchant({ ...merchant, admin_message: null }); setEditMerchant({ ...editMerchant, admin_message: null }); setIsNotificationsOpen(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Loading space...</div>
  if (!merchant) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-red-600">Store not found.</div>

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          {merchant.logo_url ? <img src={merchant.logo_url} alt="Logo" className="w-24 h-24 mx-auto rounded-full object-cover border-4 mb-4 shadow-sm" style={{ borderColor: merchant.theme_color || '#000' }} /> : <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-sm" style={{ backgroundColor: merchant.theme_color || '#000' }}>{merchant.business_name.charAt(0)}</div>}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{merchant.business_name}</h1>
          <p className="text-gray-500 mb-6 font-medium">Enter your 4-digit Manager PIN to access your workspace.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" maxLength="4" required className="w-full text-center text-3xl tracking-[1em] font-mono border-2 p-4 rounded-xl outline-none focus:border-black transition-colors" value={pinInput} onChange={e => { setPinInput(e.target.value); setAuthError(''); }} />
            {authError && <p className="text-red-500 text-sm font-bold">{authError}</p>}
            <button type="submit" className="w-full text-white font-bold py-4 rounded-xl text-lg shadow-sm transition-transform active:scale-95" style={{ backgroundColor: merchant.theme_color || '#000' }}>Unlock Portal</button>
          </form>
        </div>
      </div>
    )
  }

  const storeUrl = `https://crudhub.com.ng/${merchant.slug}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(storeUrl)}`
  const currency = merchant.currency || '₦'
  
  const daysLeft = getDaysRemaining(merchant.subscription_end_date);
  const showWarning = daysLeft <= 3;
  const isExpired = daysLeft < 0;

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm relative">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {merchant.logo_url && <img src={merchant.logo_url} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border hidden sm:block" />}
            <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate">{merchant.business_name}</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className={`p-2.5 rounded-full transition-colors relative ${isNotificationsOpen ? 'bg-gray-100 text-black' : 'text-gray-500 hover:bg-gray-100 hover:text-black'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {merchant.admin_message && <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
              </button>
              {isNotificationsOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-slide-in">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center"><h3 className="font-bold text-gray-900 flex items-center gap-2">Notifications {merchant.admin_message && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">1 New</span>}</h3>{merchant.admin_message && <button onClick={handleClearNotification} className="text-xs text-blue-600 font-bold hover:underline">Mark as Read</button>}</div>
                  <div className="p-3 max-h-96 overflow-y-auto">
                    {merchant.admin_message ? (
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100"><div className="flex items-start gap-3"><div className="mt-0.5 text-blue-600 bg-blue-100 p-1.5 rounded-lg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg></div><div><h4 className="text-sm font-bold text-gray-900 mb-1">SolutionPRO Alert</h4><p className="text-sm text-gray-600 leading-relaxed font-medium">{merchant.admin_message}</p></div></div></div>
                    ) : (
                      <div className="py-10 text-center flex flex-col items-center justify-center"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-3"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><p className="text-gray-400 font-bold text-sm">You are all caught up!</p><p className="text-gray-400 font-medium text-xs mt-1">No new notifications.</p></div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="text-gray-500 hover:text-red-600 font-bold text-sm bg-gray-50 px-4 py-2.5 rounded-xl border hover:bg-red-50 transition-colors">Lock</button>
          </div>
        </div>
      </div>

      {showWarning && (
        <div className={`max-w-6xl mx-auto px-6 mt-8 mb-2`}>
          <div className={`p-4 rounded-xl border-l-4 flex items-start gap-4 shadow-sm ${isExpired ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'}`}>
            <div className={`mt-0.5 ${isExpired ? 'text-red-500' : 'text-orange-500'}`}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <div>
              <h3 className={`font-bold text-lg ${isExpired ? 'text-red-800' : 'text-orange-800'}`}>{isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}</h3>
              <p className={`font-medium mt-1 ${isExpired ? 'text-red-700' : 'text-orange-700'}`}>{isExpired ? `Your Crudhub subscription has expired. Please contact support to renew immediately. (Monthly: ₦1,400 | Yearly: ₦13,440)` : `Your Crudhub subscription expires in ${daysLeft === 0 ? 'less than 24 hours' : `${daysLeft} days`}. Please renew to keep your store online. (Monthly: ₦1,400 | Yearly: ₦13,440)`}</p>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 ${showWarning ? 'mt-6' : 'mt-8'}`}>
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Store Link</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-bold text-gray-800 break-all mb-4">crudhub.com.ng/{merchant.slug}</div>
            <button onClick={handleShareStore} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-transform active:scale-95 shadow-sm flex justify-center items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share Store</button>
          </div>
          <div className="space-y-2">
            <button onClick={() => setActiveTab('orders')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'orders' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><span className="flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Order History</span></button>
            <button onClick={() => setActiveTab('qr')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'qr' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><span className="flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> Store QR Code</span></button>
            <button onClick={() => setActiveTab('catalog')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'catalog' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><span className="flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> My Catalog</span></button>
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'settings' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><span className="flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Store Settings</span></button>
          </div>
        </div>

        <div className="md:col-span-3">
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50"><h2 className="text-xl font-bold text-gray-800">Recent Orders</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b"><th className="p-4 font-bold">Date</th><th className="p-4 font-bold">Customer</th><th className="p-4 font-bold">Total</th><th className="p-4 font-bold">Status</th><th className="p-4 font-bold">Action</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm font-medium text-gray-600">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="p-4"><p className="font-bold text-gray-900">{order.customer_name}</p><p className="text-xs text-gray-500">{order.customer_address}</p></td>
                        <td className="p-4 font-bold text-green-700">{currency}{Number(order.total_amount).toLocaleString()}</td>
                        <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span></td>
                        <td className="p-4"><select className="border border-gray-300 rounded-lg text-sm p-1.5 outline-none focus:ring-2 focus:ring-black font-medium cursor-pointer" value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}><option value="Pending">Pending</option><option value="Processing">Processing</option><option value="Completed">Completed</option></select></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <div className="p-12 text-center text-gray-400 font-medium text-lg">No orders yet. Keep pushing your link!</div>}
              </div>
            </div>
          )}
          
          {activeTab === 'qr' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-lg mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Store QR Code</h2>
              <p className="text-gray-500 mb-8 font-medium">Print this and place it on your tables or counter. Customers can scan it to order directly from their phones!</p>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 inline-block mb-6 shadow-inner"><img src={qrCodeUrl} alt="Store QR Code" className="w-64 h-64 mx-auto rounded-lg" /></div>
              <div className="flex gap-4 justify-center">
                <a href={qrCodeUrl} download="Store_QRCode.png" target="_blank" rel="noreferrer" className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download QR</a>
                <a href={storeUrl} target="_blank" rel="noreferrer" className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors">Visit Store</a>
              </div>
            </div>
          )}
          
          {activeTab === 'catalog' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
               <h2 className="text-xl font-bold text-gray-800 mb-6">Manage Your Menu</h2>
               <form onSubmit={handleSaveProduct} className="mb-8 bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-inner">
                 <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                   {editingProductId ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Edit Product</> : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add New Product</>}
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label><input required className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price ({currency})</label><input required type="number" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} /></div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category (e.g. Mains, Drinks)</label><input required className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} /></div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Image (Optional)</label><input id="product-image" type="file" accept="image/*" onChange={e => setProductImageFile(e.target.files[0])} className="w-full border p-2 rounded-lg text-sm bg-white" /></div>
                 </div>
                 <div className="flex gap-3">
                   <button type="submit" disabled={isProductUploading} className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400">{isProductUploading ? 'Saving...' : (editingProductId ? 'Update Item' : 'Add Item')}</button>
                   {editingProductId && <button type="button" onClick={cancelEdit} className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors">Cancel</button>}
                 </div>
               </form>
               <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                 {products.map(p => (
                   <div key={p.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white transition-colors gap-4">
                     <div className="flex items-center gap-4">
                       {p.image_url ? <img src={p.image_url} alt={p.name} className="w-16 h-16 object-cover rounded-lg shadow-sm border bg-white" /> : <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 border">No Img</div>}
                       <div><h4 className="font-bold text-gray-900 text-lg leading-tight">{p.name}</h4><p className="text-green-700 font-bold mb-1">{currency}{Number(p.price).toLocaleString()}</p><span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">{p.category}</span></div>
                     </div>
                     <div className="flex gap-2 sm:flex-col sm:items-end">
                        <button onClick={() => handleEditClick(p)} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 border border-blue-200 transition-colors flex-1 sm:flex-none text-center">Edit</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 border border-red-200 transition-colors flex-1 sm:flex-none text-center">Delete</button>
                     </div>
                   </div>
                 ))}
                 {products.length === 0 && <p className="text-center text-gray-400 font-medium py-10">Your menu is empty. Add your first item above!</p>}
               </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-2xl">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Store Settings</h2>
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Brand Identity & Localization</h3>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">Store Currency</label>
                    <select className="w-full border p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none font-bold cursor-pointer" value={editMerchant.currency || '₦'} onChange={e => setEditMerchant({...editMerchant, currency: e.target.value})}>
                      <option value="₦">Naira (₦)</option>
                      <option value="$">Dollars ($)</option>
                      <option value="€">Euros (€)</option>
                      <option value="£">Pounds (£)</option>
                      <option value="GH₵">Cedis (GH₵)</option>
                      <option value="¥">Yuan (¥)</option>
                      <option value="FG">Francs (FG)</option>
                    </select>
                  </div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Theme Color</label><input type="color" value={editMerchant.theme_color || '#000000'} onChange={e => setEditMerchant({...editMerchant, theme_color: e.target.value})} className="w-full h-12 rounded cursor-pointer border p-1 bg-white" /></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Business Logo</label>{editMerchant.logo_url && <img src={editMerchant.logo_url} alt="Logo" className="h-16 mb-2 rounded-lg border object-contain bg-white p-1" />}<input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} className="w-full border p-2 rounded-lg text-sm bg-white" /></div>
                </div>

                {/* NEW: STOREFRONT HERO SECTION */}
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Storefront Hero Section</h3>
                  <p className="text-sm text-gray-500 mb-2">Display a beautiful welcome banner at the top of your public store.</p>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Hero Text (Optional)</label><textarea placeholder="e.g. Welcome to the best fashion store in Lagos!" className="w-full border p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none text-sm h-20" value={editMerchant.hero_text || ''} onChange={e => setEditMerchant({...editMerchant, hero_text: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-1.5 text-gray-700">Font Style</label>
                      <select className="w-full border p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none text-sm cursor-pointer" value={editMerchant.hero_font || 'sans-serif'} onChange={e => setEditMerchant({...editMerchant, hero_font: e.target.value})}>
                        <option value="sans-serif">Modern (Sans-Serif)</option>
                        <option value="serif">Classic (Serif)</option>
                        <option value="monospace">Code (Monospace)</option>
                      </select>
                    </div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Text Color</label><input type="color" value={editMerchant.hero_text_color || '#ffffff'} onChange={e => setEditMerchant({...editMerchant, hero_text_color: e.target.value})} className="w-full h-11 rounded cursor-pointer border p-1 bg-white" /></div>
                  </div>
                </div>

                {/* NEW: CONTACT & LOCATION */}
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Contact & Location</h3>
                  <p className="text-sm text-gray-500 mb-2">This information will appear in your storefront's footer.</p>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Business Email</label><input type="email" placeholder="contact@yourstore.com" className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.contact_email || ''} onChange={e => setEditMerchant({...editMerchant, contact_email: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Physical Address</label><textarea placeholder="123 Main Street, City..." className="w-full border p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none text-sm h-16" value={editMerchant.physical_address || ''} onChange={e => setEditMerchant({...editMerchant, physical_address: e.target.value})} /></div>
                </div>

                {/* NEW: SMART DELIVERY ENGINE */}
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Smart Delivery Engine</h3>
                  <p className="text-sm text-gray-500 mb-2">Automatically calculate delivery fees at checkout based on the customer's location.</p>
                  
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                    <input type="checkbox" className="w-5 h-5 accent-black cursor-pointer" checked={editMerchant.delivery_enabled || false} onChange={e => setEditMerchant({...editMerchant, delivery_enabled: e.target.checked})} />
                    <span className="font-bold text-gray-800">Enable Smart Distance Calculation</span>
                  </label>

                  {editMerchant.delivery_enabled && (
                    <div className="animate-slide-in">
                      <label className="block text-sm font-bold mb-1.5 text-gray-700 mt-4">Delivery Rate per Kilometer ({currency})</label>
                      <input type="number" placeholder="e.g. 500" className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.delivery_rate_per_km || ''} onChange={e => setEditMerchant({...editMerchant, delivery_rate_per_km: e.target.value})} />
                      <p className="text-xs text-gray-500 mt-2 font-medium">When customers pin their location, we will multiply the total KM distance by this rate to calculate their final delivery fee.</p>
                    </div>
                  )}
                </div>

                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Social Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Instagram URL</label><input placeholder="https://instagram.com/..." className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.instagram_url || ''} onChange={e => setEditMerchant({...editMerchant, instagram_url: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">TikTok URL</label><input placeholder="https://tiktok.com/@..." className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.tiktok_url || ''} onChange={e => setEditMerchant({...editMerchant, tiktok_url: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Facebook URL</label><input placeholder="https://facebook.com/..." className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.facebook_url || ''} onChange={e => setEditMerchant({...editMerchant, facebook_url: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">X (Twitter) URL</label><input placeholder="https://x.com/..." className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.x_url || ''} onChange={e => setEditMerchant({...editMerchant, x_url: e.target.value})} /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-bold mb-1.5 text-gray-700">LinkedIn URL</label><input placeholder="https://linkedin.com/company/..." className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.linkedin_url || ''} onChange={e => setEditMerchant({...editMerchant, linkedin_url: e.target.value})} /></div>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Security</h3>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Manager PIN</label><input required maxLength="4" type="password" placeholder="1234" className="w-full border p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.pin_code || ''} onChange={e => setEditMerchant({...editMerchant, pin_code: e.target.value})} /><p className="text-xs text-gray-500 mt-1">If you change this, you will need to use the new PIN the next time you log in.</p></div>
                </div>

                <button type="submit" disabled={isUploading} className="bg-black text-white px-6 py-4 rounded-xl font-bold w-full text-lg shadow-md hover:bg-gray-800 transition-colors disabled:bg-gray-400">{isUploading ? 'Saving Settings...' : 'Save All Settings'}</button>
              </form>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.2s ease-out forwards; }`}} />
    </div>
  )
}