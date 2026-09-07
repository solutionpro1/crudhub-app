import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')

  const [merchants, setMerchants] = useState([])
  const [orders, setOrders] = useState([]) // For real platform revenue
  const [loading, setLoading] = useState(true)
  
  // New UI States
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // all, active, suspended, expiring
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  const navigate = useNavigate()

  // Modal States
  const [messagingMerchant, setMessagingMerchant] = useState(null)
  const [directMessageText, setDirectMessageText] = useState('')
  const [isSendingDM, setIsSendingDM] = useState(false)

  const [subMerchant, setSubMerchant] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [selectedEndDate, setSelectedEndDate] = useState('')
  const [isUpdatingSub, setIsUpdatingSub] = useState(false)

  // Concierge Store Creation States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newStoreForm, setNewStoreForm] = useState({ businessName: '', slug: '', adminEmail: '', password: '' })

  useEffect(() => { 
    if (sessionStorage.getItem('crudhub_superadmin') === 'true') {
      setIsAdminAuthenticated(true)
      fetchAllData() 
    } else {
      setLoading(false)
    }
  }, [])

  function handleAdminLogin(e) {
    e.preventDefault()
    // SECURE ENVIRONMENT VARIABLES (Fallback strings provided just in case .env fails to load)
    const validEmail = import.meta.env.VITE_ADMIN_EMAIL || 'realsolutionpro@outlook.com'
    const validPass = import.meta.env.VITE_ADMIN_PASSWORD || 'admin2026'

    if (adminEmail === validEmail && adminPassword === validPass) {
      sessionStorage.setItem('crudhub_superadmin', 'true')
      setIsAdminAuthenticated(true)
      setLoading(true)
      fetchAllData()
    } else {
      setAdminError('Invalid Super Admin credentials. Access Denied.')
    }
  }

  function handleAdminLogout() {
    sessionStorage.removeItem('crudhub_superadmin')
    setIsAdminAuthenticated(false)
    setAdminEmail('')
    setAdminPassword('')
  }

  async function fetchAllData() {
    const { data: mData, error: mError } = await supabase.from('merchants').select('*').order('created_at', { ascending: false })
    if (mError) alert('Error fetching merchants: ' + mError.message)
    else setMerchants(mData || [])

    // Fetch platform-wide completed orders for real analytics
    const { data: oData } = await supabase.from('orders').select('total_amount').eq('status', 'Completed')
    setOrders(oData || [])
    
    setLoading(false)
  }

  async function handleToggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    const { error } = await supabase.from('merchants').update({ status: newStatus }).eq('id', id)
    if (!error) setMerchants(merchants.map(m => m.id === id ? { ...m, status: newStatus } : m))
    else alert('Failed to update status: ' + error.message)
  }

  async function handleDeleteMerchant(id, businessName) {
    if (!window.confirm(`CRITICAL WARNING: Are you sure you want to PERMANENTLY delete "${businessName}"? This action cannot be undone.`)) return
    const { error } = await supabase.from('merchants').delete().eq('id', id)
    if (!error) {
      setMerchants(merchants.filter(m => m.id !== id))
      alert('Merchant deleted successfully.')
    } else alert('Failed to delete merchant: ' + error.message)
  }

  async function handleSendBroadcast(e) {
    e.preventDefault()
    if (!broadcastMessage.trim()) return
    setIsBroadcasting(true)
    const { error } = await supabase.from('merchants').update({ admin_message: broadcastMessage }).not('id', 'is', null)
    if (!error) { alert('Global Broadcast Sent!'); setBroadcastMessage('') }
    else alert('Error: ' + error.message)
    setIsBroadcasting(false)
  }

  async function handleSendDirectMessage(e) {
    e.preventDefault()
    if (!directMessageText.trim() || !messagingMerchant) return
    setIsSendingDM(true)
    const { error } = await supabase.from('merchants').update({ admin_message: directMessageText }).eq('id', messagingMerchant.id)
    if (!error) { alert(`Message sent to ${messagingMerchant.business_name}!`); setMessagingMerchant(null); setDirectMessageText('') }
    else alert('Error: ' + error.message)
    setIsSendingDM(false)
  }

  function exportToCSV() {
    const headers = ['Business Name', 'Slug', 'Phone', 'Email', 'Status', 'Plan', 'Expiry Date', 'Total Orders']
    const csvData = merchants.map(m => [
      `"${m.business_name || ''}"`,
      `"${m.slug || ''}"`,
      `"${m.phone_number || ''}"`,
      `"${m.contact_email || ''}"`,
      `"${m.status || 'active'}"`,
      `"${m.subscription_plan || 'trial'}"`,
      `"${m.subscription_end_date ? new Date(m.subscription_end_date).toLocaleDateString() : 'N/A'}"`,
    ])
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `crudhub_merchants_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleCreateStore(e) {
    e.preventDefault()
    setIsCreating(true)
    
    // Auto-format slug
    const cleanSlug = newStoreForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    
    // Set 14-day default trial
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    const { error } = await supabase.from('merchants').insert([{
      business_name: newStoreForm.businessName,
      slug: cleanSlug,
      contact_email: newStoreForm.adminEmail.toLowerCase(),
      pin_code: newStoreForm.password,
      status: 'active',
      subscription_plan: 'trial',
      subscription_end_date: trialEnd.toISOString(),
      theme_color: '#000000',
      currency: '₦'
    }])

    if (!error) {
      alert('Store provisioned successfully!')
      setIsCreateModalOpen(false)
      setNewStoreForm({ businessName: '', slug: '', adminEmail: '', password: '' })
      fetchAllData()
    } else {
      alert('Error provisioning store: ' + error.message)
    }
    setIsCreating(false)
  }

  function formatDateToInput(dateInput) {
    try {
      const d = dateInput ? new Date(dateInput) : new Date()
      if (isNaN(d.getTime())) {
        const fallback = new Date(); fallback.setDate(fallback.getDate() + 30)
        return fallback.toISOString().split('T')[0]
      }
      return d.toISOString().split('T')[0]
    } catch (e) {
      const fallback = new Date(); fallback.setDate(fallback.getDate() + 30)
      return fallback.toISOString().split('T')[0]
    }
  }

  function openSubModal(merchant) {
    setSubMerchant(merchant)
    setSelectedPlan(merchant.subscription_plan || 'monthly')
    setSelectedEndDate(formatDateToInput(merchant.subscription_end_date))
  }

  function addDaysToSelection(days) {
    const current = selectedEndDate ? new Date(selectedEndDate) : new Date()
    current.setDate(current.getDate() + days)
    setSelectedEndDate(formatDateToInput(current))
  }

  async function handleSaveSubscription(e) {
    e.preventDefault()
    if (!subMerchant) return
    setIsUpdatingSub(true)
    const isoDate = selectedEndDate ? new Date(selectedEndDate).toISOString() : null
    const { error } = await supabase.from('merchants').update({ subscription_plan: selectedPlan, subscription_end_date: isoDate }).eq('id', subMerchant.id)
    if (!error) {
      setMerchants(merchants.map(m => m.id === subMerchant.id ? { ...m, subscription_plan: selectedPlan, subscription_end_date: isoDate } : m))
      alert('Subscription timeline updated successfully!'); setSubMerchant(null)
    } else alert('Error: ' + error.message)
    setIsUpdatingSub(false)
  }

  function handleGodModeAccess(slug) {
    sessionStorage.setItem('crudhub_god_mode', 'true')
    navigate(`/${slug}/manage`)
  }

  // STRICT SECURITY GATE
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border-t-4 border-red-600 animate-slide-in">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-600" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
          </div>
          <h2 className="text-3xl font-black text-center text-gray-900 mb-2 tracking-tight">System Override</h2>
          <p className="text-center text-gray-500 text-sm font-bold mb-8 uppercase tracking-widest">Authorized Personnel Only</p>
          
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-black mb-1.5 text-gray-500 uppercase tracking-wider">Clearance Email</label>
              <input required type="email" placeholder="admin@domain.com" className="w-full border-2 border-gray-200 p-3.5 rounded-xl outline-none focus:border-black font-bold transition-colors" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-black mb-1.5 text-gray-500 uppercase tracking-wider">Security Key</label>
              <input required type="password" placeholder="••••••••" className="w-full border-2 border-gray-200 p-3.5 rounded-xl outline-none focus:border-black font-mono transition-colors" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
            </div>
            {adminError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold text-center border border-red-100">{adminError}</div>}
            <button type="submit" className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 mt-4 text-lg">
              Initialize God-Mode
            </button>
          </form>
        </div>
        <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }`}} />
      </div>
    )
  }

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-black text-2xl text-gray-400 animate-pulse">Decrypting Platform Data...</div>

  // Platform Analytics Calculations
  const totalStores = merchants.length
  const activeStores = merchants.filter(m => m.status === 'active').length
  const suspendedStores = merchants.filter(m => m.status === 'suspended').length
  const expiringStores = merchants.filter(m => {
    if (!m.subscription_end_date) return false
    const daysLeft = Math.ceil((new Date(m.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24))
    return daysLeft >= 0 && daysLeft <= 7
  }).length

  // Real Revenue Calculation
  const realTotalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)

  // Advanced Filtering
  const filteredMerchants = merchants.filter(m => {
    const matchesSearch = m.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || m.slug.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesTab = true
    if (activeFilter === 'active') matchesTab = m.status === 'active'
    if (activeFilter === 'suspended') matchesTab = m.status === 'suspended'
    if (activeFilter === 'expiring') {
      const daysLeft = m.subscription_end_date ? Math.ceil((new Date(m.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 999
      matchesTab = daysLeft >= 0 && daysLeft <= 7
    }

    return matchesSearch && matchesTab
  })

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      
      {/* TOP COMMAND BAR */}
      <div className="bg-gray-900 text-white shadow-xl sticky top-0 z-40 border-b-4 border-red-600">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Crudhub Command Center</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">System Online</span>
              </div>
            </div>
          </div>
          <button onClick={handleAdminLogout} className="text-gray-300 hover:text-white font-bold text-sm bg-gray-800 px-5 py-2.5 rounded-xl border border-gray-700 transition-colors cursor-pointer hover:bg-red-600 hover:border-red-600">
            Terminate Session
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-8 space-y-8">
        
        {/* PLATFORM METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Real Total GMV</p>
            <h3 className="text-4xl font-black text-gray-900">₦{realTotalRevenue.toLocaleString()}</h3>
            <p className="text-xs text-green-600 font-black mt-2 bg-green-50 inline-block px-2 py-1 rounded">Gross Merch. Value</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Stores</p>
            <h3 className="text-4xl font-black text-gray-900">{totalStores}</h3>
            <p className="text-xs text-gray-500 font-bold mt-2">Registered on network</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Accounts</p>
            <h3 className="text-4xl font-black text-green-600">{activeStores}</h3>
            <p className="text-xs text-green-600 font-bold mt-2">Fully operational</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Needs Attention</p>
            <h3 className="text-4xl font-black text-red-600">{suspendedStores + expiringStores}</h3>
            <p className="text-xs text-red-600 font-bold mt-2">Expiring soon or suspended</p>
          </div>
        </div>

        {/* BROADCAST SYSTEM */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Global Broadcast System</h2>
          </div>
          <form onSubmit={handleSendBroadcast} className="flex flex-col sm:flex-row gap-4">
            <input type="text" placeholder="Type a platform-wide announcement to appear on all merchant dashboards..." value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} className="flex-1 border-2 border-gray-200 p-4 rounded-xl outline-none focus:border-blue-600 font-medium text-sm transition-colors" />
            <button type="submit" disabled={isBroadcasting} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black hover:bg-blue-700 disabled:bg-gray-400 shrink-0 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer">
              {isBroadcasting ? 'Broadcasting...' : 'Send to All'}
            </button>
          </form>
        </div>

        {/* MERCHANT DIRECTORY TOOLBAR */}
        <div className="flex flex-col lg:flex-row justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${activeFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All Stores</button>
            <button onClick={() => setActiveFilter('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${activeFilter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Active</button>
            <button onClick={() => setActiveFilter('suspended')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${activeFilter === 'suspended' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Suspended</button>
            <button onClick={() => setActiveFilter('expiring')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 ${activeFilter === 'expiring' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Expiring (&lt;7 Days) <span className="bg-white/20 px-1.5 rounded text-xs">{expiringStores}</span></button>
          </div>
          <div className="flex gap-3">
            <button onClick={exportToCSV} className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-green-100 flex items-center gap-2 cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export CSV
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="bg-black text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-gray-800 flex items-center gap-2 cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Provision Store
            </button>
          </div>
        </div>

        {/* MERCHANT DIRECTORY TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Directory Data</h2>
            <div className="relative w-full sm:w-80">
              <svg width="18" height="18" className="absolute left-3 top-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search by name or slug..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border-2 border-gray-200 pl-10 pr-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-black w-full bg-white transition-colors" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="p-5 font-black">Business</th>
                  <th className="p-5 font-black">Contact Info</th>
                  <th className="p-5 font-black">Status & Plan</th>
                  <th className="p-5 font-black">Time Left</th>
                  <th className="p-5 font-black text-right">Administrative Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMerchants.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-bold">No merchants found matching your filters.</td></tr>
                ) : filteredMerchants.map(m => {
                  // Calculate days left for the new column
                  let daysLeft = null;
                  if (m.subscription_end_date) {
                    daysLeft = Math.ceil((new Date(m.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                      
                      {/* Business Column */}
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          {m.logo_url ? (
                            <img src={m.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover border" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center font-black text-gray-500">{m.business_name.charAt(0)}</div>
                          )}
                          <div>
                            <p className="font-black text-gray-900 text-base">{m.business_name}</p>
                            <a href={`https://crudhub.com.ng/${m.slug}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                              /{m.slug} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Contact Column */}
                      <td className="p-5">
                        <p className="text-sm font-bold text-gray-800">{m.phone_number || 'No Phone'}</p>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">{m.contact_email || 'No Email Linked'}</p>
                      </td>

                      {/* Status Column */}
                      <td className="p-5">
                        <div className="flex flex-col items-start gap-1.5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-black ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {m.status || 'active'}
                          </span>
                          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded capitalize">
                            {m.subscription_plan || 'Trial'} Plan
                          </span>
                        </div>
                      </td>

                      {/* NEW: Time Left Column */}
                      <td className="p-5">
                        {daysLeft === null ? (
                          <span className="text-xs font-bold text-gray-400">N/A</span>
                        ) : daysLeft < 0 ? (
                          <span className="text-xs font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">Expired</span>
                        ) : daysLeft <= 7 ? (
                          <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100">{daysLeft} Days</span>
                        ) : (
                          <span className="text-xs font-black text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-100">{daysLeft} Days</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="p-5">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleGodModeAccess(m.slug)} className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors cursor-pointer shadow-sm flex items-center gap-1" title="Login as Merchant">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                            Override
                          </button>
                          <button onClick={() => openSubModal(m)} className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
                            Billing
                          </button>
                          <button onClick={() => setMessagingMerchant(m)} className="bg-white border border-gray-300 text-blue-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer shadow-sm">
                            DM
                          </button>
                          <div className="w-px h-6 bg-gray-200 mx-1 self-center hidden sm:block"></div>
                          <button onClick={() => handleToggleStatus(m.id, m.status || 'active')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm border ${m.status === 'suspended' ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'}`}>
                            {m.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </button>
                          <button onClick={() => handleDeleteMerchant(m.id, m.business_name)} className="bg-white border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer shadow-sm" title="Delete Store">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
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
      
      {/* MODAL: DIRECT MESSAGE */}
      {messagingMerchant && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black tracking-tight text-gray-900">Message {messagingMerchant.business_name}</h3>
              <button onClick={() => setMessagingMerchant(null)} className="text-gray-400 hover:text-gray-900 cursor-pointer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form onSubmit={handleSendDirectMessage}>
              <label className="block text-sm font-bold text-gray-700 mb-2">Direct Notification</label>
              <textarea required rows="4" placeholder="This message will appear as a banner in their dashboard..." className="w-full border-2 border-gray-200 p-4 rounded-xl mb-6 outline-none focus:border-blue-600 font-medium resize-none text-sm" value={directMessageText} onChange={e=>setDirectMessageText(e.target.value)}/>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={()=>setMessagingMerchant(null)} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSendingDM} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black hover:bg-blue-700 disabled:bg-gray-400 shadow-md cursor-pointer transition-colors">
                  {isSendingDM ? 'Sending...' : 'Send Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBSCRIPTION MANAGEMENT */}
      {subMerchant && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black tracking-tight text-gray-900">Manage Billing: {subMerchant.business_name}</h3>
              <button onClick={() => setSubMerchant(null)} className="text-gray-400 hover:text-gray-900 cursor-pointer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form onSubmit={handleSaveSubscription} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Active Plan</label>
                <select value={selectedPlan} onChange={e=>setSelectedPlan(e.target.value)} className="w-full border-2 border-gray-200 p-3.5 rounded-xl font-bold text-sm outline-none focus:border-purple-600 cursor-pointer transition-colors">
                  <option value="trial">Free Trial</option>
                  <option value="monthly">Monthly Premium</option>
                  <option value="yearly">Yearly Enterprise</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Subscription End Date</label>
                <input type="date" value={selectedEndDate} onChange={e=>setSelectedEndDate(e.target.value)} className="w-full border-2 border-gray-200 p-3.5 rounded-xl font-bold text-sm outline-none focus:border-purple-600 transition-colors cursor-pointer"/>
                
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => addDaysToSelection(30)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer">+ 1 Month</button>
                  <button type="button" onClick={() => addDaysToSelection(365)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer">+ 1 Year</button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={()=>setSubMerchant(null)} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isUpdatingSub} className="bg-purple-600 text-white px-8 py-3 rounded-xl font-black hover:bg-purple-700 disabled:bg-gray-400 shadow-md cursor-pointer transition-colors">
                  {isUpdatingSub ? 'Updating...' : 'Save Billing Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROVISION NEW STORE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slide-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                <h3 className="text-xl font-black tracking-tight text-gray-900">Provision Store</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-900 cursor-pointer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            
            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Business Name</label>
                <input required type="text" placeholder="e.g. Olamide's Bakery" className="w-full border-2 border-gray-200 p-3.5 rounded-xl font-bold text-sm outline-none focus:border-black transition-colors" value={newStoreForm.businessName} onChange={e => setNewStoreForm({...newStoreForm, businessName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Store URL Slug</label>
                <div className="flex items-center">
                  <span className="bg-gray-100 border-2 border-r-0 border-gray-200 p-3.5 rounded-l-xl text-gray-500 font-bold text-sm">crudhub.com.ng/</span>
                  <input required type="text" placeholder="olamides-bakery" className="w-full border-2 border-gray-200 p-3.5 rounded-r-xl font-bold text-sm outline-none focus:border-black transition-colors" value={newStoreForm.slug} onChange={e => setNewStoreForm({...newStoreForm, slug: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Merchant Email</label>
                  <input required type="email" placeholder="merchant@email.com" className="w-full border-2 border-gray-200 p-3.5 rounded-xl font-bold text-sm outline-none focus:border-black transition-colors" value={newStoreForm.adminEmail} onChange={e => setNewStoreForm({...newStoreForm, adminEmail: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Initial Password</label>
                  <input required type="text" minLength="6" placeholder="SecurePass123" className="w-full border-2 border-gray-200 p-3.5 rounded-xl font-mono text-sm outline-none focus:border-black transition-colors" value={newStoreForm.password} onChange={e => setNewStoreForm({...newStoreForm, password: e.target.value})} />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg mt-4 text-xs font-bold text-gray-500">
                <span className="text-black">Note:</span> This will instantly generate a live store and initiate a 14-day free trial limit.
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={()=>setIsCreateModalOpen(false)} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isCreating} className="bg-black text-white px-8 py-3 rounded-xl font-black hover:bg-gray-800 disabled:bg-gray-400 shadow-md cursor-pointer transition-colors">
                  {isCreating ? 'Provisioning...' : 'Create Live Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.2s ease-out forwards; }`}} />
    </div>
  )
}