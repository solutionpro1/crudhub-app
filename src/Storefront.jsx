import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useParams } from 'react-router-dom'

export default function Storefront() {
  const { storeSlug } = useParams() 
  const [merchant, setMerchant] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({ name: '', address: '', notes: '' })
  const [activeCategory, setActiveCategory] = useState('All')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)

  useEffect(() => {
    async function fetchStoreData() {
      try {
        const { data: merchantData, error: merchantError } = await supabase.from('merchants').select('*').eq('slug', storeSlug).single()
        if (merchantError) throw merchantError
        setMerchant(merchantData)

        if (merchantData) {
          const { data: productsData, error: productsError } = await supabase.from('products').select('*').eq('merchant_id', merchantData.id).order('created_at', { ascending: false })
          if (productsError) throw productsError
          setProducts(productsData)
        }
      } catch (error) {
        console.error("Error fetching data:", error.message)
      } finally { setLoading(false) }
    }
    fetchStoreData()
  }, [storeSlug])

  const handleAddToCart = (product) => setCart((prevCart) => [...prevCart, product])
  const removeFromCart = (indexToRemove) => {
    setCart((prevCart) => prevCart.filter((_, index) => index !== indexToRemove))
    if (cart.length <= 1) setIsCheckingOut(false)
  }
  const cartTotal = cart.reduce((total, item) => total + Number(item.price), 0)

  const handleSendOrder = async (e) => {
    e.preventDefault()
    setIsSubmittingOrder(true)

    // 1. Save the order to Supabase
    const { error } = await supabase.from('orders').insert([{
      merchant_id: merchant.id,
      customer_name: customerInfo.name,
      customer_address: customerInfo.address,
      customer_notes: customerInfo.notes,
      items: cart,
      total_amount: cartTotal,
      status: 'Pending'
    }])

    if (error) {
      alert('There was an issue processing your order. Please try again.')
      setIsSubmittingOrder(false)
      return
    }

    // 2. Build and send the WhatsApp Message
    let orderText = `*New Order from ${customerInfo.name}* 🛒\n\n`
    orderText += `*Delivery Details:*\n📍 Address: ${customerInfo.address}\n📝 Notes: ${customerInfo.notes || 'None'}\n\n`
    orderText += `*Order Items:*\n`
    cart.forEach((item, index) => { orderText += `${index + 1}. ${item.name} - ₦${item.price.toLocaleString()}\n` })
    orderText += `\n*Total: ₦${cartTotal.toLocaleString()}*\n\n_Powered by Crudhub_`

    const encodedMessage = encodeURIComponent(orderText)
    let phone = (merchant.contact_phone || merchant.phone_number || '').replace(/\D/g, '')
    if (!phone.startsWith('234')) phone = '234' + (phone.startsWith('0') ? phone.slice(1) : phone)
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank')

    // 3. Clear the cart and close checkout
    setCart([])
    setIsCheckingOut(false)
    setIsCartOpen(false)
    setCustomerInfo({ name: '', address: '', notes: '' })
    setIsSubmittingOrder(false)
  }

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]
  const filteredProducts = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory)

  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl font-semibold bg-gray-50">Loading Store...</div>
  if (!merchant) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2 className="text-3xl text-red-500 font-bold mb-2">Store not found!</h2>
        <p className="text-gray-500">No client exists at /{storeSlug}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24 overflow-x-hidden">
      <header className="text-white p-6 shadow-md sticky top-0 z-10 transition-colors" style={{ backgroundColor: merchant.theme_color || '#000000' }}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {merchant.logo_url ? (
              <img src={merchant.logo_url} alt={merchant.business_name} className="h-12 w-12 rounded-full object-cover border-2 border-white/80 shadow-md bg-white" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl border border-white/30">
                {merchant.business_name?.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{merchant.business_name}</h1>
              {merchant.location && <p className="text-xs text-white/80 font-medium">📍 {merchant.location}</p>}
            </div>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="bg-white text-black px-4 py-2 rounded-full font-bold shadow-sm transition-transform hover:scale-105 text-sm flex items-center gap-2">
            🛒 Cart <span className="bg-black text-white px-2 py-0.5 rounded-full text-xs">{cart.length}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
        
        {merchant.about_text && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">About Us</h3>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base whitespace-pre-line">{merchant.about_text}</p>
          </section>
        )}

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Our Catalog</h2>
          </div>

          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
              {categories.map((cat, index) => (
                <button
                  key={index}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                    activeCategory === cat 
                      ? 'text-white shadow-sm' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  style={activeCategory === cat ? { backgroundColor: merchant.theme_color || '#000000', borderColor: merchant.theme_color || '#000000' } : {}}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 ? (
             <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
               <p>No items found in this category.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product, index) => (
                <div key={product.id + index} className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow ${product.in_stock === false && 'opacity-60'}`}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className={`w-full h-48 object-cover bg-gray-100 ${product.in_stock === false && 'grayscale'}`} />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 font-medium text-xs">No Image Available</div>
                  )}
                  <div className="p-5 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">{product.name}</h3>
                        <span className="font-bold text-green-700 whitespace-nowrap">₦{product.price.toLocaleString()}</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded mb-4 font-medium">{product.category}</span>
                    </div>
                    
                    <button 
                      disabled={product.in_stock === false}
                      onClick={() => handleAddToCart(product)} 
                      className="w-full py-2.5 rounded-lg text-white font-bold shadow-sm active:scale-95 transition-opacity disabled:bg-gray-400 disabled:cursor-not-allowed mt-auto text-sm" 
                      style={{ backgroundColor: product.in_stock !== false ? (merchant.theme_color || '#000000') : undefined }}
                    >
                      {product.in_stock !== false ? 'Add to Cart' : 'Sold Out'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Contact Us</h3>
            <div className="space-y-1 text-sm text-gray-600">
              {merchant.contact_phone && <p>📞 Phone: <a href={`tel:${merchant.contact_phone}`} className="text-blue-600 hover:underline font-medium">{merchant.contact_phone}</a></p>}
              {merchant.contact_email && <p>✉️ Email: <a href={`mailto:${merchant.contact_email}`} className="text-blue-600 hover:underline font-medium">{merchant.contact_email}</a></p>}
              {merchant.location && <p>📍 Address: {merchant.location}</p>}
              {!merchant.contact_phone && !merchant.contact_email && !merchant.location && <p className="text-gray-400 italic">No contact details provided.</p>}
            </div>
          </div>

          {(merchant.facebook_url || merchant.instagram_url || merchant.tiktok_url || merchant.youtube_url || merchant.x_url || merchant.linkedin_url) && (
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-3">Connect With Us</h4>
              <div className="flex flex-wrap gap-2">
                {merchant.facebook_url && <a href={merchant.facebook_url} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90">Facebook</a>}
                {merchant.instagram_url && <a href={merchant.instagram_url} target="_blank" rel="noreferrer" className="bg-pink-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90">Instagram</a>}
                {merchant.tiktok_url && <a href={merchant.tiktok_url} target="_blank" rel="noreferrer" className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90">TikTok</a>}
                {merchant.youtube_url && <a href={merchant.youtube_url} target="_blank" rel="noreferrer" className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90">YouTube</a>}
                {merchant.x_url && <a href={merchant.x_url} target="_blank" rel="noreferrer" className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90">X</a>}
                {merchant.linkedin_url && <a href={merchant.linkedin_url} target="_blank" rel="noreferrer" className="bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90">LinkedIn</a>}
              </div>
            </div>
          )}
        </section>
      </main>

      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isCartOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsCartOpen(false)}></div>
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{isCheckingOut ? 'Checkout Details' : 'Your Cart'}</h2>
          <button onClick={() => { setIsCartOpen(false); setIsCheckingOut(false); }} className="text-gray-500 hover:text-gray-800 text-2xl leading-none font-bold p-2">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-4xl mb-2">🛒</span><p>Your cart is empty.</p>
            </div>
          ) : !isCheckingOut ? (
            <ul className="space-y-4">
              {cart.map((item, index) => (
                <li key={index} className="flex justify-between items-center border-b border-gray-50 pb-4">
                  <div className="flex items-center gap-3">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded object-cover border" />}
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                      <p className="text-green-700 font-bold text-sm mt-1">₦{item.price.toLocaleString()}</p>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(index)} className="text-red-500 text-sm font-medium hover:underline ml-4">Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <form id="checkout-form" onSubmit={handleSendOrder} className="space-y-4">
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label><input required className="w-full border p-2 rounded bg-gray-50 focus:bg-white" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Delivery Address</label><textarea required className="w-full border p-2 rounded bg-gray-50 focus:bg-white" rows="3" value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}></textarea></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Order Notes (Optional)</label><input className="w-full border p-2 rounded bg-gray-50 focus:bg-white" placeholder="e.g. Please call upon arrival" value={customerInfo.notes} onChange={e => setCustomerInfo({...customerInfo, notes: e.target.value})} /></div>
            </form>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600 font-medium">Total</span><span className="text-xl font-bold text-gray-900">₦{cartTotal.toLocaleString()}</span>
          </div>
          {!isCheckingOut ? (
            <button disabled={cart.length === 0} onClick={() => setIsCheckingOut(true)} className={`w-full py-3 rounded-lg text-white font-bold text-lg shadow-sm transition-opacity ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'}`} style={{ backgroundColor: merchant.theme_color || '#000000' }}>
              Proceed to Checkout
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsCheckingOut(false)} className="w-1/3 py-3 rounded-lg bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 transition-colors">Back</button>
              <button type="submit" form="checkout-form" disabled={isSubmittingOrder} className="w-2/3 py-3 rounded-lg text-white font-bold text-lg shadow-sm hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400" style={{ backgroundColor: isSubmittingOrder ? undefined : (merchant.theme_color || '#000000') }}>
                <span>{isSubmittingOrder ? 'Processing...' : 'Send to WhatsApp'}</span> 📱
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
