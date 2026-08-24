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

  const handleSendOrder = (e) => {
    e.preventDefault()
    let orderText = `*New Order from ${customerInfo.name}* 🛒\n\n`
    orderText += `*Delivery Details:*\n📍 Address: ${customerInfo.address}\n📝 Notes: ${customerInfo.notes || 'None'}\n\n`
    orderText += `*Order Items:*\n`
    cart.forEach((item, index) => { orderText += `${index + 1}. ${item.name} - ₦${item.price.toLocaleString()}\n` })
    orderText += `\n*Total: ₦${cartTotal.toLocaleString()}*\n\n_Powered by Crudhub_`

    const encodedMessage = encodeURIComponent(orderText)
    let phone = merchant.phone_number.replace(/\D/g, '')
    if (!phone.startsWith('234')) phone = '234' + (phone.startsWith('0') ? phone.slice(1) : phone)
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl font-semibold">Loading Crudhub Store...</div>
  if (!merchant) return (
    <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-3xl text-red-500 font-bold mb-2">Store not found!</h2>
        <p className="text-gray-500">No client exists at /{storeSlug}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20 overflow-x-hidden">
      <header className="text-white p-6 shadow-md sticky top-0 z-10" style={{ backgroundColor: merchant.theme_color || '#000000' }}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {merchant.logo_url && <img src={merchant.logo_url} alt="Logo" className="h-12 w-12 rounded-full object-cover border-2 border-white/50 shadow-sm bg-white" />}
            <h1 className="text-2xl sm:text-3xl font-bold">{merchant.business_name}</h1>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="bg-white text-black px-4 py-2 rounded-full font-semibold shadow-sm transition-transform hover:scale-105">
            🛒 Cart ({cart.length})
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Our Catalog</h2>
        {products.length === 0 ? (
           <p className="text-gray-500">This client hasn't added any items yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <div key={product.id + index} className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow ${product.in_stock === false && 'opacity-60'}`}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className={`w-full h-48 object-cover bg-gray-100 ${product.in_stock === false && 'grayscale'}`} />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 font-medium">No Image</div>
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
                  
                  {/* NEW: Disabled button if sold out */}
                  <button 
                    disabled={product.in_stock === false}
                    onClick={() => handleAddToCart(product)} 
                    className="w-full py-2.5 rounded-lg text-white font-medium shadow-sm active:scale-95 transition-opacity disabled:bg-gray-400 disabled:cursor-not-allowed mt-auto" 
                    style={{ backgroundColor: product.in_stock !== false ? (merchant.theme_color || '#000000') : undefined }}
                  >
                    {product.in_stock !== false ? 'Add to Cart' : 'Sold Out'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Overlay & Panel */}
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
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Order Notes (Optional)</label><input className="w-full border p-2 rounded bg-gray-50 focus:bg-white" placeholder="e.g. Please make it extra spicy" value={customerInfo.notes} onChange={e => setCustomerInfo({...customerInfo, notes: e.target.value})} /></div>
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
              <button onClick={() => setIsCheckingOut(false)} className="w-1/3 py-3 rounded-lg bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 transition-colors">Back</button>
              <button type="submit" form="checkout-form" className="w-2/3 py-3 rounded-lg text-white font-bold text-lg shadow-sm hover:opacity-90 active:scale-95 flex items-center justify-center gap-2" style={{ backgroundColor: merchant.theme_color || '#000000' }}><span>Send to WhatsApp</span> 📱</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
