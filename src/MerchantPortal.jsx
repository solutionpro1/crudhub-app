import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function MerchantPortal() {
  const { storeSlug } = useParams()
  const [merchant, setMerchant] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState('')

  // Dashboard State
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  
  // Settings State
  const [editMerchant, setEditMerchant] = useState({})
  const [logoFile, setLogoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  // Catalog State
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' })
  const [productImageFile, setProductImageFile] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [isProductUploading, setIsProductUploading] = useState(false)

  useEffect(() => {
    fetchMerchantDetails()
  }, [storeSlug])

  async function fetchMerchantDetails() {
    const { data, error } = await supabase.from('merchants').select('*').eq('slug', storeSlug).single()
    if (error || !data) {
      alert('Store not found!')
    } else {
      setMerchant(data)
      setEditMerchant(data)
    }
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (pinInput === merchant.pin_code) {
      setIsAuthenticated(true)
      fetchOrders(merchant.id)
      fetchProducts(merchant.id)
    } else {
      setAuthError('Incorrect PIN code. Please try again.')
    }
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
    else alert('Failed to update status: ' + error.message)
  }

  async function uploadFile(file, pathPrefix) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('crudhub-images').upload(fileName, file);
    if (error) { alert('Upload failed: ' + error.message); return null; }
    const { data } = supabase.storage.from('crudhub-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleUpdateSettings(e) {
    e.preventDefault()
    setIsUploading(true)
    let logo_url = editMerchant.logo_url
    if (logoFile) {
      const uploadedUrl = await uploadFile(logoFile, `logos/${editMerchant.slug}`)
      if (uploadedUrl) logo_url = uploadedUrl
    }
    const { error } = await supabase.from('merchants').update({ 
      theme_color: editMerchant.theme_color, logo_url: logo_url, pin_code: editMerchant.pin_code,
      facebook_url: editMerchant.facebook_url, instagram_url: editMerchant.instagram_url,
      tiktok_url: editMerchant.tiktok_url, x_url: editMerchant.x_url
    }).eq('id', merchant.id)
    
    if (!error) {
      alert('Store settings updated successfully!')
      setMerchant({...editMerchant, logo_url})
      setLogoFile(null)
    } else alert('Error: ' + error.message) 
    setIsUploading(false)
  }

  // --- CATALOG CRUD FUNCTIONS ---
  async function handleSaveProduct(e) {
    e.preventDefault()
    setIsProductUploading(true)
    
    // Default to the old image if we are editing and didn't select a new one
    let image_url = editingProductId ? products.find(p => p.id === editingProductId)?.image_url : null

    if (productImageFile) {
      const uploadedUrl = await uploadFile(productImageFile, `products/${merchant.slug}`)
      if (uploadedUrl) image_url = uploadedUrl
    }

    if (editingProductId) {
      // UPDATE EXISTING PRODUCT
      const { error } = await supabase.from('products').update({
        ...newProduct, image_url: image_url
      }).eq('id', editingProductId)
      if (error) alert('Error updating item: ' + error.message)
    } else {
      // ADD NEW PRODUCT
      const { error } = await supabase.from('products').insert([{
        ...newProduct, merchant_id: merchant.id, image_url: image_url
      }])
      if (error) alert('Error adding item: ' + error.message)
    }

    // Reset Form
    fetchProducts(merchant.id)
    setNewProduct({ name: '', description: '', price: '', category: '' })
    setProductImageFile(null)
    setEditingProductId(null)
    const fileInput = document.getElementById('product-image')
    if(fileInput) fileInput.value = ''
    setIsProductUploading(false)
  }

  async function handleDeleteProduct(id) {
    if(window.confirm('Are you sure you want to delete this item?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProducts(merchant.id)
    }
  }

  function handleEditClick(product) {
    setEditingProductId(product.id)
    setNewProduct({
      name: product.name, description: product.description || '', 
      price: product.price, category: product.category
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingProductId(null)
    setNewProduct({ name: '', description: '', price: '', category: '' })
    setProductImageFile(null)
    const fileInput = document.getElementById('product-image')
    if(fileInput) fileInput.value = ''
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Loading space...</div>
  if (!merchant) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-red-600">Store not found.</div>

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          {merchant.logo_url ? (
            <img src={merchant.logo_url} alt="Logo" className="w-24 h-24 mx-auto rounded-full object-cover border-4 mb-4 shadow-sm" style={{ borderColor: merchant.theme_color || '#000' }} />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-sm" style={{ backgroundColor: merchant.theme_color || '#000' }}>
              {merchant.business_name.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{merchant.business_name}</h1>
          <p className="text-gray-500 mb-6 font-medium">Enter your 4-digit Manager PIN to access your workspace.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" maxLength="4" required className="w-full text-center text-3xl tracking-[1em] font-mono border-2 p-4 rounded-xl outline-none focus:border-black transition-colors" value={pinInput} onChange={e => { setPinInput(e.target.value); setAuthError(''); }} />
            {authError && <p className="text-red-500 text-sm font-bold">{authError}</p>}
            <button type="submit" className="w-full text-white font-bold py-4 rounded-xl text-lg shadow-sm transition-transform active:scale-95" style={{ backgroundColor: merchant.theme_color || '#000' }}>Unlock Portal</button>
          </form>
        </div>
      </div>
    )
  }

  const storeUrl = `https://crudhub-app.vercel.app/${merchant.slug}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(storeUrl)}`

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {merchant.logo_url && <img src={merchant.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border" />}
            <h1 className="text-xl font-black text-gray-900">{merchant.business_name} Workspace</h1>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="text-gray-500 hover:text-red-600 font-bold text-sm bg-gray-50 px-4 py-2 rounded-lg border hover:bg-red-50 transition-colors">Lock Portal</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        <div className="space-y-2">
          <button onClick={() => setActiveTab('orders')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'orders' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}>🛍️ Order History</button>
          <button onClick={() => setActiveTab('qr')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'qr' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}>📲 Store QR Code</button>
          <button onClick={() => setActiveTab('catalog')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'catalog' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}>📦 My Catalog</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-colors ${activeTab === 'settings' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}>⚙️ Store Settings</button>
        </div>

        <div className="md:col-span-3">
          
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50"><h2 className="text-xl font-bold text-gray-800">Recent Orders</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b"><th className="p-4 font-bold">Date</th><th className="p-4 font-bold">Customer</th><th className="p-4 font-bold">Total</th><th className="p-4 font-bold">Status</th><th className="p-4 font-bold">Action</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm font-medium text-gray-600">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="p-4"><p className="font-bold text-gray-900">{order.customer_name}</p><p className="text-xs text-gray-500">{order.customer_address}</p></td>
                        <td className="p-4 font-bold text-green-700">₦{Number(order.total_amount).toLocaleString()}</td>
                        <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span></td>
                        <td className="p-4">
                          <select className="border border-gray-300 rounded-lg text-sm p-1.5 outline-none focus:ring-2 focus:ring-black font-medium cursor-pointer" value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                            <option value="Pending">Pending</option><option value="Processing">Processing</option><option value="Completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <div className="p-12 text-center text-gray-400 font-medium text-lg">No orders yet. Keep pushing your link!</div>}
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-lg mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Store QR Code</h2>
              <p className="text-gray-500 mb-8 font-medium">Print this and place it on your tables or counter. Customers can scan it to order directly from their phones!</p>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 inline-block mb-6 shadow-inner"><img src={qrCodeUrl} alt="Store QR Code" className="w-64 h-64 mx-auto rounded-lg" /></div>
              <div className="flex gap-4 justify-center">
                <a href={qrCodeUrl} download="Store_QRCode.png" target="_blank" rel="noreferrer" className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2">⬇️ Download QR</a>
                <a href={storeUrl} target="_blank" rel="noreferrer" className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors">Visit Store</a>
              </div>
            </div>
          )}

          {/* FULL EDIT/DELETE CATALOG TAB */}
          {activeTab === 'catalog' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
               <h2 className="text-xl font-bold text-gray-800 mb-6">Manage Your Menu</h2>
               
               {/* Add/Edit Form */}
               <form onSubmit={handleSaveProduct} className="mb-8 bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-inner">
                 <h3 className="font-bold text-gray-900 mb-4">{editingProductId ? '✏️ Edit Product' : '➕ Add New Product'}</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label><input required className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (₦)</label><input required type="number" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} /></div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category (e.g. Mains, Drinks)</label><input required className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} /></div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Image (Optional)</label><input id="product-image" type="file" accept="image/*" onChange={e => setProductImageFile(e.target.files[0])} className="w-full border p-2 rounded-lg text-sm bg-white" /></div>
                 </div>
                 <div className="flex gap-3">
                   <button type="submit" disabled={isProductUploading} className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400">
                     {isProductUploading ? 'Saving...' : (editingProductId ? 'Update Item' : 'Add Item')}
                   </button>
                   {editingProductId && (
                     <button type="button" onClick={cancelEdit} className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors">
                       Cancel
                     </button>
                   )}
                 </div>
               </form>

               {/* Product List with Edit/Delete */}
               <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                 {products.map(p => (
                   <div key={p.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white transition-colors gap-4">
                     <div className="flex items-center gap-4">
                       {p.image_url ? <img src={p.image_url} alt={p.name} className="w-16 h-16 object-cover rounded-lg shadow-sm border bg-white" /> : <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 border">No Img</div>}
                       <div>
                         <h4 className="font-bold text-gray-900 text-lg leading-tight">{p.name}</h4>
                         <p className="text-green-700 font-bold mb-1">₦{Number(p.price).toLocaleString()}</p>
                         <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">{p.category}</span>
                       </div>
                     </div>
                     <div className="flex gap-2 sm:flex-col sm:items-end">
                        <button onClick={() => handleEditClick(p)} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 border border-blue-200 transition-colors flex-1 sm:flex-none text-center">Edit</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 border border-red-200 transition-colors flex-1 sm:flex-none text-center">Delete</button>
                     </div>
                   </div>
                 ))}
                 {products.length === 0 && <p className="text-center text-gray-400 font-medium py-10">Your menu is empty. Add your first item above!</p>}
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-2xl">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Store Settings</h2>
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Brand Identity</h3>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Theme Color</label><input type="color" value={editMerchant.theme_color || '#000000'} onChange={e => setEditMerchant({...editMerchant, theme_color: e.target.value})} className="w-full h-12 rounded cursor-pointer border p-1" /></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Business Logo</label>{editMerchant.logo_url && <img src={editMerchant.logo_url} alt="Logo" className="h-16 mb-2 rounded-lg border object-contain bg-white p-1" />}<input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} className="w-full border p-2 rounded-lg text-sm bg-white" /></div>
                </div>
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Social Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Instagram URL</label><input placeholder="https://instagram.com/..." className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.instagram_url || ''} onChange={e => setEditMerchant({...editMerchant, instagram_url: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">TikTok URL</label><input placeholder="https://tiktok.com/@..." className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.tiktok_url || ''} onChange={e => setEditMerchant({...editMerchant, tiktok_url: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Facebook URL</label><input placeholder="https://facebook.com/..." className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.facebook_url || ''} onChange={e => setEditMerchant({...editMerchant, facebook_url: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700">X (Twitter) URL</label><input placeholder="https://x.com/..." className="w-full border p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.x_url || ''} onChange={e => setEditMerchant({...editMerchant, x_url: e.target.value})} /></div>
                  </div>
                </div>
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Security</h3>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700">Manager PIN</label><input required maxLength="4" type="password" placeholder="1234" className="w-full border p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none" value={editMerchant.pin_code || ''} onChange={e => setEditMerchant({...editMerchant, pin_code: e.target.value})} /><p className="text-xs text-gray-500 mt-1">If you change this, you will need to use the new PIN the next time you log in.</p></div>
                </div>
                <button type="submit" disabled={isUploading} className="bg-black text-white px-6 py-4 rounded-xl font-bold w-full text-lg shadow-md hover:bg-gray-800 transition-colors disabled:bg-gray-400">{isUploading ? 'Saving Settings...' : 'Save All Settings'}</button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
