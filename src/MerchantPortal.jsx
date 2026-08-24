import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useParams } from 'react-router-dom'

export default function MerchantPortal() {
  const { storeSlug } = useParams()
  const [merchant, setMerchant] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [pinInput, setPinInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')

  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' })
  const [productImageFile, setProductImageFile] = useState(null)
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

  const handleLogin = (e) => {
    e.preventDefault()
    if (merchant && pinInput === merchant.pin_code) {
      setIsAuthenticated(true)
      fetchProducts()
    } else { setAuthError('Incorrect PIN code') }
  }

  async function uploadFile(file, pathPrefix) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop()
    const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('crudhub-images').upload(fileName, file)
    if (error) { alert('Upload failed: ' + error.message); return null; }
    const { data } = supabase.storage.from('crudhub-images').getPublicUrl(fileName)
    return data.publicUrl
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
    if (window.confirm('Are you sure you want to delete this item?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProducts()
    }
  }

  // NEW: Toggle Stock Status
  async function handleToggleStock(id, currentStatus) {
    await supabase.from('products').update({ in_stock: !currentStatus }).eq('id', id)
    fetchProducts()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">Loading portal...</div>
  if (!merchant) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Store not found!</div>

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-xl shadow-md p-8 border border-gray-100 text-center">
          {merchant.logo_url && <img src={merchant.logo_url} alt="Logo" className="h-16 w-16 mx-auto rounded-full object-cover mb-4 border" />}
          <h1 className="text-xl font-bold mb-2">{merchant.business_name}</h1>
          <p className="text-gray-500 text-sm mb-6">Enter your 4-digit manager PIN</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" maxLength="4" required className="w-full text-center text-2xl tracking-widest border p-3 rounded-lg focus:ring-2 outline-none" placeholder="••••" value={pinInput} onChange={e => setPinInput(e.target.value)} />
            {authError && <p className="text-red-500 text-sm font-bold">{authError}</p>}
            <button type="submit" className="w-full text-white font-bold py-3 rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: merchant.theme_color || '#000000' }}>Access Menu</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <header className="text-white p-6 shadow-md" style={{ backgroundColor: merchant.theme_color || '#000000' }}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Manager: {merchant.business_name}</h1>
          <button onClick={() => setIsAuthenticated(false)} className="bg-white/20 px-4 py-2 rounded-full font-semibold text-sm hover:bg-white/30">Logout</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Item</h2>
          <form onSubmit={handleAddProduct} className="flex flex-col gap-4 mb-8 bg-gray-50 p-4 rounded border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input required placeholder="Item Name" className="border p-2 rounded" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <input required type="number" placeholder="Price (₦)" className="border p-2 rounded" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <input required placeholder="Category (e.g. Mains)" className="border p-2 rounded" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
            </div>
            <textarea placeholder="Short Description" className="border p-2 rounded w-full" rows="2" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}></textarea>
            <div className="flex gap-3 items-center">
              <input id="product-image" type="file" accept="image/*" onChange={e => setProductImageFile(e.target.files[0])} className="border p-2 rounded flex-1 text-sm bg-white" />
              <button type="submit" disabled={isUploading} className="text-white px-6 py-2 rounded font-bold disabled:opacity-50" style={{ backgroundColor: merchant.theme_color || '#000000' }}>
                {isUploading ? 'Uploading...' : '+ Add Item'}
              </button>
            </div>
          </form>

          <h2 className="text-xl font-bold text-gray-800 mb-4">Current Menu</h2>
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
      </main>
    </div>
  )
}
