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
  
  const [activeTab, setActiveTab] = useState('dashboard')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [editMerchant, setEditMerchant] = useState({})
  const [logoFile, setLogoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '', variants: [] })
  const [variantInput, setVariantInput] = useState({ label: '', price: '' })
  
  const [productImageFile, setProductImageFile] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [isProductUploading, setIsProductUploading] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [mapSearchQuery, setMapSearchQuery] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState([])

  useEffect(() => { fetchMerchantDetails() }, [storeSlug])

  async function fetchMerchantDetails() {
    const { data, error } = await supabase.from('merchants').select('*').eq('slug', storeSlug).single()
    if (error || !data) {
      alert('Store not found!')
      setLoading(false)
      return
    }

    setMerchant(data)
    setEditMerchant(data)

    // GOD-MODE BYPASS CHECK: If you came from the Super Admin panel, bypass the PIN lock automatically!
    const isGodMode = sessionStorage.getItem('crudhub_god_mode') === 'true'
    if (isGodMode) {
      setIsAuthenticated(true)
      fetchOrders(data.id)
      fetchProducts(data.id)
    }

    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (pinInput === merchant.pin_code) { 
      setIsAuthenticated(true); 
      fetchOrders(merchant.id); 
      fetchProducts(merchant.id); 
    } else {
      setAuthError('Incorrect PIN code. Please try again.')
    }
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

  async function searchStoreAddress(query) {
    setMapSearchQuery(query);
    if (query.length < 4) { setAddressSuggestions([]); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setAddressSuggestions(data);
    } catch (e) { console.error(e); }
  }

  function selectStoreAddress(suggestion) {
    setEditMerchant({ ...editMerchant, store_lat: parseFloat(suggestion.lat), store_lng: parseFloat(suggestion.lon) });
    setMapSearchQuery(suggestion.display_name);
    setAddressSuggestions([]);
  }

  function getStoreLocation() {
    if (!navigator.geolocation) return alert('Location services are not supported by your browser.');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude; const lng = position.coords.longitude;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        setEditMerchant({ ...editMerchant, store_lat: lat, store_lng: lng });
        setMapSearchQuery(data.display_name || `Pinned Coordinates`);
      } catch(e) {
        setEditMerchant({ ...editMerchant, store_lat: lat, store_lng: lng });
        setMapSearchQuery(`Pinned Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    }, () => alert('Unable to retrieve location.'));
  }

  async function handleUpdateSettings(e) {
    e.preventDefault(); setIsUploading(true); let logo_url = editMerchant.logo_url;
    if (logoFile) { const uploadedUrl = await uploadFile(logoFile, `logos/${editMerchant.slug}`); if (uploadedUrl) logo_url = uploadedUrl; }
    const { error } = await supabase.from('merchants').update({ 
      theme_color: editMerchant.theme_color, logo_url: logo_url, pin_code: editMerchant.pin_code, currency: editMerchant.currency,
      facebook_url: editMerchant.facebook_url, instagram_url: editMerchant.instagram_url, linkedin_url: editMerchant.linkedin_url,
      tiktok_url: editMerchant.tiktok_url, x_url: editMerchant.x_url, contact_email: editMerchant.contact_email, physical_address: editMerchant.physical_address,
      hero_text: editMerchant.hero_text, hero_font: editMerchant.hero_font, hero_text_color: editMerchant.hero_text_color,
      delivery_enabled: editMerchant.delivery_enabled, delivery_rate_per_km: editMerchant.delivery_rate_per_km, store_lat: editMerchant.store_lat, store_lng: editMerchant.store_lng
    }).eq('id', merchant.id)
    if (!error) { alert('Store settings updated successfully!'); setMerchant({...editMerchant, logo_url}); setLogoFile(null); }
    else alert('Error: ' + error.message) 
    setIsUploading(false)
  }

  function handleAddVariant() {
    if (!variantInput.label) return;
    setNewProduct({ ...newProduct, variants: [...(newProduct.variants || []), { label: variantInput.label, price: Number(variantInput.price) || 0 }] });
    setVariantInput({ label: '', price: '' });
  }

  function removeVariant(index) {
    const updated = [...newProduct.variants];
    updated.splice(index, 1);
    setNewProduct({ ...newProduct, variants: updated });
  }

  async function handleSaveProduct(e) {
    e.preventDefault(); setIsProductUploading(true);
    let image_url = editingProductId ? products.find(p => p.id === editingProductId)?.image_url : null;
    if (productImageFile) { const uploadedUrl = await uploadFile(productImageFile, `products/${merchant.slug}`); if (uploadedUrl) image_url = uploadedUrl; }
    
    const productPayload = { ...newProduct, image_url: image_url, variants: newProduct.variants || [] };
    
    if (editingProductId) {
      const { error } = await supabase.from('products').update(productPayload).eq('id', editingProductId)
      if (error) alert('Error updating item: ' + error.message)
    } else {
      const { error } = await supabase.from('products').insert([{ ...productPayload, merchant_id: merchant.id }])
      if (error) alert('Error adding item: ' + error.message)
    }
    fetchProducts(merchant.id); setNewProduct({ name: '', description: '', price: '', category: '', variants: [] }); setProductImageFile(null); setEditingProductId(null);
    const fileInput = document.getElementById('product-image'); if(fileInput) fileInput.value = '';
    setIsProductUploading(false);
  }

  async function handleDeleteProduct(id) { if(window.confirm('Delete this item?')) { await supabase.from('products').delete().eq('id', id); fetchProducts(merchant.id); } }
  function handleEditClick(product) { setEditingProductId(product.id); setNewProduct({ name: product.name, description: product.description || '', price: product.price, category: product.category, variants: product.variants || [] }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function cancelEdit() { setEditingProductId(null); setNewProduct({ name: '', description: '', price: '', category: '', variants: [] }); setProductImageFile(null); const fileInput = document.getElementById('product-image'); if(fileInput) fileInput.value = ''; }

  function getDaysRemaining(endDateString) {
    if (!endDateString) return 0;
    const end = new Date(endDateString); const today = new Date();
    return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  }

  async function handleShareStore() {
    const storeUrl = `https://crudhub.com.ng/${merchant.slug}`;
    if (navigator.share) { try { await navigator.share({ title: merchant.business_name, text: 'Order on WhatsApp!', url: storeUrl }); } catch (err) {} } 
    else { navigator.clipboard.writeText(storeUrl); alert('Store link copied!'); }
  }

  async function handleClearNotification() {
    const { error } = await supabase.from('merchants').update({ admin_message: null }).eq('id', merchant.id)
    if (!error) { setMerchant({ ...merchant, admin_message: null }); setEditMerchant({ ...editMerchant, admin_message: null }); setIsNotificationsOpen(false); }
  }

  const totalRevenue = orders.filter(o => o.status === 'Completed').reduce((sum, o) => sum + Number(o.total_amount), 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;
  
  const itemCounts = {};
  orders.forEach(o => {
    if (o.items && Array.isArray(o.items)) {
      o.items.forEach(item => { itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity; });
    }
  });
  const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

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
            <button onClick={() => { sessionStorage.removeItem('crudhub_god_mode'); setIsAuthenticated(false); }} className="text-gray-500 hover:text-red-600 font-bold text-sm bg-gray-50 px-4 py-2.5 rounded-xl border hover:bg-red-50 transition-colors">Lock</button>
          </div>
        </div>
      </div>

      {showWarning && (
        <div className={`max-w-6xl mx-auto px-6 mt-8 mb-2`}>
          <div className={`p-4 rounded-xl border-l-4 flex items-start gap-4 shadow-sm ${isExpired ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'}`}>
            <div className={`mt-0.5 ${isExpired ? 'text-red-500' : 'text-orange-500'}`}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <div>
              <h3 className={`font-bold text-lg ${isExpired ? 'text-red-800' : 'text-orange-800'}`}>{isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}</h3>
              <p className={`font-medium mt-1 ${isExpired ? 'text-red-700' : 'text-orange-700'}`}>{isExpired ? `Your Crudhub subscription has expired.` : `Your Crudhub subscription expires in ${daysLeft === 0 ? 'less than 24 hours' : `${daysLeft} days`}.`}</p>
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
            <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><span className="flex items-center gap-2">Dashboard</span></button>
            <button onClick={() => setActiveTab('orders')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'orders' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><span className="flex items-center gap-2">Order History</span></button>
            <button onClick={() => setActiveTab('qr')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'qr' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><span className="flex items-center gap-2">Store QR Code</span></button>
            <button onClick={() => setActiveTab('catalog')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'catalog' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><span className="flex items-center gap-2">My Catalog</span></button>
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'settings' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><span className="flex items-center gap-2">Store Settings</span></button>
          </div>
        </div>

        <div className="md:col-span-3">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Sales</p>
                  <h3 className="text-3xl font-black text-gray-900">{currency}{totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Orders</p>
                  <h3 className="text-3xl font-black text-gray-900">{orders.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Needs Action</p>
                  <h3 className="text-3xl font-black text-gray-900">{pendingOrdersCount}</h3>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Orders</h2>
              <table className="w-full text-left">
                <thead><tr className="border-b text-xs text-gray-500"><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Status</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b">
                      <td className="p-3 text-sm">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="p-3 font-bold">{o.customer_name}</td>
                      <td className="p-3 font-bold text-green-700">{currency}{Number(o.total_amount).toLocaleString()}</td>
                      <td className="p-3"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-lg mx-auto">
              <h2 className="text-2xl font-bold mb-4">Store QR Code</h2>
              <img src={qrCodeUrl} alt="QR" className="w-48 h-48 mx-auto mb-4 border rounded" />
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Manage Menu</h2>
              {products.map(p => (
                <div key={p.id} className="flex justify-between p-3 border-b items-center">
                  <span className="font-bold">{p.name}</span>
                  <span className="text-green-700 font-bold">{currency}{Number(p.price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-2xl">
              <h2 className="text-xl font-bold mb-4">Store Settings</h2>
              <p className="text-gray-500 text-sm">Settings managed successfully.</p>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.2s ease-out forwards; }`}} />
    </div>
  )
}