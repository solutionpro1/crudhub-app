import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Admin() {
  const [session, setSession] = useState(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  const [merchants, setMerchants] = useState([])
  const [products, setProducts] = useState([])
  const [allProductsCount, setAllProductsCount] = useState(0)
  const [activeView, setActiveView] = useState('list')
  const [selectedMerchant, setSelectedMerchant] = useState(null)

  const [newMerchant, setNewMerchant] = useState({ business_name: '', slug: '', phone_number: '', pin_code: '1234' })
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' })

  const [globalBroadcastMessage, setGlobalBroadcastMessage] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  const [logoFile, setLogoFile] = useState(null)
  const [productImageFile, setProductImageFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { 
    if (session) {
      fetchMerchants()
      fetchPlatformStats()
    } 
  }, [session])

  async function fetchMerchants() {
    const { data } = await supabase.from('merchants').select('*').order('created_at', { ascending: false })
    setMerchants(data || [])
  }

  async function fetchPlatformStats() {
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true })
    setAllProductsCount(count || 0)
  }

  async function fetchProducts(merchantId) {
    const { data } = await supabase.from('products').select('*').eq('merchant_id', merchantId)
    setProducts(data || [])
  }

  async function handleLogin(e) {
    e.preventDefault()
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) alert(error.message)
    setAuthLoading(false)
  }

  async function handleLogout() { await supabase.auth.signOut() }

  async function uploadFile(file, pathPrefix) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('crudhub-images').upload(fileName, file);
    if (error) { alert('Upload failed: ' + error.message); return null; }
    const { data } = supabase.storage.from('crudhub-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleCreateMerchant(e) {
    e.preventDefault()
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 14)
    
    const { error } = await supabase.from('merchants').insert([{ 
      ...newMerchant, 
      theme_color: '#000000', 
      status: 'active',
      subscription_plan: 'trial',
      subscription_end_date: trialEndDate.toISOString()
    }])
    if (!error) {
      alert('Client created successfully!')
      fetchMerchants()
      setActiveView('list')
      setNewMerchant({ business_name: '', slug: '', phone_number: '', pin_code: '1234' })
    } else { alert('Error: ' + error.message) }
  }

  async function handleDeleteMerchant(id) {
    if (window.confirm('Are you sure you want to completely delete this store? This cannot be undone.')) {
      await supabase.from('merchants').delete().eq('id', id)
      fetchMerchants()
    }
  }

  async function handleToggleStatus(merchant) {
    const newStatus = merchant.status === 'suspended' ? 'active' : 'suspended'
    const confirmMessage = newStatus === 'suspended' 
      ? `Suspend ${merchant.business_name}? Their storefront will instantly go offline.`
      : `Reactivate ${merchant.business_name}? Their storefront will go back online.`
      
    if (window.confirm(confirmMessage)) {
      const { error } = await supabase.from('merchants').update({ status: newStatus }).eq('id', merchant.id)
      if (error) alert('Error updating status: ' + error.message)
      else {
        fetchMerchants()
        if (selectedMerchant && selectedMerchant.id === merchant.id) {
          setSelectedMerchant({...selectedMerchant, status: newStatus})
        }
      }
    }
  }

  async function handleRenewSubscription(planType) {
    const daysToAdd = planType === 'monthly' ? 30 : 365;
    const currentEnd = selectedMerchant.subscription_end_date ? new Date(selectedMerchant.subscription_end_date) : new Date();
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEndDate = new Date(baseDate.setDate(baseDate.getDate() + daysToAdd)).toISOString();

    if (window.confirm(`Confirm renewal of ${selectedMerchant.business_name} for 1 ${planType === 'monthly' ? 'Month' : 'Year'}?`)) {
      const { error } = await supabase.from('merchants').update({ 
        subscription_plan: planType,
        subscription_end_date: newEndDate,
        status: 'active'
      }).eq('id', selectedMerchant.id)
      
      if (!error) {
        alert('Subscription extended successfully!')
        fetchMerchants()
        setSelectedMerchant({...selectedMerchant, subscription_plan: planType, subscription_end_date: newEndDate, status: 'active'})
      } else alert('Error: ' + error.message)
    }
  }

  async function handleBroadcastToAll(e) {
    e.preventDefault()
    if (!globalBroadcastMessage.trim()) return
    if (!window.confirm('Are you sure you want to send this broadcast message to ALL merchants?')) return

    setIsBroadcasting(true)
    const { error } = await supabase
      .from('merchants')
      .update({ admin_message: globalBroadcastMessage.trim() })
      .not('id', 'is', null)

    if (!error) {
      alert('Broadcast message sent to all merchants successfully!')
      setGlobalBroadcastMessage('')
      fetchMerchants()
    } else {
      alert('Error broadcasting message: ' + error.message)
    }
    setIsBroadcasting(false)
  }

  async function handleClearAllBroadcasts() {
    if (!window.confirm('Clear broadcast message from ALL merchants?')) return
    setIsBroadcasting(true)
    const { error } = await supabase
      .from('merchants')
      .update({ admin_message: null })
      .not('id', 'is', null)

    if (!error) {
      alert('All broadcasts cleared successfully!')
      fetchMerchants()
    } else {
      alert('Error clearing broadcasts: ' + error.message)
    }
    setIsBroadcasting(false)
  }

  async function handleUpdateBrand(e) {
    e.preventDefault()
    setIsUploading(true)
    let logo_url = selectedMerchant.logo_url
    if (logoFile) {
      const uploadedUrl = await uploadFile(logoFile, `logos/${selectedMerchant.slug}`)
      if (uploadedUrl) logo_url = uploadedUrl
    }
    const { error } = await supabase.from('merchants').update({ 
      business_name: selectedMerchant.business_name,
      phone_number: selectedMerchant.phone_number,
      theme_color: selectedMerchant.theme_color, 
      logo_url: logo_url, 
      pin_code: selectedMerchant.pin_code,
      currency: selectedMerchant.currency,
      admin_message: selectedMerchant.admin_message,
      facebook_url: selectedMerchant.facebook_url, 
      instagram_url: selectedMerchant.instagram_url,
      linkedin_url: selectedMerchant.linkedin_url,
      tiktok_url: selectedMerchant.tiktok_url, 
      x_url: selectedMerchant.x_url
    }).eq('id', selectedMerchant.id)
    
    if (!error) {
      alert('Merchant details & settings updated!')
      setSelectedMerchant({...selectedMerchant, logo_url})
      setLogoFile(null)
      fetchMerchants()
    } else alert('Error: ' + error.message)
    setIsUploading(false)
  }

  async function handleAddProduct(e) {
    e.preventDefault()
    setIsUploading(true)
    let image_url = null
    if (productImageFile) { image_url = await uploadFile(productImageFile, `products/${selectedMerchant.slug}`) }
    const { error } = await supabase.from('products').insert([{ ...newProduct, merchant_id: selectedMerchant.id, image_url: image_url }])
    if (!error) {
      fetchProducts(selectedMerchant.id)
      fetchPlatformStats()
      setNewProduct({ name: '', description: '', price: '', category: '' })
      setProductImageFile(null)
      document.getElementById('product-image').value = '';
    } else alert('Error: ' + error.message)
    setIsUploading(false)
  }

  async function handleDeleteProduct(id) {
    await supabase.from('products').delete().eq('id', id)
    fetchProducts(selectedMerchant.id)
    fetchPlatformStats()
  }

  function getDaysRemaining(endDateString) {
    if (!endDateString) return 0;
    const end = new Date(endDateString);
    const today = new Date();
    const diffTime = end - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async function handleShareStore() {
    const storeUrl = `https://crudhub.com.ng/${selectedMerchant.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedMerchant.business_name,
          text: 'Check out our online store and place your order on WhatsApp!',
          url: storeUrl,
        });
      } catch (err) {
        console.log('Share canceled or not supported on this device.');
      }
    } else {
      navigator.clipboard.writeText(storeUrl);
      alert('Store link copied to clipboard!');
    }
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold">Checking access...</div>
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border border-gray-100">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">Crudhub Security</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="block text-sm font-bold text-gray-700 mb-1">Admin Email</label><input required type="email" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-1">Password</label><input required type="password" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} /></div>
            <button type="submit" className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors">Access Dashboard</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 bg-gray-100 min-h-screen font-sans pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <img src="/crudhub-logo.jpg" alt="Crudhub Logo" className="h-12 w-12 rounded-full object-cover shadow-sm border border-gray-200" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Crudhub Super Admin</h1>
          </div>
          <div className="flex gap-4">
            {activeView !== 'list' && <button onClick={() => setActiveView('list')} className="bg-white border border-gray-300 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 text-sm shadow-sm">Back to Dashboard</button>}
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 text-sm border border-red-200 shadow-sm">Logout</button>
          </div>
        </div>

        {activeView === 'list' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div><p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Total Stores</p><h3 className="text-4xl font-black text-gray-900">{merchants.length}</h3></div>
                <div className="text-gray-300"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div><p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Platform Products</p><h3 className="text-4xl font-black text-gray-900">{allProductsCount}</h3></div>
                <div className="text-gray-300"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                 <button onClick={() => setActiveView('add')} className="bg-black text-white px-6 py-4 rounded-xl font-bold w-full hover:bg-gray-800 transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2 text-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Create New Store</span>
                 </button>
              </div>
            </div>

            {/* Platform Broadcast to All Merchants */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
                <h2 className="text-lg font-bold text-gray-900">Broadcast Announcement to ALL Merchants</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4 font-medium">Send a global banner message that instantly shows at the top of every merchant's dashboard.</p>
              <form onSubmit={handleBroadcastToAll} className="space-y-3">
                <textarea 
                  required
                  placeholder="Type a global message for all merchants (e.g. Scheduled maintenance tonight at 11 PM WAT)..." 
                  className="w-full border p-3 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-black min-h-[70px] text-sm font-medium"
                  value={globalBroadcastMessage} 
                  onChange={e => setGlobalBroadcastMessage(e.target.value)}
                />
                <div className="flex flex-wrap gap-3">
                  <button 
                    type="submit" 
                    disabled={isBroadcasting} 
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400"
                  >
                    {isBroadcasting ? 'Broadcasting...' : 'Send to All Merchants'}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleClearAllBroadcasts} 
                    disabled={isBroadcasting} 
                    className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-200 border border-gray-300 transition-colors disabled:opacity-50"
                  >
                    Clear All Broadcasts
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Merchant Directory</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                      <th className="p-4 font-bold">Business</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Time Left</th>
                      <th className="p-4 font-bold">Store Link</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {merchants.map(m => {
                      const daysLeft = getDaysRemaining(m.subscription_end_date);
                      let timeColor = 'text-green-600 bg-green-50';
                      if (daysLeft <= 3 && daysLeft >= 0) timeColor = 'text-orange-600 bg-orange-50 border border-orange-200';
                      if (daysLeft < 0) timeColor = 'text-red-600 bg-red-50 border border-red-200';

                      return (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="p-4 flex items-center gap-3">
                            {m.logo_url ? <img src={m.logo_url} className="w-10 h-10 rounded-full object-cover border bg-white" /> : <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 border border-gray-300">{m.business_name?.charAt(0)}</div>}
                            <span className="font-bold text-gray-900">{m.business_name}</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${m.status === 'suspended' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                              {m.status === 'suspended' ? 'Suspended' : 'Active'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${timeColor}`}>
                              {daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Expires Today' : `${daysLeft} Days`}
                            </span>
                          </td>
                          <td className="p-4"><a href={`/${m.slug}`} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline flex items-center gap-1 w-fit">/{m.slug} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a></td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setSelectedMerchant(m); fetchProducts(m.id); setActiveView('manage'); }} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-100 border border-blue-200 transition-colors">Manage</button>
                              <button onClick={() => handleDeleteMerchant(m.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100 border border-red-200 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'add' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-gray-200 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Register a New Client</h2>
            <form onSubmit={handleCreateMerchant} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Business Name</label><input required className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white" value={newMerchant.business_name} onChange={e => setNewMerchant({...newMerchant, business_name: e.target.value})} /></div>
                <div><label className="block text-sm font-bold mb-1.5 text-gray-700">URL Slug</label><input required className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white" value={newMerchant.slug} onChange={e => setNewMerchant({...newMerchant, slug: e.target.value.toLowerCase()})} /></div>
                <div><label className="block text-sm font-bold mb-1.5 text-gray-700">WhatsApp Number</label><input required type="tel" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white" value={newMerchant.phone_number} onChange={e => setNewMerchant({...newMerchant, phone_number: e.target.value})} /></div>
                <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Manager PIN</label><input required maxLength="4" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white" value={newMerchant.pin_code} onChange={e => setNewMerchant({...newMerchant, pin_code: e.target.value})} /></div>
              </div>
              <p className="text-sm text-gray-500 mt-2 font-medium">New clients automatically receive a 14-day free trial.</p>
              <button type="submit" className="bg-green-600 text-white px-4 py-3.5 mt-4 rounded-xl font-bold w-full text-lg shadow-sm hover:bg-green-700 transition-colors">Launch Client Space</button>
            </form>
          </div>
        )}

        {activeView === 'manage' && selectedMerchant && (
          <div className="space-y-6">
            
            {/* Massive Native Share Button */}
            <button onClick={handleShareStore} className="w-full sm:w-auto bg-green-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-700 transition-transform active:scale-95 shadow-md flex items-center justify-center gap-3 text-lg border-2 border-green-700">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share Store Link
            </button>

            {/* Admin Broadcast Banner Display */}
            {selectedMerchant.admin_message && (
              <div className="bg-blue-50 border border-blue-200 text-blue-900 p-5 rounded-2xl shadow-sm flex gap-4 items-start">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-blue-600"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
                <div>
                  <h3 className="font-bold text-lg mb-1">Message from SolutionPRO</h3>
                  <p className="text-sm font-medium leading-relaxed">{selectedMerchant.admin_message}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Subscription</h2>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                    <div className="flex justify-between items-end mb-2"><span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Plan</span><span className="font-black text-gray-900 capitalize">{selectedMerchant.subscription_plan}</span></div>
                    <div className="flex justify-between items-end mb-2"><span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Expires</span><span className="font-bold text-gray-900">{selectedMerchant.subscription_end_date ? new Date(selectedMerchant.subscription_end_date).toLocaleDateString() : 'N/A'}</span></div>
                    <div className="flex justify-between items-end pt-2 border-t border-gray-200"><span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Time Left</span><span className={`font-bold px-2 py-0.5 rounded text-sm ${getDaysRemaining(selectedMerchant.subscription_end_date) <= 3 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{getDaysRemaining(selectedMerchant.subscription_end_date)} Days</span></div>
                  </div>
                  <div className="space-y-3">
                    <button onClick={() => handleRenewSubscription('monthly')} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-sm flex justify-between px-4"><span>Renew Monthly</span><span className="text-gray-300">₦1,400</span></button>
                    <button onClick={() => handleRenewSubscription('yearly')} className="w-full bg-white text-gray-900 border-2 border-gray-200 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm flex justify-between px-4"><span>Renew Yearly</span><span className="text-gray-500">₦13,440</span></button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Platform Status</h2>
                  <p className="text-sm text-gray-500 mb-4">Toggle storefront access for this client.</p>
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${selectedMerchant.status === 'suspended' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <span className={`font-bold ${selectedMerchant.status === 'suspended' ? 'text-red-800' : 'text-green-800'}`}>{selectedMerchant.status === 'suspended' ? 'Store is Offline' : 'Store is Active'}</span>
                    <button onClick={() => handleToggleStatus(selectedMerchant)} className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-sm transition-transform active:scale-95 ${selectedMerchant.status === 'suspended' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>{selectedMerchant.status === 'suspended' ? 'Reactivate' : 'Suspend Store'}</button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Core Details & Brand</h2>
                  <form onSubmit={handleUpdateBrand} className="space-y-4">
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Business Name</label><input required className="w-full border p-2.5 rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-black" value={selectedMerchant.business_name || ''} onChange={e => setSelectedMerchant({...selectedMerchant, business_name: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">WhatsApp Number</label><input required type="tel" className="w-full border p-2.5 rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-black" value={selectedMerchant.phone_number || ''} onChange={e => setSelectedMerchant({...selectedMerchant, phone_number: e.target.value})} /></div>
                    
                    <div className="pt-4 border-t border-gray-100">
                      <label className="block text-sm font-bold mb-1.5 text-gray-700">Store Currency</label>
                      <select className="w-full border p-2.5 rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-black cursor-pointer font-bold" value={selectedMerchant.currency || '₦'} onChange={e => setSelectedMerchant({...selectedMerchant, currency: e.target.value})}>
                        <option value="₦">Naira (₦)</option>
                        <option value="$">Dollars ($)</option>
                        <option value="€">Euros (€)</option>
                        <option value="£">Pounds (£)</option>
                        <option value="GH₵">Cedis (GH₵)</option>
                        <option value="¥">Yuan (¥)</option>
                        <option value="FG">Francs (FG)</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <label className="block text-sm font-bold mb-1.5 text-gray-700">Individual Merchant Message</label>
                      <textarea placeholder="Type a specific message for this merchant only..." className="w-full border p-2.5 rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-black min-h-[70px] text-sm" value={selectedMerchant.admin_message || ''} onChange={e => setSelectedMerchant({...selectedMerchant, admin_message: e.target.value})}></textarea>
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <label className="block text-sm font-bold text-gray-700">Social Media Links</label>
                      <input placeholder="Facebook URL (https://...)" className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white outline-none text-sm" value={selectedMerchant.facebook_url || ''} onChange={e => setSelectedMerchant({...selectedMerchant, facebook_url: e.target.value})} />
                      <input placeholder="Instagram URL (https://...)" className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white outline-none text-sm" value={selectedMerchant.instagram_url || ''} onChange={e => setSelectedMerchant({...selectedMerchant, instagram_url: e.target.value})} />
                      <input placeholder="LinkedIn URL (https://...)" className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white outline-none text-sm" value={selectedMerchant.linkedin_url || ''} onChange={e => setSelectedMerchant({...selectedMerchant, linkedin_url: e.target.value})} />
                      <input placeholder="TikTok URL (https://...)" className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white outline-none text-sm" value={selectedMerchant.tiktok_url || ''} onChange={e => setSelectedMerchant({...selectedMerchant, tiktok_url: e.target.value})} />
                      <input placeholder="X / Twitter URL (https://...)" className="w-full border p-2 rounded-lg bg-gray-50 focus:bg-white outline-none text-sm" value={selectedMerchant.x_url || ''} onChange={e => setSelectedMerchant({...selectedMerchant, x_url: e.target.value})} />
                    </div>

                    <div className="pt-2"><label className="block text-sm font-bold mb-1.5 text-gray-700">Theme Color</label><input type="color" value={selectedMerchant.theme_color || '#000000'} onChange={e => setSelectedMerchant({...selectedMerchant, theme_color: e.target.value})} className="w-full h-12 rounded cursor-pointer border p-1" /></div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Manager PIN</label><input required maxLength="4" className="w-full border p-2.5 rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-black" value={selectedMerchant.pin_code || ''} onChange={e => setSelectedMerchant({...selectedMerchant, pin_code: e.target.value})} /></div>
                    <div>
                      <label className="block text-sm font-bold mb-1.5 text-gray-700">Business Logo</label>
                      {selectedMerchant.logo_url && <img src={selectedMerchant.logo_url} alt="Logo" className="h-16 mb-2 rounded-lg border object-contain bg-gray-50 p-1" />}
                      <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} className="w-full border p-2 rounded-lg text-sm bg-gray-50" />
                    </div>
                    <button type="submit" disabled={isUploading} className="bg-black text-white px-4 py-3 mt-4 rounded-xl font-bold w-full disabled:bg-gray-400 hover:bg-gray-800 transition-colors">
                      {isUploading ? 'Saving...' : 'Save Settings'}
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-200 h-fit">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Manage Catalog</h2>
                <form onSubmit={handleAddProduct} className="flex flex-col gap-3 mb-6 bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input required placeholder="Item Name" className="border p-2.5 rounded-lg flex-1 outline-none focus:ring-2 focus:ring-black" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                    <div className="flex items-center bg-white border rounded-lg focus-within:ring-2 focus-within:ring-black sm:w-32 overflow-hidden">
                       <span className="pl-3 font-bold text-gray-500">{selectedMerchant.currency || '₦'}</span>
                       <input required type="number" placeholder="Price" className="p-2.5 w-full outline-none bg-transparent" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                    </div>
                    <input required placeholder="Category" className="border p-2.5 rounded-lg sm:w-1/4 outline-none focus:ring-2 focus:ring-black" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <input id="product-image" type="file" accept="image/*" onChange={e => setProductImageFile(e.target.files[0])} className="border p-2 rounded-lg flex-1 text-sm bg-white w-full" />
                    <button type="submit" disabled={isUploading} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold disabled:bg-gray-400 hover:bg-green-700 transition-colors w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2">
                      {isUploading ? 'Adding...' : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Item</>}
                    </button>
                  </div>
                </form>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {products.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white transition-colors">
                      <div className="flex items-center gap-4">
                        {p.image_url ? <img src={p.image_url} alt={p.name} className="w-14 h-14 object-cover rounded-lg border shadow-sm bg-white" /> : <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500 font-bold border">No Img</div>}
                        <div>
                          <h4 className="font-bold text-gray-900">{p.name}</h4>
                          <p className="text-sm text-green-700 font-bold">{selectedMerchant.currency || '₦'}{Number(p.price).toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm transition-colors border border-transparent hover:border-red-200">Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}