import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function Storefront() {
  const { storeSlug } = useParams()
  const [merchant, setMerchant] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customer, setCustomer] = useState({ name: '', address: '', notes: '' })

  useEffect(() => { fetchStoreData() }, [storeSlug])

  async function fetchStoreData() {
    const { data: merchantData, error: merchantError } = await supabase.from('merchants').select('*').eq('slug', storeSlug).single()
    if (merchantError || !merchantData) { setLoading(false); return; }
    setMerchant(merchantData)
    const { data: productData } = await supabase.from('products').select('*').eq('merchant_id', merchantData.id)
    setProducts(productData || [])
    setLoading(false)
  }

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  function updateQuantity(productId, delta) {
    setCart(prev => prev.map(item => {
      if (item.id === productId) { const newQ = item.quantity + delta; return newQ > 0 ? { ...item, quantity: newQ } : item; }
      return item
    }))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  async function handleCheckout(e) {
    e.preventDefault(); setIsSubmitting(true);
    const { error } = await supabase.from('orders').insert([{ merchant_id: merchant.id, customer_name: customer.name, customer_address: customer.address, customer_notes: customer.notes, items: cart, total_amount: cartTotal, status: 'Pending' }])
    if (error) { alert('Error placing order. Please try again.'); setIsSubmitting(false); return; }

    let orderText = `*New Order from ${customer.name}!* \n\n*Delivery Address:* ${customer.address}\n\n*Items Ordered:*\n`
    cart.forEach(item => { orderText += `- ${item.quantity}x ${item.name} (₦${(item.price * item.quantity).toLocaleString()})\n` })
    orderText += `\n*Total Amount:* ₦${cartTotal.toLocaleString()}\n`
    if (customer.notes) orderText += `\n*Customer Note:* ${customer.notes}`

    const cleanPhone = merchant.phone_number.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderText)}`

    setCart([]); setIsCheckoutOpen(false); setIsSubmitting(false);
    window.open(whatsappUrl, '_blank')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Loading Store...</div>
  if (!merchant) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-red-600">Store Not Found</div>

  const themeColor = merchant.theme_color || '#000000'
  const hasSocials = merchant.instagram_url || merchant.tiktok_url || merchant.facebook_url || merchant.x_url
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]
  
  const displayedProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans flex flex-col">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          {merchant.logo_url ? <img src={merchant.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover border" /> : <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: themeColor }}>{merchant.business_name.charAt(0)}</div>}
          <div><h1 className="text-xl font-bold text-gray-900">{merchant.business_name}</h1><p className="text-sm text-gray-500">Order directly via WhatsApp</p></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input type="text" placeholder="Search the menu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-10 pr-4 outline-none focus:ring-2 transition-shadow shadow-sm font-medium" style={{ '--tw-ring-color': themeColor }} />
        </div>

        {categories.length > 2 && (
          <div className="flex overflow-x-auto gap-3 pb-6 mb-2 hide-scrollbar">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat ? 'text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`} style={selectedCategory === cat ? { backgroundColor: themeColor } : {}}>{cat}</button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {displayedProducts.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover" /> : <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 font-medium">No Image</div>}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{product.category}</span>
                <p className="font-black text-lg mt-auto mb-4" style={{ color: themeColor }}>₦{Number(product.price).toLocaleString()}</p>
                <button onClick={() => addToCart(product)} className="w-full py-2.5 rounded-lg font-bold text-white transition-opacity hover:opacity-90 active:scale-95" style={{ backgroundColor: themeColor }}>Add to Cart</button>
              </div>
            </div>
          ))}
          {displayedProducts.length === 0 && <div className="col-span-full text-center py-12 text-gray-500 font-medium">{searchQuery ? `No items found matching "${searchQuery}".` : "No products available."}</div>}
        </div>
      </main>

      {hasSocials && (
        <footer className="w-full bg-white border-t border-gray-200 mt-8 py-10">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h3 className="text-gray-900 font-bold mb-6 text-lg">Connect with {merchant.business_name}</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {merchant.instagram_url && <a href={merchant.instagram_url} target="_blank" rel="noreferrer" className="bg-gray-50 text-gray-700 hover:text-black border border-gray-200 hover:border-black px-6 py-3 rounded-full font-bold transition-colors text-sm shadow-sm">Instagram</a>}
              {merchant.tiktok_url && <a href={merchant.tiktok_url} target="_blank" rel="noreferrer" className="bg-gray-50 text-gray-700 hover:text-black border border-gray-200 hover:border-black px-6 py-3 rounded-full font-bold transition-colors text-sm shadow-sm">TikTok</a>}
              {merchant.facebook_url && <a href={merchant.facebook_url} target="_blank" rel="noreferrer" className="bg-gray-50 text-gray-700 hover:text-blue-600 border border-gray-200 hover:border-blue-600 px-6 py-3 rounded-full font-bold transition-colors text-sm shadow-sm">Facebook</a>}
              {merchant.x_url && <a href={merchant.x_url} target="_blank" rel="noreferrer" className="bg-gray-50 text-gray-700 hover:text-black border border-gray-200 hover:border-black px-6 py-3 rounded-full font-bold transition-colors text-sm shadow-sm">X (Twitter)</a>}
            </div>
          </div>
        </footer>
      )}

      {cartCount > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center pointer-events-none">
          <button onClick={() => setIsCheckoutOpen(true)} className="w-full max-w-md bg-black text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-2xl flex justify-between items-center transform transition-transform hover:scale-[1.02] active:scale-95 pointer-events-auto">
            <span className="bg-white text-black px-3 py-1 rounded-lg text-sm">{cartCount} items</span><span>View Cart</span><span>₦{cartTotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full overflow-y-auto flex flex-col animate-slide-in">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-500 font-bold hover:text-black p-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="p-4 flex-1">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center mb-4 pb-4 border-b">
                  <div className="flex-1 pr-4"><h4 className="font-bold text-gray-800">{item.name}</h4><p className="text-sm text-gray-500">₦{Number(item.price).toLocaleString()} each</p></div>
                  <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1"><button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg bg-white rounded shadow-sm">-</button><span className="font-bold w-4 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg bg-white rounded shadow-sm">+</button></div>
                </div>
              ))}
              <div className="mt-6">
                <h3 className="font-bold text-lg mb-4">Delivery Details</h3>
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label><input required className="w-full border p-3 rounded-xl focus:ring-2 outline-none bg-gray-50 focus:bg-white transition-colors" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Jane Doe" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Delivery Address</label><textarea required className="w-full border p-3 rounded-xl focus:ring-2 outline-none bg-gray-50 focus:bg-white transition-colors h-20 resize-none" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="123 Main Street..." /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Order Notes (Optional)</label><input className="w-full border p-3 rounded-xl focus:ring-2 outline-none bg-gray-50 focus:bg-white transition-colors" value={customer.notes} onChange={e => setCustomer({...customer, notes: e.target.value})} placeholder="Extra spicy, please!" /></div>
                </form>
              </div>
            </div>
            <div className="p-4 border-t bg-white sticky bottom-0">
              <div className="flex justify-between items-center mb-4 text-lg"><span className="font-bold text-gray-600">Total to Pay</span><span className="font-black text-2xl text-gray-900">₦{cartTotal.toLocaleString()}</span></div>
              <button form="checkout-form" type="submit" disabled={isSubmitting} className="w-full text-white px-6 py-4 rounded-xl font-bold text-lg shadow-md transition-opacity hover:opacity-90 disabled:bg-gray-400 flex justify-center items-center gap-2" style={{ backgroundColor: themeColor }}>
                {isSubmitting ? 'Processing...' : <><span className="flex items-center gap-2">Place Order via WhatsApp <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span></>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } } .animate-slide-in { animation: slide-in 0.3s ease-out forwards; } .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </div>
  )
}
