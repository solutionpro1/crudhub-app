import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useParams } from 'react-router-dom'

export default function MerchantPortal() {
  const { storeSlug } = useParams()
  const [merchant, setMerchant] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders') // Default to orders tab now!
  
  const [pinInput, setPinInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')

  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' })
  const [productImageFile, setProductImageFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    async function fetchMerchant() {
      const { data } = await supabase.from('merchants').select('*').eq('slug', storeSlug).single()
      setMerchant(data)
      setLoading(false)
    }
    fetchMerchant()
  }, [storeSlug])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false })
    setProducts(data || [])
  }

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false })
    setOrders(data || [])
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (merchant && pinInput === merchant.pin_code) {
      setIsAuthenticated(true)
      fetchProducts()
      fetchOrders()
    } else { setAuthError('Incorrect PIN code') }
  }

  async function uploadFile(file, pathPrefix) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop()
    const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('crudhub-images').upload(fileName, file)
    if (error) { alert('Upload failed: ' + error.message); return null; }
    const { data } = await supabase.storage.from('crudhub-images').getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setIsUploading(true)
    let logo_url = merchant.logo_url
    if (logoFile) {
      const uploadedUrl = await uploadFile(logoFile, `logos/${merchant.slug}`)
      if (uploadedUrl) logo_url = uploadedUrl
    }

    const { error } = await supabase.from('merchants').update({
      business_name: merchant.business_name,
      theme_color: merchant.theme_color,
      about_text: merchant.about_text,
      contact_phone: merchant.contact_phone,
      contact_email: merchant.contact_email,
      location: merchant.location,
      facebook_url: merchant.facebook_url,
      instagram_url: merchant.instagram_url,
      tiktok_url: merchant.tiktok_url,
      youtube_url: merchant.youtube_url,
      x_url: merchant.x_url,
      linkedin_url: merchant.linkedin_url,
      logo_url: logo_url
    }).eq('id', merchant.id)

    if (!error) {
      alert('Store profile updated successfully!')
      setLogoFile(null)
    } else { alert('Error updating profile: ' + error.message) }
    setIsUploading(false)
  }

  async function handleAddProduct(e) {
    e.preventDefault()
    setIsUploading(true)
    let image_url = null
    if (productImageFile) { image_url = await uploadFile(productImageFile, `products/${merchant.slug}`) }
    const { error } = await supabase.from('products').insert([{ ...newProduct, merchant_id: merchant.id, image_url: image_url, in_stock: true }])
    if (!error) {
      fetchProducts()
      setNewProduct({ name: '', description: '', price: '', category: '' })
      setProductImageFile(null)
      document.getElementById('product-image').value = ''
    } else { alert('Error: ' + error.message) }
    setIsUploading(false)
  }

  async function handleDeleteProduct(id) {
    if (window.confirm('Delete this item?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProducts()
    }
  }

  async function handleToggleStock(id, currentStatus) {
    await supabase.from('products').update({ in_stock: !currentStatus }).eq('id', id)
    fetchProducts()
  }

  async function handleUpdateOrderStatus(orderId, newStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) fetchOrders()
    else alert('Error updating order: ' + error.message)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">Loading portal...</div>
  if (!merchant) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Store not found!</div>

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-xl shadow-md p-8 border border-gray-100 text-center">
          {merchant.logo_url && <img src={merchant.logo_url} alt="Logo" className="h-16 w-16 mx-auto rounded-full object-cover mb-4 border shadow-sm" />}
          <h1 className="text-xl font-bold mb-2">{merchant.business_name}</h1>
          <p className="text-gray-500 text-sm mb-6">Enter your 4-digit manager PIN</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" maxLength="4" required className="w-full text-center text-2xl tracking-widest border p-3 rounded-lg focus:ring-2 outline-none" placeholder="••••" value={pinInput} onChange={e => setPinInput(e.target.value)} />
            {authError && <p className="text-red-500 text-sm font-bold">{authError}</p>}
            <button type="submit" className="w-full text-white font-bold py-3 rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: merchant.theme_color || '#000000' }}>Access Portal</button>
          </form>
        </div>
      </div>
    )
  }

  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <header className="text-white p-6 shadow-md" style={{ backgroundColor: merchant.theme_color || '#000000' }}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {merchant.logo_url && <img src={merchant.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-white bg-white" />}
            <h1 className="text-xl font-bold">Manager: {merchant.business_name}</h1>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="bg-white/20 px-4 py-2 rounded-full font-semibold text-sm hover:bg-white/30">Logout</button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-4xl mx-auto px-6 mt-6 overflow-x-auto">
        <div className="flex border-b border-gray-200 gap-6 whitespace-nowrap min-w-max">
          <button onClick={() => setActiveTab('orders')} className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            Incoming Orders
            {pendingOrdersCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingOrdersCount}</span>}
          </button>
          <button onClick={() => setActiveTab('menu')} className={`pb-3 font-bold border-b-2 transition-colors ${activeTab === 'menu' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            Manage Menu / Products
          </button>
          <button onClick={() => setActiveTab('profile')} className={`pb-3 font-bold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            Store Profile, About & Socials
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        
        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Order Management</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border text-gray-500 shadow-sm">No orders have been placed yet.</div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{order.customer_name}</h3>
                        <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                          order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                        <select 
                          value={order.status} 
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="border border-gray-300 rounded text-sm p-1.5 font-semibold text-gray-700 bg-white"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="p-4 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-2">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Delivery Details</h4>
                        <p className="text-gray-800 text-sm whitespace-pre-wrap"><span className="font-semibold">Address:</span> {order.customer_address}</p>
                        {order.customer_notes && <p className="text-gray-800 text-sm"><span className="font-semibold">Notes:</span> {order.customer_notes}</p>}
                      </div>
                      <div className="flex-1 space-y-2">
                         <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Order Items</h4>
                         <ul className="text-sm space-y-1">
                           {order.items.map((item, i) => (
                             <li key={i} className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                               <span>{item.name}</span>
                               <span className="font-medium text-gray-600">₦{Number(item.price).toLocaleString()}</span>
                             </li>
                           ))}
                         </ul>
                         <div className="flex justify-between pt-2 font-bold text-gray-900">
                           <span>Total:</span>
                           <span className="text-green-700">₦{Number(order.total_amount).toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Item</h2>
            <form onSubmit={handleAddProduct} className="flex flex-col gap-4 mb-8 bg-gray-50 p-4 rounded border">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input required placeholder="Item Name" className="border p-2 rounded bg-white" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <input required type="number" placeholder="Price (₦)" className="border p-2 rounded bg-white" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                <input required placeholder="Category (e.g. Services, Drinks)" className="border p-2 rounded bg-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
              </div>
              <textarea placeholder="Short Description" className="border p-2 rounded w-full bg-white" rows="2" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}></textarea>
              <div className="flex gap-3 items-center">
                <input id="product-image" type="file" accept="image/*" onChange={e => setProductImageFile(e.target.files[0])} className="border p-2 rounded flex-1 text-sm bg-white" />
                <button type="submit" disabled={isUploading} className="text-white px-6 py-2 rounded font-bold disabled:opacity-50" style={{ backgroundColor: merchant.theme_color || '#000000' }}>
                  {isUploading ? 'Uploading...' : '+ Add Item'}
                </button>
              </div>
            </form>

            <h2 className="text-xl font-bold text-gray-800 mb-4">Current Catalog</h2>
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className={`flex justify-between items-center p-3 border rounded ${p.in_stock !== false ? 'bg-gray-50' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-4">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className={`w-16 h-16 object-cover rounded border ${p.in_stock === false && 'grayscale opacity-50'}`} /> : <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No Img</div>}
                    <div>
                      <h4 className={`font-bold ${p.in_stock !== false ? 'text-gray-900' : 'text-gray-500 line-through'}`}>{p.name}</h4>
                      <p className={`text-sm font-bold ${p.in_stock !== false ? 'text-green-700' : 'text-gray-400'}`}>₦{p.price}</p>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded mt-1 inline-block">{p.category}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleStock(p.id, p.in_stock !== false)} className={`px-4 py-2 rounded text-sm font-bold ${p.in_stock !== false ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                      {p.in_stock !== false ? 'Mark Sold Out' : 'Mark In Stock'}
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-100 text-red-600 px-4 py-2 rounded text-sm font-bold hover:bg-red-200">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Store Branding & Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Business Name</label>
                  <input required className="w-full border p-2 rounded" value={merchant.business_name || ''} onChange={e => setMerchant({...merchant, business_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Theme Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" className="w-12 h-10 rounded cursor-pointer border p-1" value={merchant.theme_color || '#000000'} onChange={e => setMerchant({...merchant, theme_color: e.target.value})} />
                    <span className="text-sm font-mono text-gray-500">{merchant.theme_color || '#000000'}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Business Logo</label>
                {merchant.logo_url && <img src={merchant.logo_url} alt="Logo preview" className="w-16 h-16 rounded-full object-cover border mb-2 shadow-sm" />}
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} className="w-full border p-2 rounded text-sm bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">About Us Description</label>
                <textarea rows="3" className="w-full border p-2 rounded" placeholder="Tell your customers what your business is about..." value={merchant.about_text || ''} onChange={e => setMerchant({...merchant, about_text: e.target.value})}></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Contact Phone</label>
                  <input className="w-full border p-2 rounded" placeholder="08012345678" value={merchant.contact_phone || ''} onChange={e => setMerchant({...merchant, contact_phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Contact Email</label>
                  <input className="w-full border p-2 rounded" placeholder="business@email.com" value={merchant.contact_email || ''} onChange={e => setMerchant({...merchant, contact_email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location / Address</label>
                  <input className="w-full border p-2 rounded" placeholder="Lagos, Nigeria" value={merchant.location || ''} onChange={e => setMerchant({...merchant, location: e.target.value})} />
                </div>
              </div>

              <hr className="my-6 border-gray-100" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Social Media Links</h3>
              <p className="text-xs text-gray-500 mb-4">Leave empty any social network you don't use. It will automatically hide on your store.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Facebook URL</label><input className="w-full border p-2 rounded text-sm" placeholder="https://facebook.com/..." value={merchant.facebook_url || ''} onChange={e => setMerchant({...merchant, facebook_url: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Instagram URL</label><input className="w-full border p-2 rounded text-sm" placeholder="https://instagram.com/..." value={merchant.instagram_url || ''} onChange={e => setMerchant({...merchant, instagram_url: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">TikTok URL</label><input className="w-full border p-2 rounded text-sm" placeholder="https://tiktok.com/..." value={merchant.tiktok_url || ''} onChange={e => setMerchant({...merchant, tiktok_url: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">YouTube URL</label><input className="w-full border p-2 rounded text-sm" placeholder="https://youtube.com/..." value={merchant.youtube_url || ''} onChange={e => setMerchant({...merchant, youtube_url: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">X (Twitter) URL</label><input className="w-full border p-2 rounded text-sm" placeholder="https://x.com/..." value={merchant.x_url || ''} onChange={e => setMerchant({...merchant, x_url: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">LinkedIn URL</label><input className="w-full border p-2 rounded text-sm" placeholder="https://linkedin.com/..." value={merchant.linkedin_url || ''} onChange={e => setMerchant({...merchant, linkedin_url: e.target.value})} /></div>
              </div>

              <button type="submit" disabled={isUploading} className="w-full bg-black text-white py-3 rounded-lg font-bold mt-6 hover:bg-gray-800 transition-colors disabled:bg-gray-400">
                {isUploading ? 'Saving Profile...' : 'Save All Profile Changes'}
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  )
}
