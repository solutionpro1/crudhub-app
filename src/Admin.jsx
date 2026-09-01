import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
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

  useEffect(() => { fetchAllMerchants() }, [])

  async function fetchAllMerchants() {
    const { data, error } = await supabase.from('merchants').select('*').order('created_at', { ascending: false })
    if (error) alert('Error fetching merchants: ' + error.message)
    else setMerchants(data || [])
    setLoading(false)
  }

  async function handleToggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    const { error } = await supabase.from('merchants').update({ status: newStatus }).eq('id', id)
    if (!error) {
      setMerchants(merchants.map(m => m.id === id ? { ...m, status: newStatus } : m))
    } else {
      alert('Failed to update status: ' + error.message)
    }
  }

  async function handleDeleteMerchant(id, businessName) {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete "${businessName}"? This will erase all products, orders, and store data forever.`)) {
      return
    }

    const { error } = await supabase.from('merchants').delete().eq('id', id)
    if (!error) {
      setMerchants(merchants.filter(m => m.id !== id))
      alert('Merchant deleted successfully.')
    } else {
      alert('Failed to delete merchant: ' + error.message)
    }
  }

  async function handleSendBroadcast(e) {
    e.preventDefault()
    if (!broadcastMessage.trim()) return
    setIsBroadcasting(true)

    const { error } = await supabase.from('merchants').update({ admin_message: broadcastMessage }).not('id', 'is', null)
    
    if (!error) {
      alert('Broadcast message sent successfully to all active stores!')
      setBroadcastMessage('')
    } else {
      alert('Error broadcasting message: ' + error.message)
    }
    setIsBroadcasting(false)
  }

  async function handleSendDirectMessage(e) {
    e.preventDefault()
    if (!directMessageText.trim() || !messagingMerchant) return
    setIsSendingDM(true)

    const { error } = await supabase.from('merchants').update({ admin_message: directMessageText }).eq('id', messagingMerchant.id)
    
    if (!error) {
      alert(`Direct message sent to ${messagingMerchant.business_name}!`)
      setMessagingMerchant(null)
      setDirectMessageText('')
    } else {
      alert('Error sending message: ' + error.message)
    }
    setIsSendingDM(false)
  }

  // Safe Date Formatter helper (guarantees YYYY-MM-DD)
  function formatDateToInput(dateInput) {
    try {
      const d = dateInput ? new Date(dateInput) : new Date()
      if (isNaN(d.getTime())) {
        const fallback = new Date()
        fallback.setDate(fallback.getDate() + 30)
        return fallback.toISOString().split('T')[0]
      }
      return d.toISOString().split('T')[0]
    } catch (e) {
      const fallback = new Date()
      fallback.setDate(fallback.getDate() + 30)
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

    const { error } = await supabase.from('merchants').update({ 
      subscription_plan: selectedPlan,
      subscription_end_date: isoDate
    }).eq('id', subMerchant.id)

    if (!error) {
      setMerchants(merchants.map(m => m.id === subMerchant.id ? { ...m, subscription_plan: selectedPlan, subscription_end_date: isoDate } : m))
      alert('Subscription plan and countdown updated successfully!')
      setSubMerchant(null)
    } else {
      alert('Error updating subscription: ' + error.message)
    }
    setIsUpdatingSub(false)
  }

  function handleGodModeAccess(slug) {
    sessionStorage.setItem('crudhub_god_mode', 'true')
    navigate(`/${slug}/manage`)
  }

  const totalStores = merchants.length
  const activeStores = merchants.filter(m => m.status === 'active').length
  const suspendedStores = merchants.filter(m => m.status === 'suspended').length
  const estimatedRevenue = activeStores * 1400

  const filteredMerchants = merchants.filter(m => 
    m.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Loading God-Mode Dashboard...</div>

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      <div className="bg-black text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-white text-black px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">God-Mode</span>
            <h1 className="text-xl font-black">SolutionPRO Super Admin</h1>
          </div>
          <a href="/" className="text-gray-400 hover:text-white font-bold text-sm bg-gray-900 px-4 py-2 rounded-lg border border-gray-800 transition-colors">Log Out</a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Platform Value</p>
            <h3 className="text-3xl font-black text-gray-900">₦{estimatedRevenue.toLocaleString()}</h3>
            <p className="text-xs text-green-600 font-bold mt-2">Estimated MRR</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Stores</p>
            <h3 className="text-3xl font-black text-gray-900">{totalStores}</h3>
            <p className="text-xs text-gray-500 font-bold mt-2">Registered on platform</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Active Stores</p>
            <h3 className="text-3xl font-black text-green-600">{activeStores}</h3>
            <p className="text-xs text-green-600 font-bold mt-2">Fully operational</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Suspended Stores</p>
            <h3 className="text-3xl font-black text-red-600">{suspendedStores}</h3>
            <p className="text-xs text-red-600 font-bold mt-2">Access revoked</p>
          </div>
        </div>

        {/* BROADCAST */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Broadcast Notification to All Merchants</h2>
          <p className="text-sm text-gray-500 mb-4">Send an instant alert message directly to every merchant's notification inbox.</p>
          <form onSubmit={handleSendBroadcast} className="flex gap-4">
            <input 
              type="text" 
              placeholder="Type your platform announcement here..." 
              value={broadcastMessage} 
              onChange={e => setBroadcastMessage(e.target.value)} 
              className="flex-1 border border-gray-300 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-black font-medium text-sm"
            />
            <button type="submit" disabled={isBroadcasting} className="bg-black text-white px-6 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400 shrink-0 shadow-sm">
              {isBroadcasting ? 'Broadcasting...' : 'Send to All Merchants'}
            </button>
          </form>
        </div>

        {/* DIRECTORY */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800">Merchant Directory</h2>
            <input 
              type="text" 
              placeholder="Search by business name or slug..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="border border-gray-300 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black w-full sm:w-72 bg-white"
            />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="p-4 font-bold">Business Name</th>
                  <th className="p-4 font-bold">Store Link</th>
                  <th className="p-4 font-bold">WhatsApp / Phone</th>
                  <th className="p-4 font-bold">Subscription Plan & Countdown</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">God-Mode Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMerchants.map(m => {
                  const isExp = m.subscription_end_date && new Date(m.subscription_end_date) < new Date();
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gray-900">{m.business_name}</td>
                      <td className="p-4 text-sm font-mono text-gray-600">
                        <a href={`/${m.slug}`} target="_blank" rel="noreferrer" className="hover:underline font-bold text-blue-600 flex items-center gap-1">
                          {m.slug} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                      </td>
                      <td className="p-4 text-sm text-gray-600 font-medium">{m.phone_number}</td>
                      <td className="p-4 text-sm font-medium">
                        <div className="flex flex-col gap-1">
                          <span className="capitalize font-bold text-gray-800 text-xs bg-gray-100 px-2 py-0.5 rounded w-fit">{m.subscription_plan || 'trial'}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold w-fit ${isExp ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {m.subscription_end_date ? `Exp: ${new Date(m.subscription_end_date).toLocaleDateString()}` : 'Lifetime'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {m.status || 'active'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button 
                          type="button"
                          onClick={() => handleGodModeAccess(m.slug)}
                          className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
                        >
                          Admin Dashboard
                        </button>
                        <button 
                          type="button"
                          onClick={() => openSubModal(m)}
                          className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                        >
                          Manage Sub
                        </button>
                        <button 
                          type="button"
                          onClick={() => setMessagingMerchant(m)}
                          className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                        >
                          Message
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleToggleStatus(m.id, m.status || 'active')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${m.status === 'suspended' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
                        >
                          {m.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteMerchant(m.id, m.business_name)}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredMerchants.length === 0 && <div className="p-12 text-center text-gray-400 font-medium text-lg">No merchants found.</div>}
          </div>
        </div>

      </div>

      {/* DIRECT MESSAGE MODAL */}
      {messagingMerchant && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-slide-in">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Direct Message</h3>
            <p className="text-sm text-gray-500 mb-4">Send a private alert straight to <strong>{messagingMerchant.business_name}</strong>'s notification bell.</p>
            <form onSubmit={handleSendDirectMessage} className="space-y-4">
              <textarea 
                required 
                rows="4" 
                placeholder="Type private message..." 
                value={directMessageText} 
                onChange={e => setDirectMessageText(e.target.value)} 
                className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black text-sm font-medium"
              />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setMessagingMerchant(null)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm">Cancel</button>
                <button type="submit" disabled={isSendingDM} className="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm">{isSendingDM ? 'Sending...' : 'Send Message'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION & COUNTDOWN MODAL */}
      {subMerchant && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-slide-in">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Manage Subscription</h3>
                <p className="text-xs text-gray-500">Store: <strong>{subMerchant.business_name}</strong></p>
              </div>
              <button 
                type="button" 
                onClick={() => setSubMerchant(null)}
                className="text-gray-400 hover:text-black font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Subscription Plan</label>
                <select 
                  value={selectedPlan} 
                  onChange={e => setSelectedPlan(e.target.value)} 
                  className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-sm bg-white"
                >
                  <option value="trial">Trial (14 Days)</option>
                  <option value="monthly">Monthly (₦1,400)</option>
                  <option value="yearly">Yearly (₦13,440)</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Expiration Date</label>
                <input 
                  type="date" 
                  required 
                  value={selectedEndDate} 
                  onChange={e => setSelectedEndDate(e.target.value)} 
                  className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-sm bg-white"
                />
              </div>

              {/* Quick Add Buttons */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-1.5">Quick Extension</p>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => addDaysToSelection(30)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2 rounded-lg border border-gray-200"
                  >
                    +30 Days
                  </button>
                  <button 
                    type="button" 
                    onClick={() => addDaysToSelection(90)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2 rounded-lg border border-gray-200"
                  >
                    +3 Months
                  </button>
                  <button 
                    type="button" 
                    onClick={() => addDaysToSelection(365)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2 rounded-lg border border-gray-200"
                  >
                    +1 Year
                  </button>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setSubMerchant(null)} className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isUpdatingSub} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 disabled:bg-gray-400">{isUpdatingSub ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.2s ease-out forwards; }`}} />
    </div>
  )
}