import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function Storefront() {
  const { storeSlug } = useParams()
  const [merchant, setMerchant] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Cart & Checkout State
  const [cart, setCart] = useState([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [customer, setCustomer] = useState({
    name: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    fetchStoreData()
  }, [storeSlug])

  async function fetchStoreData() {
    // 1. Get Merchant
    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('slug', storeSlug)
      .single()

    if (merchantError || !merchantData) {
      setLoading(false)
      return
    }
    setMerchant(merchantData)

    // 2. Get Products
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', merchantData.id)
    
    setProducts(productData || [])
    setLoading(false)
  }

  // --- CART LOGIC ---
  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  function updateQuantity(productId, delta) {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQ = item.quantity + delta
        return newQ > 0 ? { ...item, quantity: newQ } : item
      }
      return item
    }))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // --- CHECKOUT LOGIC ---
  async function handleCheckout(e) {
    e.preventDefault()
    setIsSubmitting(true)

    // 1. Save strictly to the database first
    const { error } = await supabase
      .from('orders')
      .insert([{
        merchant_id: merchant.id,
        customer_name: customer.name,
        customer_address: customer.address,
        customer_notes: customer.notes,
        items: cart,
        total_amount: cartTotal,
        status: 'Pending'
      }])

    if (error) {
      alert('Error placing order. Please try again.')
      setIsSubmitting(false)
      return
    }

    // 2. Format the WhatsApp Message
    let orderText = `*New Order from ${customer.name}!* \n\n`
    orderText += `*Delivery Address:* ${customer.address}\n\n`
    orderText += `*Items Ordered:*\n`
    
    cart.forEach(item => {
      orderText += `- ${item.quantity}x ${item.name} (₦${(item.price * item.quantity).toLocaleString()})\n`
    })

    orderText += `\n*Total Amount:* ₦${cartTotal.toLocaleString()}\n`
    if (customer.notes) orderText += `\n*Customer Note:* ${customer.notes}`

    // 3. Clean the phone number (remove spaces, + signs) and redirect
    const cleanPhone = merchant.phone_number.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderText)}`

    // Reset and redirect
    setCart([])
    setIsCheckoutOpen(false)
    setIsSubmitting(false)
    window.open(whatsappUrl, '_blank')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Loading Store...</div>
  if (!merchant) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-red-600">Store Not Found</div>

  const themeColor = merchant.theme_color || '#000000'

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* BRANDING HEADER */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          {merchant.logo_url ? (
            <img src={merchant.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover border" />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: themeColor }}>
              {merchant.business_name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{merchant.business_name}</h1>
            <p className="text-sm text-gray-500">Order directly via WhatsApp</p>
          </div>
        </div>
      </header>

      {/* PRODUCT GRID */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 font-medium">No Image</div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{product.category}</span>
                <p className="font-black text-lg mt-auto mb-4" style={{ color: themeColor }}>₦{Number(product.price).toLocaleString()}</p>
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full py-2.5 rounded-lg font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: themeColor }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && <div className="col-span-full text-center py-12 text-gray-500 font-medium">This store hasn't added any products yet.</div>}
        </div>
      </main>

      {/* FLOATING CART BUTTON */}
      {cartCount > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center">
          <button 
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full max-w-md bg-black text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-2xl flex justify-between items-center transform transition-transform hover:scale-[1.02] active:scale-95"
          >
            <span className="bg-white text-black px-3 py-1 rounded-lg text-sm">{cartCount} items</span>
            <span>View Cart</span>
            <span>₦{cartTotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full overflow-y-auto flex flex-col animate-slide-in">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-500 font-bold hover:text-black p-2">✕ Close</button>
            </div>

            <div className="p-4 flex-1">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center mb-4 pb-4 border-b">
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-gray-800">{item.name}</h4>
                    <p className="text-sm text-gray-500">₦{Number(item.price).toLocaleString()} each</p>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg bg-white rounded shadow-sm">-</button>
                    <span className="font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg bg-white rounded shadow-sm">+</button>
                  </div>
                </div>
              ))}

              <div className="mt-6">
                <h3 className="font-bold text-lg mb-4">Delivery Details</h3>
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                    <input required className="w-full border p-3 rounded-xl focus:ring-2 outline-none bg-gray-50 focus:bg-white transition-colors" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Delivery Address</label>
                    <textarea required className="w-full border p-3 rounded-xl focus:ring-2 outline-none bg-gray-50 focus:bg-white transition-colors h-20 resize-none" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="123 Main Street..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Order Notes (Optional)</label>
                    <input className="w-full border p-3 rounded-xl focus:ring-2 outline-none bg-gray-50 focus:bg-white transition-colors" value={customer.notes} onChange={e => setCustomer({...customer, notes: e.target.value})} placeholder="Extra spicy, please!" />
                  </div>
                </form>
              </div>
            </div>

            <div className="p-4 border-t bg-white sticky bottom-0">
              <div className="flex justify-between items-center mb-4 text-lg">
                <span className="font-bold text-gray-600">Total to Pay</span>
                <span className="font-black text-2xl text-gray-900">₦{cartTotal.toLocaleString()}</span>
              </div>
              <button 
                form="checkout-form"
                type="submit" 
                disabled={isSubmitting}
                className="w-full text-white px-6 py-4 rounded-xl font-bold text-lg shadow-md transition-opacity hover:opacity-90 disabled:bg-gray-400 flex justify-center items-center gap-2"
                style={{ backgroundColor: themeColor }}
              >
                {isSubmitting ? 'Processing...' : 'Place Order via WhatsApp 💬'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
      `}} />
    </div>
  )
}
