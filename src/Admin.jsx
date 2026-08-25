import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Admin() {
  const [session, setSession] = useState(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  const [merchants, setMerchants] = useState([])
  const [products, setProducts] = useState([])
  const [activeView, setActiveView] = useState('list')
  const [selectedMerchant, setSelectedMerchant] = useState(null)

  const [newMerchant, setNewMerchant] = useState({ business_name: '', slug: '', phone_number: '', pin_code: '1234' })
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' })

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

  useEffect(() => { if (session) fetchMerchants() }, [session])

  async function fetchMerchants() {
    const { data } = await supabase.from('merchants').select('*').order('created_at', { ascending: false })
    setMerchants(data || [])
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
    const { error } = await supabase.from('merchants').insert([{
      ...newMerchant,
      theme_color: '#000000'
    }])
    if (!error) {
      alert('Client created successfully!')
      fetchMerchants()
      setActiveView('list')
      setNewMerchant({ business_name: '', slug: '', phone_number: '', pin_code: '1234' })
    } else { alert('Error: ' + error.message) }
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
      theme_color: selectedMerchant.theme_color,
      logo_url: logo_url,
      pin_code: selectedMerchant.pin_code
    }).eq('id', selectedMerchant.id)
    
    if (!error) {
      alert('Brand settings & PIN updated!')
      setSelectedMerchant({...selectedMerchant, logo_url})
      setLogoFile(null)
      fetchMerchants()
    } else { alert('Error: ' + error.message) }
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
      setNewProduct({ name: '', description: '', price: '', category: '' })
      setProductImageFile(null)
      document.getElementById('product-image').value = '';
    } else { alert('Error: ' + error.message) }
    setIsUploading(false)
  }

  async function handleDeleteProduct(id) {
    await supabase.from('products').delete().eq('id', id)
    fetchProducts(selectedMerchant.id)
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
    <div className="p-8 bg-gray-100 min-h-screen font-sans pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Crudhub Super Admin</h1>
          <div className="flex gap-4">
            {activeView !== 'list' && <button onClick={() => setActiveView('list')} className="bg-gray-300 px-4 py-2 rounded font-bold hover:bg-gray-400 text-sm">&larr; Back</button>}
            <button onClick={handleLogout} className="bg-red-100 text-red-600 px-4 py-2 rounded font-bold hover:bg-red-200 text-sm border border-red-200">Logout</button>
          </div>
        </div>

        {activeView === 'list' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Your Active Clients</h2>
              <button onClick={() => setActiveView('add')} className="bg-black text-white px-4 py-2 rounded-lg font-medium">+ Create New Client Space</button>
            </div>
            <div className="grid gap-4">
              {merchants.map(m => (
                <div key={m.id} className="border border-gray-100 p-5 rounded-lg flex justify-between items-center bg-gray-50">
                  <div className="flex items-center gap-4">
                    {m.logo_url && <img src={m.logo_url} alt="Logo" className="h-10 w-10 rounded-full object-cover border shadow-sm" />}
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{m.business_name}</h3>
                      <p className="text-sm text-gray-500 font-medium">crudhub.app/{m.slug}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedMerchant(m); fetchProducts(m.id); setActiveView('manage'); }} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium shadow-sm hover:bg-blue-700">Manage Menu & Style</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'add' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 max-w-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Register a New Client</h2>
            <form onSubmit={handleCreateMerchant} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold mb-1">Business Name</label><input required className="w-full border p-2 rounded" placeholder="e.g. Emily's Parfume" value={newMerchant.business_name} onChange={e => setNewMerchant({...newMerchant, business_name: e.target.value})} /></div>
                <div><label className="block text-sm font-bold mb-1">URL Slug</label><input required className="w-full border p-2 rounded" placeholder="e.g. emilys-parfume" value={newMerchant.slug} onChange={e => setNewMerchant({...newMerchant, slug: e.target.value.toLowerCase()})} /></div>
                <div><label className="block text-sm font-bold mb-1">WhatsApp Number</label><input required type="tel" className="w-full border p-2 rounded" placeholder="2348012345678" value={newMerchant.phone_number} onChange={e => setNewMerchant({...newMerchant, phone_number: e.target.value})} /></div>
                <div><label className="block text-sm font-bold mb-1">Manager PIN</label><input required maxLength="4" className="w-full border p-2 rounded" placeholder="1234" value={newMerchant.pin_code} onChange={e => setNewMerchant({...newMerchant, pin_code: e.target.value})} /></div>
              </div>
              <button type="submit" className="bg-green-600 text-white px-4 py-3 mt-2 rounded font-bold w-full">Create Space</button>
            </form>
          </div>
        )}

        {activeView === 'manage' && selectedMerchant && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 h-fit">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Brand Settings</h2>
              <form onSubmit={handleUpdateBrand} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Theme Color</label>
                  <input type="color" value={selectedMerchant.theme_color || '#000000'} onChange={e => setSelectedMerchant({...selectedMerchant, theme_color: e.target.value})} className="w-full h-12 rounded cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Manager PIN</label>
                  <input required maxLength="4" className="w-full border p-2 rounded bg-gray-50" value={selectedMerchant.pin_code || ''} onChange={e => setSelectedMerchant({...selectedMerchant, pin_code: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Business Logo</label>
                  {selectedMerchant.logo_url && <img src={selectedMerchant.logo_url} alt="Logo" className="h-16 mb-2 rounded border object-contain" />}
                  <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} className="w-full border p-2 rounded text-sm bg-gray-50" />
                </div>
                <button type="submit" disabled={isUploading} className="bg-black text-white px-4 py-2 rounded font-bold w-full disabled:bg-gray-400">
                  {isUploading ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Manage Catalog</h2>
              <form onSubmit={handleAddProduct} className="flex flex-col gap-3 mb-6 bg-gray-50 p-4 rounded border">
                <div className="flex gap-2">
                  <input required placeholder="Item Name" className="border p-2 rounded flex-1" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  <input required type="number" placeholder="Price (₦)" className="border p-2 rounded w-24" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  <input required placeholder="Category" className="border p-2 rounded w-1/4" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                </div>
                <div className="flex gap-2 items-center">
                  <input id="product-image" type="file" accept="image/*" onChange={e => setProductImageFile(e.target.files[0])} className="border p-1.5 rounded flex-1 text-sm bg-white" />
                  <button type="submit" disabled={isUploading} className="bg-green-600 text-white px-6 py-2 rounded font-bold disabled:bg-gray-400">
                    {isUploading ? 'Adding...' : '+ Add Item'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                    <div className="flex items-center gap-4">
                      {p.image_url ? <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover rounded border shadow-sm" /> : <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 font-bold border">No Img</div>}
                      <div>
                        <h4 className="font-bold">{p.name}</h4>
                        <p className="text-sm text-green-700 font-bold">₦{p.price}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 font-bold hover:underline text-sm">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
