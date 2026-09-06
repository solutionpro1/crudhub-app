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
    let isMerchantSession = sessionStorage.getItem(`crudhub_auth_${storeSlug}`) === 'true'

    // Check if user just returned from Google Auth
    const { data: { session } } = await supabase.auth.getSession()
    if (session && session.user && session.user.email) {
      const email = session.user.email.toLowerCase()
      
      if (!currentMerchant.contact_email || !currentMerchant.pin_code) {
        // First time linking Google account to an old store
        const { error: updateError } = await supabase.from('merchants').update({
          contact_email: email,
          pin_code: 'google-oauth-user'
        }).eq('id', currentMerchant.id)

        if (!updateError) {
          currentMerchant.contact_email = email
          currentMerchant.pin_code = 'google-oauth-user'
          setMerchant(currentMerchant)
          setEditMerchant(currentMerchant)
          isMerchantSession = true
          sessionStorage.setItem(`crudhub_auth_${storeSlug}`, 'true')
        }
      } else if (currentMerchant.contact_email.toLowerCase() === email) {
        // Normal Google Login (Emails match!)
        isMerchantSession = true
        sessionStorage.setItem(`crudhub_auth_${storeSlug}`, 'true')
      } else if (!isGodMode && !isMerchantSession) {
        // If they use the wrong Google account
        setAuthError('This Google account is not associated with this store.')
        await supabase.auth.signOut()
      }
    }

    // AUTH LOGIC
    if (isGodMode) {
      setIsFirstTimeSetup(false)
      setIsAuthenticated(true)
      fetchOrders(currentMerchant.id)
      fetchProducts(currentMerchant.id)
    } else if (isMerchantSession) {
      if (!currentMerchant.contact_email || !currentMerchant.pin_code) {
        setIsFirstTimeSetup(true)
      } else {
        setIsAuthenticated(true)
        fetchOrders(currentMerchant.id)
        fetchProducts(currentMerchant.id)
      }
    }

    setLoading(false)
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    })
    if (error) alert('Google Sign-In Error: ' + error.message)
  }

  async function handleGoogleLink() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
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

  async function handleLogout() {
    await supabase.auth.signOut()
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
    
    // UPDATED PAYLOAD WITH NEW HERO SETTINGS
    const { error } = await supabase.from('merchants').update({ 
      theme_color: editMerchant.theme_color, logo_url: logo_url, currency: editMerchant.currency,
      phone_number: editMerchant.phone_number, facebook_url: editMerchant.facebook_url, instagram_url: editMerchant.instagram_url, 
      linkedin_url: editMerchant.linkedin_url, tiktok_url: editMerchant.tiktok_url, x_url: editMerchant.x_url, 
      contact_email: editMerchant.contact_email, physical_address: editMerchant.physical_address, 
      hero_text: editMerchant.hero_text, hero_font: editMerchant.hero_font, hero_text_color: editMerchant.hero_text_color,
      hero_font_size: editMerchant.hero_font_size, hero_is_bold: editMerchant.hero_is_bold, 
      hero_is_italic: editMerchant.hero_is_italic, hero_is_underline: editMerchant.hero_is_underline, 
      delivery_enabled: editMerchant.delivery_enabled, delivery_rate_per_km: editMerchant.delivery_rate_per_km, 
      store_lat: editMerchant.store_lat, store_lng: editMerchant.store_lng
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
              <input required type="password" minLength="6" className="w-full border p-3 rounded-xl bg-gray-50 outline-none font-mono" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} placeholder="********" />
            </div>
            {setupError && <p className="text-red-500 text-sm font-bold">{setupError}</p>}
            <button type="submit" className="w-full bg-black text-white font-bold py-3.5 rounded-xl mt-2 shadow-md hover:bg-gray-800 transition">Save & Proceed to Dashboard</button>
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
          
          <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl mb-4 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.35 7.23 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 11.7s.43 3.58 1.19 5.12l4.09-2.55z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.65 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
            Continue with Google
          </button>

          <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-bold">Or with Email</span><div className="flex-grow border-t border-gray-200"></div></div>

          <form onSubmit={handleLogin} className="space-y-4 text-left mt-2">
            <div>
              <label className="block text-sm font-bold mb-1.5 text-gray-700">Email Address</label>
              <input required type="email" className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black" value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setAuthError('') }} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5 text-gray-700">Password</label>
              <input required type="password" placeholder="********" className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black" value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setAuthError('') }} />
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

  // --- PORTAL UI ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      
      {/* TOP NAVIGATION BAR */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm relative">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {merchant.logo_url ? (
              <img src={merchant.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: merchant.theme_color || '#000' }} />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: merchant.theme_color || '#000' }}>{merchant.business_name.charAt(0)}</div>
            )}
            <h1 className="text-xl font-black text-gray-900 truncate tracking-tight">{merchant.business_name} Workspace</h1>
          </div>
          <button onClick={handleLogout} className="text-gray-600 hover:text-red-600 font-bold text-sm bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer shadow-sm">
            Log Out
          </button>
        </div>
      </div>

      <div className={`max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mt-8`}>
        
        {/* SIDEBAR NAVIGATION */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Live Store Link</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-bold text-gray-800 break-all mb-4 truncate shadow-inner">
              crudhub.com.ng/{merchant.slug}
            </div>
            <button onClick={handleShareStore} className="w-full text-white py-3 rounded-xl font-bold shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer" style={{ backgroundColor: merchant.theme_color || '#000' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share Store
            </button>
          </div>

          <div className="space-y-2 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
              { id: 'orders', label: 'Order History', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
              { id: 'catalog', label: 'Inventory Manager', icon: 'M20 16.2A23.84 23.84 0 0 1 12 22a23.84 23.84 0 0 1-8-5.8M12 2v20' },
              { id: 'qr', label: 'Store QR Code', icon: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z' },
              { id: 'settings', label: 'Store Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`w-full text-left px-5 py-3.5 rounded-xl font-bold flex items-center gap-3 transition-colors cursor-pointer ${activeTab === tab.id ? 'bg-gray-100 text-gray-900 shadow-inner' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon}/>
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="md:col-span-3">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-slide-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm gap-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Overview</h2>
                  <p className="text-gray-500 text-sm font-medium mt-1">Monitor your store's real-time performance.</p>
                </div>
                <button onClick={handleResetAnalytics} className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors shadow-sm cursor-pointer">
                  Reset Analytics
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
                  <p className="text-sm font-bold text-gray-500 mb-1">Total Revenue</p>
                  <h3 className="text-4xl font-black text-gray-900">{currency}{totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>
                  <p className="text-sm font-bold text-gray-500 mb-1">Total Orders</p>
                  <h3 className="text-4xl font-black text-gray-900">{orders.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
                  <p className="text-sm font-bold text-gray-500 mb-1">Pending Orders</p>
                  <h3 className="text-4xl font-black text-yellow-600">{pendingOrdersCount}</h3>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDER HISTORY (Basic List for now) */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-slide-in">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-black tracking-tight">Order History</h2>
              </div>
              <div className="overflow-x-auto p-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="pb-3 font-bold">Date</th>
                      <th className="pb-3 font-bold">Customer</th>
                      <th className="pb-3 font-bold">Total</th>
                      <th className="pb-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr><td colSpan="4" className="py-8 text-center text-gray-500 font-medium">No orders yet.</td></tr>
                    ) : orders.map(o => (
                      <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-4 text-sm font-medium text-gray-600">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="py-4 font-bold text-gray-900">{o.customer_name}</td>
                        <td className="py-4 font-black text-green-600">{currency}{Number(o.total_amount).toLocaleString()}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${o.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: QR CODE */}
          {activeTab === 'qr' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center mx-auto animate-slide-in">
              <h2 className="text-2xl font-black mb-2 tracking-tight">Print & Scan</h2>
              <p className="text-gray-500 text-sm font-medium mb-8">Customers can scan this code to instantly open your store menu.</p>
              <div className="inline-block p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner mb-6">
                <img src={qrCodeUrl} alt="Store QR Code" className="w-64 h-64 mx-auto rounded-xl" />
              </div>
              <button onClick={() => window.open(qrCodeUrl, '_blank')} className="block mx-auto bg-black text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-colors">
                Download High-Res QR
              </button>
            </div>
          )}

          {/* TAB 4: INVENTORY MANAGER (Catalog) */}
          {activeTab === 'catalog' && (
            <div className="space-y-8 animate-slide-in">
              
              {/* Add/Edit Product Form */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: merchant.theme_color || '#000' }}></div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black tracking-tight">{editingProductId ? 'Edit Product' : 'Add New Product'}</h2>
                  {editingProductId && <button onClick={cancelEdit} className="text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-100 px-4 py-2 rounded-lg cursor-pointer">Cancel Edit</button>}
                </div>
                
                <form onSubmit={handleSaveProduct} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Product Name</label>
                      <input required className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black font-medium" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. Classic Burger" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Base Price ({currency})</label>
                      <input required type="number" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black font-bold text-green-700" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} placeholder="0.00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                      <input required className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black font-medium" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} placeholder="e.g. Mains, Drinks" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Product Image (Optional)</label>
                      <input type="file" id="product-image" accept="image/*" onChange={e => setProductImageFile(e.target.files[0])} className="w-full border border-gray-200 p-2.5 rounded-xl bg-gray-50 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Description (Optional)</label>
                    <textarea rows="2" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black font-medium resize-none" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Briefly describe this item..." />
                  </div>

                  {/* Add-ons and Variations Builder */}
                  <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                    <h3 className="font-bold text-blue-900 mb-2">Add-ons & Variations (Optional)</h3>
                    <p className="text-xs text-blue-700 mb-4 font-medium">Allow customers to select extras (e.g., Large Size, Extra Cheese).</p>
                    
                    <div className="flex gap-2 mb-4">
                      <input placeholder="e.g. Extra Cheese" className="flex-grow border border-blue-200 p-3 rounded-lg bg-white outline-none font-medium text-sm" value={variantInput.label} onChange={e => setVariantInput({...variantInput, label: e.target.value})} />
                      <input type="number" placeholder="+ Price" className="w-28 border border-blue-200 p-3 rounded-lg bg-white outline-none font-bold text-sm text-green-700" value={variantInput.price} onChange={e => setVariantInput({...variantInput, price: e.target.value})} />
                      <button type="button" onClick={handleAddVariant} className="bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 cursor-pointer text-sm whitespace-nowrap">Add</button>
                    </div>

                    {newProduct.variants && newProduct.variants.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newProduct.variants.map((v, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white border border-blue-200 px-3 py-1.5 rounded-full text-sm shadow-sm">
                            <span className="font-bold text-gray-700">{v.label}</span>
                            <span className="text-green-600 font-black text-xs">+{currency}{v.price}</span>
                            <button type="button" onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600 font-black ml-1 cursor-pointer">X</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={isProductUploading} className="w-full text-white px-6 py-4 rounded-xl font-bold shadow-md hover:opacity-90 transition-opacity disabled:bg-gray-400 text-lg" style={{ backgroundColor: merchant.theme_color || '#000' }}>
                    {isProductUploading ? 'Saving...' : (editingProductId ? 'Update Product' : 'Add to Catalog')}
                  </button>
                </form>
              </div>

              {/* Product List */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                <h2 className="text-2xl font-black tracking-tight mb-6">Current Inventory</h2>
                {products.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium">Your catalog is empty. Add your first product above!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map(p => (
                      <div key={p.id} className="flex gap-4 p-4 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow relative group">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-20 h-20 object-cover rounded-xl border border-gray-100 shadow-sm flex-shrink-0" />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <svg width="24" height="24" className="text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                        )}
                        <div className="flex-grow min-w-0">
                          <h3 className="font-black text-gray-900 truncate">{p.name}</h3>
                          <p className="text-xs font-bold text-gray-500 mb-1">{p.category}</p>
                          <p className="font-black text-green-600 text-lg">{currency}{p.price}</p>
                          {p.variants && p.variants.length > 0 && (
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{p.variants.length} Add-on(s)</p>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                          <button onClick={() => handleEditClick(p)} className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 shadow-sm cursor-pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 shadow-sm cursor-pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: STORE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-8 animate-slide-in">
              <form onSubmit={handleUpdateSettings}>
                
                {/* Branding & Appearance */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mb-8">
                  <h2 className="text-xl font-black mb-6 border-b pb-4">Branding & Appearance</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Store Logo</label>
                      <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} className="w-full border border-gray-200 p-2.5 rounded-xl bg-gray-50 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Brand Theme Color</label>
                      <div className="flex items-center gap-3">
                        <input type="color" className="w-12 h-12 rounded cursor-pointer border-0 p-0" value={editMerchant.theme_color || '#000000'} onChange={e => setEditMerchant({...editMerchant, theme_color: e.target.value})} />
                        <input type="text" className="flex-grow border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none font-mono text-sm uppercase" value={editMerchant.theme_color || '#000000'} onChange={e => setEditMerchant({...editMerchant, theme_color: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Store Currency Symbol</label>
                      <select className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none font-bold" value={editMerchant.currency || '₦'} onChange={e => setEditMerchant({...editMerchant, currency: e.target.value})}>
                        <option value="₦">NGN (₦)</option>
                        <option value="$">USD ($)</option>
                        <option value="£">GBP (£)</option>
                        <option value="€">EUR (€)</option>
                        <option value="GH₵">GHS (GH₵)</option>
                        <option value="FG">GNF (FG)</option>
                      </select>
                    </div>

                    {/* NEW: ADVANCED HERO TEXT STYLING BLOCK */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-5 rounded-xl border border-gray-200 mt-2">
                      <label className="block text-sm font-bold text-gray-900 mb-2">Hero Banner Message & Styling</label>
                      <input type="text" className="w-full border border-gray-200 p-3.5 rounded-xl bg-white outline-none font-medium mb-4 shadow-sm" value={editMerchant.hero_text || ''} onChange={e => setEditMerchant({...editMerchant, hero_text: e.target.value})} placeholder="e.g. Welcome to our store!" />
                      
                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-lg shadow-sm">
                          <span className="text-xs font-bold text-gray-500 pl-2">Color:</span>
                          <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 p-0" value={editMerchant.hero_text_color || '#000000'} onChange={e => setEditMerchant({...editMerchant, hero_text_color: e.target.value})} />
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-lg shadow-sm">
                          <span className="text-xs font-bold text-gray-500 pl-2">Font:</span>
                          <select className="border-none bg-transparent outline-none text-sm font-bold pr-2" value={editMerchant.hero_font || 'sans'} onChange={e => setEditMerchant({...editMerchant, hero_font: e.target.value})}>
                            <option value="sans">Sans-Serif</option>
                            <option value="serif">Serif</option>
                            <option value="mono">Monospace</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-lg shadow-sm">
                          <span className="text-xs font-bold text-gray-500 pl-2">Size:</span>
                          <select className="border-none bg-transparent outline-none text-sm font-bold pr-2" value={editMerchant.hero_font_size || 'text-3xl'} onChange={e => setEditMerchant({...editMerchant, hero_font_size: e.target.value})}>
                            <option value="text-xl">Small</option>
                            <option value="text-3xl">Medium</option>
                            <option value="text-5xl">Large</option>
                            <option value="text-7xl">Huge</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                          <button type="button" onClick={() => setEditMerchant({...editMerchant, hero_is_bold: !editMerchant.hero_is_bold})} className={`w-8 h-8 rounded flex items-center justify-center font-serif font-bold transition-colors ${editMerchant.hero_is_bold ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}>B</button>
                          <button type="button" onClick={() => setEditMerchant({...editMerchant, hero_is_italic: !editMerchant.hero_is_italic})} className={`w-8 h-8 rounded flex items-center justify-center font-serif italic transition-colors ${editMerchant.hero_is_italic ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}>I</button>
                          <button type="button" onClick={() => setEditMerchant({...editMerchant, hero_is_underline: !editMerchant.hero_is_underline})} className={`w-8 h-8 rounded flex items-center justify-center font-serif underline transition-colors ${editMerchant.hero_is_underline ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}>U</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Logistics */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mb-8">
                  <h2 className="text-xl font-black mb-6 border-b pb-4">Delivery & Location</h2>
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <input type="checkbox" id="delivery_enabled" checked={editMerchant.delivery_enabled || false} onChange={e => setEditMerchant({...editMerchant, delivery_enabled: e.target.checked})} className="w-5 h-5 accent-black cursor-pointer" />
                      <label htmlFor="delivery_enabled" className="font-bold text-gray-900 cursor-pointer">Enable Smart GPS Delivery Integration</label>
                    </div>
                    
                    {editMerchant.delivery_enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-blue-50 border border-blue-100 rounded-xl animate-slide-in">
                        <div>
                          <label className="block text-sm font-bold text-blue-900 mb-2">Delivery Rate per Kilometer ({currency})</label>
                          <input type="number" className="w-full border border-blue-200 p-3.5 rounded-xl bg-white outline-none font-bold text-green-700" value={editMerchant.delivery_rate_per_km || ''} onChange={e => setEditMerchant({...editMerchant, delivery_rate_per_km: e.target.value})} placeholder="e.g. 500" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-blue-900 mb-2">Base Location for Calculations</label>
                          <div className="flex gap-2">
                            <input type="text" className="flex-grow border border-blue-200 p-3.5 rounded-xl bg-white outline-none font-medium text-sm" value={mapSearchQuery} onChange={e => searchStoreAddress(e.target.value)} placeholder="Search store address..." />
                            <button type="button" onClick={getStoreLocation} className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700 cursor-pointer" title="Use current location">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                            </button>
                          </div>
                          {addressSuggestions.length > 0 && (
                            <ul className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden absolute z-50 max-w-sm">
                              {addressSuggestions.map((s, i) => (
                                <li key={i} onClick={() => selectStoreAddress(s)} className="p-3 text-xs border-b hover:bg-blue-50 cursor-pointer truncate">{s.display_name}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* NEW: SOCIAL MEDIA PROFILES */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mb-8">
                  <h2 className="text-xl font-black mb-6 border-b pb-4">Social Media Profiles</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Instagram URL</label>
                      <input type="url" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none font-medium" value={editMerchant.instagram_url || ''} onChange={e => setEditMerchant({...editMerchant, instagram_url: e.target.value})} placeholder="https://instagram.com/..." />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Facebook URL</label>
                      <input type="url" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none font-medium" value={editMerchant.facebook_url || ''} onChange={e => setEditMerchant({...editMerchant, facebook_url: e.target.value})} placeholder="https://facebook.com/..." />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">X (Twitter) URL</label>
                      <input type="url" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none font-medium" value={editMerchant.x_url || ''} onChange={e => setEditMerchant({...editMerchant, x_url: e.target.value})} placeholder="https://x.com/..." />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">TikTok URL</label>
                      <input type="url" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none font-medium" value={editMerchant.tiktok_url || ''} onChange={e => setEditMerchant({...editMerchant, tiktok_url: e.target.value})} placeholder="https://tiktok.com/@..." />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">LinkedIn URL</label>
                      <input type="url" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none font-medium" value={editMerchant.linkedin_url || ''} onChange={e => setEditMerchant({...editMerchant, linkedin_url: e.target.value})} placeholder="https://linkedin.com/in/..." />
                    </div>
                  </div>
                </div>

                {/* Contact & Security */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mb-8">
                  <h2 className="text-xl font-black mb-6 border-b pb-4">Contact & Security</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp Order Number</label>
                      <input type="tel" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none font-bold" value={editMerchant.phone_number || ''} onChange={e => setEditMerchant({...editMerchant, phone_number: e.target.value})} placeholder="Must include country code, e.g. 234..." />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Store Email Address</label>
                      <input type="email" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none font-medium" value={editMerchant.contact_email || ''} onChange={e => setEditMerchant({...editMerchant, contact_email: e.target.value})} />
                    </div>
                  </div>

                  <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Update Password
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input type="password" placeholder="Current Password" className="w-full border border-gray-200 p-3 rounded-xl bg-white outline-none text-sm" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} />
                      <input type="password" placeholder="New Password" minLength="6" className="w-full border border-gray-200 p-3 rounded-xl bg-white outline-none text-sm" value={passwordForm.newPass} onChange={e => setPasswordForm({...passwordForm, newPass: e.target.value})} />
                      <div className="flex gap-2">
                        <input type="password" placeholder="Confirm New" minLength="6" className="w-full border border-gray-200 p-3 rounded-xl bg-white outline-none text-sm" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} />
                        <button type="button" onClick={handleChangePassword} className="bg-gray-800 text-white px-4 rounded-xl font-bold hover:bg-black text-sm whitespace-nowrap shadow-sm">Save</button>
                      </div>
                    </div>
                    {passwordMessage && <p className={`text-xs font-bold mt-2 ${passwordMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{passwordMessage}</p>}
                  </div>
                </div>

                {/* Final Save Button */}
                <div className="sticky bottom-4 z-50 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200 flex justify-end">
                  <button type="submit" disabled={isUploading} className="text-white px-10 py-4 rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity disabled:bg-gray-400 text-lg w-full sm:w-auto" style={{ backgroundColor: merchant.theme_color || '#000' }}>
                    {isUploading ? 'Saving Configuration...' : 'Save All Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.2s ease-out forwards; } html { scroll-behavior: smooth; }`}} />
    </div>
  )
}