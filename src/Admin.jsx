import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Admin() {
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)

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

  async function handleExtendSubscription(id, currentEndDate) {
    const currentDate = currentEndDate ? new Date(currentEndDate) : new Date()
    currentDate.setDate(currentDate.getDate() + 30) // Extend by 30 days
    
    const { error } = await supabase.from('merchants').update({ subscription_end_date: currentDate.toISOString() }).eq('id', id)
    if (!error) {
      setMerchants(merchants.map(m => m.id === id ? { ...m, subscription_end_date: currentDate.toISOString() } : m))
      alert('Subscription extended by 30 days successfully!')
    } else {
      alert('Failed to extend subscription: ' + error.message)
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

  // God-Mode Metrics Calculations
  const totalStores = merchants.length
  const activeStores = merchants.filter(m => m.status === 'active').length
  const suspendedStores = merchants.filter(m => m.status === 'suspended').length
  
  // Estimate platform revenue based on active subscriptions (Assuming ₦1,400 monthly baseline per active store)
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
        
        {/* GOD-MODE METRICS GRID */}
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

        {/* BROADCAST SYSTEM */}
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
            <button 
              type="submit" 
              disabled={isBroadcasting} 
              className="bg-black text-white px-6 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400 shrink-0 shadow-sm"
            >
              {isBroadcasting ? 'Broadcasting...' : 'Send to All Merchants'}
            </button>
          </form>
        </div>

        {/* MERCHANT MANAGEMENT TABLE */}
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
                  <th className="p-4 font-bold">Store Slug</th>
                  <th className="p-4 font-bold">WhatsApp / Phone</th>
                  <th className="p-4 font-bold">Subscription Expires</th>
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
                        <a href={`/${m.slug}`} target="_blank" rel="noreferrer" className="hover:underline text-blue-600">{m.slug}</a>
                      </td>
                      <td className="p-4 text-sm text-gray-600 font-medium">{m.phone_number}</td>
                      <td className="p-4 text-sm font-medium">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isExp ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                          {m.subscription_end_date ? new Date(m.subscription_end_date).toLocaleDateString() : 'Lifetime'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {m.status || 'active'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => handleExtendSubscription(m.id, m.subscription_end_date)}
                          className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-200 transition-colors"
                        >
                          +30 Days
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(m.id, m.status || 'active')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${m.status === 'suspended' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                        >
                          {m.status === 'suspended' ? 'Activate' : 'Suspend'}
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
    </div>
  )
}