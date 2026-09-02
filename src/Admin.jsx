import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')

  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  const navigate = useNavigate()

  const [messagingMerchant, setMessagingMerchant] = useState(null)
  const [directMessageText, setDirectMessageText] = useState('')
  const [isSendingDM, setIsSendingDM] = useState(false)

  const [subMerchant, setSubMerchant] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [selectedEndDate, setSelectedEndDate] = useState('')
  const [isUpdatingSub, setIsUpdatingSub] = useState(false)

  useEffect(() => { 
    if (sessionStorage.getItem('crudhub_superadmin') === 'true') {
      setIsAdminAuthenticated(true)
      fetchAllMerchants() 
    } else {
      setLoading(false)
    }
  }, [])

  function handleAdminLogin(e) {
    e.preventDefault()
    // HARDCODED ADMIN CREDENTIALS
    if (adminEmail === 'realsolutionpro@outlook.com' && adminPassword === 'admin2026') {
      sessionStorage.setItem('crudhub_superadmin', 'true')
      setIsAdminAuthenticated(true)
      setLoading(true)
      fetchAllMerchants()
    } else {
      setAdminError('Invalid Super Admin credentials.')
    }
  }

  function handleAdminLogout() {
    sessionStorage.removeItem('crudhub_superadmin')
    setIsAdminAuthenticated(false)
    setAdminEmail('')
    setAdminPassword('')
  }

  async function fetchAllMerchants() {
    const { data, error } = await supabase.from('merchants').select('*').order('created_at', { ascending: false })
    if (error) alert('Error fetching merchants: ' + error.message)
    else setMerchants(data || [])
    setLoading(false)
  }

  async function handleToggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    const { error } = await supabase.from('merchants').update({ status: newStatus }).eq('id', id)
    if (!error) setMerchants(merchants.map(m => m.id === id ? { ...m, status: newStatus } : m))
    else alert('Failed to update status: ' + error.message)
  }

  async function handleDeleteMerchant(id, businessName) {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete "${businessName}"?`)) return
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
    if (!error) { alert('Broadcast sent!'); setBroadcastMessage('') }
    else alert('Error: ' + error.message)
    setIsBroadcasting(false)
  }

  async function handleSendDirectMessage(e) {
    e.preventDefault()
    if (!directMessageText.trim() || !messagingMerchant) return
    setIsSendingDM(true)
    const { error } = await supabase.from('merchants').update({ admin_message: directMessageText }).eq('id', messagingMerchant.id)
    if (!error) { alert(`Message sent!`); setMessagingMerchant(null); setDirectMessageText('') }
    else alert('Error: ' + error.message)
    setIsSendingDM(false)
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
      alert('Subscription updated!'); setSubMerchant(null)
    } else alert('Error: ' + error.message)
    setIsUpdatingSub(false)
  }

  function handleGodModeAccess(slug) {
    sessionStorage.setItem('crudhub_god_mode', 'true')
    navigate(`/${slug}/manage`)
  }

  // STRICT SECURITY GATE: If not authenticated, return ONLY the login screen.
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="flex justify-center mb-6"><span className="bg-black text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">God-Mode</span></div>
          <h2 className="text-2xl font-black text-center text-gray-900 mb-2">Super Admin Login</h2>
          <p className="text-center text-gray-500 text-sm font-medium mb-8">Restricted access. Authorized personnel only.</p>
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-1.5 text-gray-700">Admin Email</label>
              <input required type="email" className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5 text-gray-700">Password</label>
              <input required type="password" className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
            </div>
            {adminError && <p className="text-red-600 text-sm font-bold text-center">{adminError}</p>}
            <button type="submit" className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors shadow-md">Authenticate</button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Loading...</div>

  const totalStores = merchants.length
  const activeStores = merchants.filter(m => m.status === 'active').length
  const suspendedStores = merchants.filter(m => m.status === 'suspended').length
  const estimatedRevenue = activeStores * 1400
  const filteredMerchants = merchants.filter(m => m.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || m.slug.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      <div className="bg-black text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-white text-black px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">God-Mode</span>
            <h1 className="text-xl font-black">SolutionPRO Super Admin</h1>
          </div>
          <button onClick={handleAdminLogout} className="text-gray-400 hover:text-white font-bold text-sm bg-gray-900 px-4 py-2 rounded-lg border border-gray-800 transition-colors cursor-pointer">Log Out</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Platform Value</p><h3 className="text-3xl font-black text-gray-900">₦{estimatedRevenue.toLocaleString()}</h3><p className="text-xs text-green-600 font-bold mt-2">Estimated MRR</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Stores</p><h3 className="text-3xl font-black text-gray-900">{totalStores}</h3><p className="text-xs text-gray-500 font-bold mt-2">Registered on platform</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Active Stores</p><h3 className="text-3xl font-black text-green-600">{activeStores}</h3><p className="text-xs text-green-600 font-bold mt-2">Fully operational</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Suspended Stores</p><h3 className="text-3xl font-black text-red-600">{suspendedStores}</h3><p className="text-xs text-red-600 font-bold mt-2">Access revoked</p></div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Broadcast Notification to All Merchants</h2>
          <form onSubmit={handleSendBroadcast} className="flex gap-4">
            <input type="text" placeholder="Type your platform announcement here..." value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} className="flex-1 border border-gray-300 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-black font-medium text-sm" />
            <button type="submit" disabled={isBroadcasting} className="bg-black text-white px-6 py-3.5 rounded-xl font-bold hover:bg-gray-800 disabled:bg-gray-400 shrink-0">Send</button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800">Merchant Directory</h2>
            <input type="text" placeholder="Search by business name or slug..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border border-gray-300 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black w-full sm:w-72 bg-white" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b"><th className="p-4 font-bold">Business Name</th><th className="p-4 font-bold">Store Link</th><th className="p-4 font-bold">WhatsApp / Email</th><th className="p-4 font-bold">Status</th><th className="p-4 font-bold text-right">God-Mode Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMerchants.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{m.business_name}</td>
                    <td className="p-4 text-sm font-mono text-gray-600"><a href={`/${m.slug}`} target="_blank" rel="noreferrer" className="hover:underline font-bold text-blue-600 flex items-center gap-1">{m.slug}</a></td>
                    <td className="p-4 text-sm text-gray-600 font-medium"><div>{m.phone_number}</div><div className="text-xs text-gray-400">{m.contact_email || 'No email'}</div></td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{m.status || 'active'}</span></td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => handleGodModeAccess(m.slug)} className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer">Admin Dashboard</button>
                      <button onClick={() => openSubModal(m)} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer">Manage Sub</button>
                      <button onClick={() => setMessagingMerchant(m)} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer">Message</button>
                      <button onClick={() => handleToggleStatus(m.id, m.status || 'active')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${m.status === 'suspended' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{m.status === 'suspended' ? 'Activate' : 'Suspend'}</button>
                      <button onClick={() => handleDeleteMerchant(m.id, m.business_name)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Modals are kept hidden here for brevity but operate the exact same way */}
      {messagingMerchant && (<div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"><h3 className="text-xl font-bold mb-4">Message {messagingMerchant.business_name}</h3><form onSubmit={handleSendDirectMessage}><textarea required rows="4" className="w-full border p-3 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-black" value={directMessageText} onChange={e=>setDirectMessageText(e.target.value)}/><div className="flex justify-end gap-3"><button type="button" onClick={()=>setMessagingMerchant(null)} className="px-4 py-2 font-bold text-sm">Cancel</button><button type="submit" className="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm">Send</button></div></form></div></div>)}
      {subMerchant && (<div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"><h3 className="text-xl font-bold mb-4">Manage Subscription</h3><form onSubmit={handleSaveSubscription}><select value={selectedPlan} onChange={e=>setSelectedPlan(e.target.value)} className="w-full border p-3 rounded-xl mb-4 font-bold text-sm"><option value="trial">Trial</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select><input type="date" value={selectedEndDate} onChange={e=>setSelectedEndDate(e.target.value)} className="w-full border p-3 rounded-xl mb-6 font-bold text-sm"/><div className="flex justify-end gap-3"><button type="button" onClick={()=>setSubMerchant(null)} className="px-4 py-2 font-bold text-sm">Cancel</button><button type="submit" className="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm">Save</button></div></form></div></div>)}
    </div>
  )
}