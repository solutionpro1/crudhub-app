import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function SuperAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMerchant, setNewMerchant] = useState({ business_name: '', slug: '', pin_code: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 🔒 THIS IS YOUR MASTER PLATFORM PASSWORD
  const MASTER_PIN = '9999' 

  useEffect(() => {
    if (isAuthenticated) fetchMerchants()
  }, [isAuthenticated])

  async function fetchMerchants() {
    setLoading(true)
    const { data } = await supabase.from('merchants').select('*').order('created_at', { ascending: false })
    setMerchants(data || [])
    setLoading(false)
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (pinInput === MASTER_PIN) setIsAuthenticated(true)
    else alert('Access Denied: Incorrect Master PIN')
  }

  const handleCreateMerchant = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Auto-format the URL slug (e.g., "My Store" becomes "my-store")
    const finalSlug = (newMerchant.slug || newMerchant.business_name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')

    const { error } = await supabase.from('merchants').insert([{
      business_name: newMerchant.business_name,
      slug: finalSlug,
      pin_code: newMerchant.pin_code,
      theme_color: '#000000'
    }])

    if (error) {
      alert('Error creating merchant: ' + error.message)
    } else {
      setNewMerchant({ business_name: '', slug: '', pin_code: '' })
      fetchMerchants()
      alert('Merchant created successfully!')
    }
    setIsSubmitting(false)
  }

  const handleDeleteMerchant = async (id, name) => {
    if (window.confirm(`Are you absolutely sure you want to delete ${name}? This removes all their products too.`)) {
      await supabase.from('merchants').delete().eq('id', id)
      fetchMerchants()
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">CH</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Platform Admin</h1>
          <p className="text-gray-500 mb-6 text-sm">Enter Master PIN to access the platform</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" required className="w-full text-center text-2xl tracking-widest border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none" placeholder="••••" value={pinInput} onChange={e => setPinInput(e.target.value)} />
            <button type="submit" className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors">Login</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-black text-white p-6 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2"><span className="bg-white text-black px-2 py-1 rounded text-sm">CH</span> Crudhub Owner Portal</h1>
          <button onClick={() => setIsAuthenticated(false)} className="bg-gray-800 px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-700 transition-colors">Lock Portal</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 mt-4">
        
        {/* Onboard New Merchant Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4 border-b pb-2 text-gray-800">🚀 Onboard New Merchant</h2>
          <form onSubmit={handleCreateMerchant} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Business Name</label>
              <input required className="w-full border p-2.5 rounded-lg bg-gray-50" placeholder="e.g. Adekeye Tech" value={newMerchant.business_name} onChange={e => setNewMerchant({...newMerchant, business_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">URL Slug</label>
              <input required className="w-full border p-2.5 rounded-lg bg-gray-50" placeholder="e.g. adekeye-tech" value={newMerchant.slug} onChange={e => setNewMerchant({...newMerchant, slug: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Manager PIN</label>
              <input required type="text" maxLength="4" className="w-full border p-2.5 rounded-lg bg-gray-50" placeholder="e.g. 1234" value={newMerchant.pin_code} onChange={e => setNewMerchant({...newMerchant, pin_code: e.target.value})} />
            </div>
            <button type="submit" disabled={isSubmitting} className="bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors h-[46px]">
              {isSubmitting ? 'Creating...' : '+ Create Store'}
            </button>
          </form>
        </section>

        {/* Active Merchants List */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4 border-b pb-2 text-gray-800">📊 Active Stores on Crudhub ({merchants.length})</h2>
          {loading ? <p className="text-gray-500">Loading your platform data...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm">
                    <th className="p-3 border-b font-bold rounded-tl-lg">Business</th>
                    <th className="p-3 border-b font-bold">Public Link</th>
                    <th className="p-3 border-b font-bold text-center">PIN</th>
                    <th className="p-3 border-b font-bold">Created On</th>
                    <th className="p-3 border-b font-bold text-right rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors border-b last:border-0">
                      <td className="p-3 font-semibold flex items-center gap-3">
                        {m.logo_url ? <img src={m.logo_url} className="w-10 h-10 rounded-full object-cover border shadow-sm" alt="logo" /> : <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">{m.business_name?.charAt(0)}</div>}
                        {m.business_name}
                      </td>
                      <td className="p-3">
                        <a href={`/${m.slug}`} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline">/{m.slug}</a>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-gray-100 text-gray-700 font-mono font-bold px-2 py-1 rounded text-sm">{m.pin_code}</span>
                      </td>
                      <td className="p-3 text-sm text-gray-500">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <a href={`/${m.slug}/manage`} target="_blank" rel="noreferrer" className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg mr-2 hover:bg-gray-700 font-bold">Portal</a>
                        <button onClick={() => handleDeleteMerchant(m.id, m.business_name)} className="text-sm bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 font-bold">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {merchants.length === 0 && <p className="text-center text-gray-500 mt-6 pb-4">No merchants registered yet. Create one above!</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
