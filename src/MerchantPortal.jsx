import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function MerchantPortal() {
  const { storeSlug } = useParams()
  const [merchant, setMerchant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false)
  const [setupEmail, setSetupEmail] = useState('')
  const [setupPassword, setSetupPassword] = useState('')
  const [setupError, setSetupError] = useState('')

  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' })
  const [passwordMessage, setPasswordMessage] = useState('')

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

  // 5-MINUTE INACTIVITY AUTO-LOGOUT TIMER
  useEffect(() => {
    if (!isAuthenticated) return
    let timeoutId
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        handleLogout()
        alert('You have been logged out due to 5 minutes of inactivity for security reasons.')
      }, 5 * 60 * 1000)
    }
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, resetTimer))
    resetTimer()
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      events.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [isAuthenticated])

  useEffect(() => { fetchMerchantDetails() }, [storeSlug])

  async function fetchMerchantDetails() {
    const { data, error } = await supabase.from('merchants').select('*').eq('slug', storeSlug).single()
    if (error || !data) {
      alert('Store not found!')
      setLoading(false)
      return
    }

    let currentMerchant = { ...data }
    setMerchant(currentMerchant)
    setEditMerchant(currentMerchant)

    const isGodMode = sessionStorage.getItem('crudhub_god_mode') === 'true'
    const isMerchantSession = sessionStorage.getItem(`crudhub_auth_${storeSlug}`) === 'true'

    // Check if user just returned from linking Google on the setup screen
    const { data: { session } } = await supabase.auth.getSession()
    if (session && session.user && session.user.email && (!currentMerchant.contact_email || !currentMerchant.pin_code)) {
      const email = session.user.email.toLowerCase()
      const { error: updateError } = await supabase.from('merchants').update({
        contact_email: email,
        pin_code: 'google-oauth-user'
      }).eq('id', currentMerchant.id)

      if (!updateError) {
        currentMerchant.contact_email = email
        currentMerchant.pin_code = 'google-oauth-user'
        setMerchant(currentMerchant)
        setEditMerchant(currentMerchant)
        sessionStorage.setItem(`crudhub_auth_${storeSlug}`, 'true')
        setIsAuthenticated(true)
        fetchOrders(currentMerchant.id)
        fetchProducts(currentMerchant.id)
        setLoading(false)
        return // Stop execution, auth is complete
      }
    }

    // AUTH LOGIC
    if (isGodMode) {
      // Admin bypasses everything straight to the dashboard
      setIsAuthenticated(true)
      fetchOrders(currentMerchant.id)
      fetchProducts(currentMerchant.id)
    } else if (isMerchantSession) {
      if (!currentMerchant.contact_email || !currentMerchant.pin_code) {
        // Merchant is logged in but hasn't set up email yet
        setIsFirstTimeSetup(true)
      } else {
        setIsAuthenticated(true)
        fetchOrders(currentMerchant.id)
        fetchProducts(currentMerchant.id)
      }
    }

    setLoading(false)
  }

  async function handleGoogleLink() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href // Brings them right back to this portal page
      }
    })
    if (error) alert('Google Sign-In Error: ' + error.message)
  }

  async function handleFirstTimeSetupSubmit(e) {
    e.preventDefault()
    if (!setupEmail || !setupPassword) return

    const { error } = await supabase.from('merchants').update({
      contact_email: setupEmail.toLowerCase(),
      pin_code: setupPassword
    }).eq('id', merchant.id)

    if (error) {
      setSetupError(error.message)
    } else {
      alert('Security credentials configured successfully!')
      setIsFirstTimeSetup(false)
      setIsAuthenticated(true)
      setMerchant(prev => ({ ...prev, contact_email: setupEmail.toLowerCase(), pin_code: setupPassword }))
      setEditMerchant(prev => ({ ...prev, contact_email: setupEmail.toLowerCase(), pin_code: setupPassword }))
      fetchOrders(merchant.id)
      fetchProducts(merchant.id)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (merchant.contact_email && loginEmail.toLowerCase() === merchant.contact_email.toLowerCase() && loginPassword === merchant.pin_code) { 
      sessionStorage.setItem(`crudhub_auth_${storeSlug}`, 'true')
      if (!merchant.contact_email || !merchant.pin_code) {
        setIsFirstTimeSetup(true)
      } else {
        setIsAuthenticated(true)
        fetchOrders(merchant.id)
        fetchProducts(merchant.id)
      }
    } else {
      setAuthError('Incorrect Email or Password.')
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordMessage('New passwords do not match.')
      return
    }
    if (passwordForm.current !== merchant.pin_code) {
      setPasswordMessage('Current password is incorrect.')
      return
    }
    const { error } = await supabase.from('merchants').update({ pin_code: passwordForm.newPass }).eq('id', merchant.id)
    if (!error) {
      setPasswordMessage('Password updated successfully!')
      setMerchant(prev => ({ ...prev, pin_code: passwordForm.newPass }))
      setPasswordForm({ current: '', newPass: '', confirm: '' })
    } else {
      setPasswordMessage('Error: ' + error.message)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(`crudhub_auth_${storeSlug}`)
    sessionStorage.removeItem('crudhub_god_mode')
    setIsAuthenticated(false)
    setLoginEmail('')
    setLoginPassword('')
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
  }
  async function handleResetAnalytics() {
    if (!window.confirm("Are you sure you want to reset your analytics?")) return
    const { error } = await supabase.from('orders').delete().eq('merchant_id', merchant.id)
    if (!error) { setOrders([]); alert('Analytics reset to zero successfully!') }
  }
  async function uploadFile(file, pathPrefix) {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('crudhub-images').upload(fileName, file)
    if (error) return null
    const { data } = supabase.storage.from('crudhub-images').getPublicUrl(fileName)
    return data.publicUrl
  }
  async function searchStoreAddress(query) {
    setMapSearchQuery(query)
    if (query.length < 4) { setAddressSuggestions([]); return }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`)
      const data = await res.json(); setAddressSuggestions(data)
    } catch (e) { console.error(e) }
  }
  function selectStoreAddress(suggestion) {
    setEditMerchant({ ...editMerchant, store_lat: parseFloat(suggestion.lat), store_lng: parseFloat(suggestion.lon) })
    setMapSearchQuery(suggestion.display_name); setAddressSuggestions([])
  }
  function getStoreLocation() {
    if (!navigator.geolocation) return alert('Location services are not supported by your browser.')
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude; const lng = position.coords.longitude
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        const data = await res.json()
        setEditMerchant({ ...editMerchant, store_lat: lat, store_lng: lng })
        setMapSearchQuery(data.display_name || `Pinned Coordinates`)
      } catch(e) {
        setEditMerchant({ ...editMerchant, store_lat: lat, store_lng: lng })
        setMapSearchQuery(`Pinned Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
      }
    }, () => alert('Unable to retrieve location.'))
  }
  async function handleUpdateSettings(e) {
    e.preventDefault(); setIsUploading(true); let logo_url = editMerchant.logo_url
    if (logoFile) { const uploadedUrl = await uploadFile(logoFile, `logos/${editMerchant.slug}`); if (uploadedUrl) logo_url = uploadedUrl }
    const { error } = await supabase.from('merchants').update({ 
      theme_color: editMerchant.theme_color, logo_url: logo_url, currency: editMerchant.currency,
      phone_number: editMerchant.phone_number, facebook_url: editMerchant.facebook_url, instagram_url: editMerchant.instagram_url, 
      linkedin_url: editMerchant.linkedin_url, tiktok_url: editMerchant.tiktok_url, x_url: editMerchant.x_url, 
      contact_email: editMerchant.contact_email, physical_address: editMerchant.physical_address, hero_text: editMerchant.hero_text, 
      hero_font: editMerchant.hero_font, hero_text_color: editMerchant.hero_text_color, delivery_enabled: editMerchant.delivery_enabled, 
      delivery_rate_per_km: editMerchant.delivery_rate_per_km, store_lat: editMerchant.store_lat, store_lng: editMerchant.store_lng
    }).eq('id', merchant.id)
    if (!error) { alert('Settings updated!'); setMerchant({...editMerchant, logo_url}); setLogoFile(null) }
    setIsUploading(false)
  }
  function handleAddVariant() {
    if (!variantInput.label) return
    setNewProduct({ ...newProduct, variants: [...(newProduct.variants || []), { label: variantInput.label, price: Number(variantInput.price) || 0 }] })
    setVariantInput({ label: '', price: '' })
  }
  function removeVariant(index) {
    const updated = [...newProduct.variants]; updated.splice(index, 1); setNewProduct({ ...newProduct, variants: updated })
  }
  async function handleSaveProduct(e) {
    e.preventDefault(); setIsProductUploading(true)
    let image_url = editingProductId ? products.find(p => p.id === editingProductId)?.image_url : null
    if (productImageFile) { const uploadedUrl = await uploadFile(productImageFile, `products/${merchant.slug}`); if (uploadedUrl) image_url = uploadedUrl }
    const productPayload = { ...newProduct, image_url: image_url, variants: newProduct.variants || [] }
    if (editingProductId) await supabase.from('products').update(productPayload).eq('id', editingProductId)
    else await supabase.from('products').insert([{ ...productPayload, merchant_id: merchant.id }])
    fetchProducts(merchant.id); cancelEdit(); setIsProductUploading(false)
  }
  async function handleDeleteProduct(id) { if (window.confirm('Delete this item?')) { await supabase.from('products').delete().eq('id', id); fetchProducts(merchant.id) } }
  function handleEditClick(product) { setEditingProductId(product.id); setNewProduct({ name: product.name, description: product.description || '', price: product.price, category: product.category, variants: product.variants || [] }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function cancelEdit() { setEditingProductId(null); setNewProduct({ name: '', description: '', price: '', category: '', variants: [] }); setProductImageFile(null); const fileInput = document.getElementById('product-image'); if (fileInput) fileInput.value = '' }
  function getDaysRemaining(endDateString) {
    if (!endDateString) return 0
    const end = new Date(endDateString); const today = new Date(); return Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  }
  async function handleShareStore() {
    const storeUrl = `https://crudhub.com.ng/${merchant.slug}`
    if (navigator.share) { try { await navigator.share({ title: merchant.business_name, text: 'Order on WhatsApp!', url: storeUrl }) } catch (err) {} } 
    else { navigator.clipboard.writeText(storeUrl); alert('Store link copied!') }
  }
  async function handleClearNotification() {
    const { error } = await supabase.from('merchants').update({ admin_message: null }).eq('id', merchant.id)
    if (!error) { setMerchant({ ...merchant, admin_message: null }); setEditMerchant({ ...editMerchant, admin_message: null }); setIsNotificationsOpen(false) }
  }

  const totalRevenue = orders.filter(o => o.status === 'Completed').reduce((sum, o) => sum + Number(o.total_amount), 0)
  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length
  const itemCounts = {}
  orders.forEach(o => { if (o.items && Array.isArray(o.items)) { o.items.forEach(item => { itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity }) } })
  const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Loading space...</div>
  if (!merchant) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-red-600">Store not found.</div>

  // FIRST-TIME SETUP MODAL
  if (isFirstTimeSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center animate-slide-in">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Security Setup Required</h2>
          <p className="text-gray-500 mb-6 text-sm">Please secure your store dashboard by linking your Google account or setting an email and password.</p>
          
          <button onClick={handleGoogleLink} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl mb-4 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.35 7.23 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 11.7s.43 3.58 1.19 5.12l4.09-2.55z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.65 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
            Link with Google
          </button>

          <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-bold">Or Setup Email</span><div className="flex-grow border-t border-gray-200"></div></div>

          <form onSubmit={handleFirstTimeSetupSubmit} className="space-y-4 text-left mt-2">
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Email Address</label>
              <input required type="email" className="w-full border p-3 rounded-xl bg-gray-50 outline-none font-bold" value={setupEmail} onChange={e => setSetupEmail(e.target.value)} placeholder="you@business.com" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">New Password</label>
              <input required type="password" minLength="6" className="w-full border p-3 rounded-xl bg-gray-50 outline-none font-mono" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {setupError && <p className="text-red-500 text-sm font-bold">{setupError}</p>}
            <button type="submit" className="w-full bg-black text-white font-bold py-3.5 rounded-xl mt-2 shadow-md">Save & Proceed to Dashboard</button>
          </form>
        </div>
      </div>
    )
  }

  // STANDARD LOGIN LOCK SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          {merchant.logo_url ? (
            <img src={merchant.logo_url} alt="Logo" className="w-24 h-24 mx-auto rounded-full object-cover border-4 mb-4 shadow-sm" style={{ borderColor: merchant.theme_color || '#000' }} />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-sm" style={{ backgroundColor: merchant.theme_color || '#000' }}>{merchant.business_name.charAt(0)}</div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{merchant.business_name}</h1>
          <p className="text-gray-500 mb-6 font-medium">Enter your credentials to access your workspace.</p>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-bold mb-1.5 text-gray-700">Email Address</label>
              <input required type="email" className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black" value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setAuthError('') }} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5 text-gray-700">Password</label>
              <input required type="password" className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black" value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setAuthError('') }} />
            </div>
            {authError && <p className="text-red-500 text-sm font-bold text-center">{authError}</p>}
            <button type="submit" className="w-full text-white font-bold py-3.5 rounded-xl text-lg shadow-sm transition-transform active:scale-95 mt-2" style={{ backgroundColor: merchant.theme_color || '#000' }}>Unlock Portal</button>
          </form>
        </div>
      </div>
    )
  }

  const storeUrl = `https://crudhub.com.ng/${merchant.slug}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(storeUrl)}`
  const currency = merchant.currency || '₦'
  const daysLeft = getDaysRemaining(merchant.subscription_end_date)
  const showWarning = daysLeft <= 3
  const isExpired = daysLeft < 0

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm relative">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {merchant.logo_url && <img src={merchant.logo_url} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border hidden sm:block" />}
            <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate">{merchant.business_name}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 font-bold text-sm bg-gray-50 px-4 py-2.5 rounded-xl border hover:bg-red-50 transition-colors">Log Out</button>
          </div>
        </div>
      </div>

      <div className={`max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mt-8`}>
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Store Link</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-bold text-gray-800 break-all mb-4">crudhub.com.ng/{merchant.slug}</div>
            <button onClick={handleShareStore} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700">Share Store</button>
          </div>
          <div className="space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-5 py-4 rounded-xl font-bold ${activeTab === 'dashboard' ? 'bg-black text-white' : 'bg-white text-gray-700 border'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('orders')} className={`w-full text-left px-5 py-4 rounded-xl font-bold ${activeTab === 'orders' ? 'bg-black text-white' : 'bg-white text-gray-700 border'}`}>Order History</button>
            <button onClick={() => setActiveTab('qr')} className={`w-full text-left px-5 py-4 rounded-xl font-bold ${activeTab === 'qr' ? 'bg-black text-white' : 'bg-white text-gray-700 border'}`}>Store QR Code</button>
            <button onClick={() => setActiveTab('catalog')} className={`w-full text-left px-5 py-4 rounded-xl font-bold ${activeTab === 'catalog' ? 'bg-black text-white' : 'bg-white text-gray-700 border'}`}>My Catalog</button>
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-5 py-4 rounded-xl font-bold ${activeTab === 'settings' ? 'bg-black text-white' : 'bg-white text-gray-700 border'}`}>Store Settings</button>
          </div>
        </div>

        <div className="md:col-span-3">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div><h2 className="text-xl font-bold text-gray-900">Performance Overview</h2></div>
                <button onClick={handleResetAnalytics} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-xs font-bold">Reset Analytics</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border"><p className="text-sm font-bold text-gray-500">Total Sales</p><h3 className="text-3xl font-black">{currency}{totalRevenue.toLocaleString()}</h3></div>
                <div className="bg-white p-6 rounded-2xl border"><p className="text-sm font-bold text-gray-500">Total Orders</p><h3 className="text-3xl font-black">{orders.length}</h3></div>
                <div className="bg-white p-6 rounded-2xl border"><p className="text-sm font-bold text-gray-500">Needs Action</p><h3 className="text-3xl font-black">{pendingOrdersCount}</h3></div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border overflow-hidden p-6">
              <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
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
            <div className="bg-white rounded-2xl border p-8 text-center max-w-lg mx-auto">
              <h2 className="text-2xl font-bold mb-4">Store QR Code</h2>
              <img src={qrCodeUrl} alt="QR" className="w-48 h-48 mx-auto mb-4 border rounded" />
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="bg-white rounded-2xl border p-6">
              <h2 className="text-xl font-bold mb-4">Manage Menu</h2>
              <form onSubmit={handleSaveProduct} className="space-y-4 mb-6 bg-gray-50 p-4 rounded-xl border">
                <input required placeholder="Item Name" className="w-full border p-2.5 rounded-lg bg-white" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <input required type="number" placeholder="Price" className="w-full border p-2.5 rounded-lg bg-white" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                <input required placeholder="Category" className="w-full border p-2.5 rounded-lg bg-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                <button type="submit" className="bg-black text-white px-6 py-2.5 rounded-lg font-bold">Save Product</button>
              </form>
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="flex justify-between p-3 border rounded-xl items-center bg-gray-50">
                    <span className="font-bold">{p.name} - {currency}{p.price}</span>
                    <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded font-bold text-sm">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border p-6 max-w-2xl space-y-8">
              <h2 className="text-xl font-bold text-gray-800">Store Settings</h2>
              
              <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3">Security & Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Current Password</label>
                    <input required type="password" className="w-full border p-2.5 rounded-lg bg-white" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">New Password</label>
                    <input required type="password" minLength="6" className="w-full border p-2.5 rounded-lg bg-white" value={passwordForm.newPass} onChange={e => setPasswordForm({...passwordForm, newPass: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Confirm New Password</label>
                    <input required type="password" minLength="6" className="w-full border p-2.5 rounded-lg bg-white" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} />
                  </div>
                  {passwordMessage && <p className={`text-sm font-bold ${passwordMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{passwordMessage}</p>}
                  <button type="submit" className="bg-black text-white px-5 py-2 rounded-lg font-bold text-sm">Update Password</button>
                </form>
              </div>

              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div><label className="block text-sm font-bold mb-1">WhatsApp / Phone Number</label><input type="tel" className="w-full border p-2.5 rounded-lg" value={editMerchant.phone_number || ''} onChange={e => setEditMerchant({...editMerchant, phone_number: e.target.value})} /></div>
                <div><label className="block text-sm font-bold mb-1">Business Email</label><input type="email" className="w-full border p-2.5 rounded-lg" value={editMerchant.contact_email || ''} onChange={e => setEditMerchant({...editMerchant, contact_email: e.target.value})} /></div>
                <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold w-full">Save Changes</button>
              </form>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.2s ease-out forwards; }`}} />
    </div>
  )
}