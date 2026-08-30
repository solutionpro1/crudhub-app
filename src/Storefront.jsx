import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

// Pure mathematical formula to calculate KM distance between two GPS coordinates
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

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
  
  const [merchantCoords, setMerchantCoords] = useState(null)
  const [customer, setCustomer] = useState({ name: '', address: '', notes: '', fulfillmentType: 'delivery', lat: null, lng: null })
  
  const [addressSuggestions, setAddressSuggestions] = useState([])
  
  // NEW: Variant Selection State
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null)

  useEffect(() => { fetchStoreData() }, [storeSlug])

  async function fetchStoreData() {
    const { data: merchantData, error: merchantError } = await supabase.from('merchants').select('*').eq('slug', storeSlug).single()
    if (merchantError || !merchantData) { setLoading(false); return; }
    setMerchant(merchantData)
    
    if (merchantData.delivery_enabled && merchantData.physical_address) {
      if (merchantData.store_lat && merchantData.store_lng) {
        setMerchantCoords({ lat: merchantData.store_lat, lng: merchantData.store_lng })
      } else {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(merchantData.physical_address)}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) setMerchantCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
          }).catch(err => console.log('Geocoding error:', err))
      }
    }

    const { data: productData } = await supabase.from('products').select('*').eq('merchant_id', merchantData.id)
    setProducts(productData || [])
    setLoading(false)
  }

  // Intercept the Add to Cart click if variants exist
  function initiateAddToCart(product) {
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product);
    } else {
      addToCart(product);
    }
  }

  function handleSelectVariant(product, variant) {
    const itemToAdd = {
      ...product,
      id: variant ? `${product.id}-${variant.label}` : product.id,
      name: variant ? `${product.name} (${variant.label})` : product.name,
      price: variant ? Number(product.price) + Number(variant.price) : Number(product.price)
    };
    addToCart(itemToAdd);
    setSelectedProductForVariant(null);
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

  async function searchAddress(query) {
    setCustomer({...customer, address: query, lat: null, lng: null});
    if (query.length < 4) { setAddressSuggestions([]); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setAddressSuggestions(data);
    } catch (e) { console.error(e); }
  }

  function selectAddress(suggestion) {
    setCustomer({
      ...customer, 
      address: suggestion.display_name, 
      lat: parseFloat(suggestion.lat), 
      lng: parseFloat(suggestion.lon)
    });
    setAddressSuggestions([]);
  }

  function getLocation() {
    if (!navigator.geolocation) return alert('Location services are not supported by your browser.');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        setCustomer({ ...customer, address: data.display_name || `Pinned Location`, lat: lat, lng: lng });
      } catch(e) {
        setCustomer({ ...customer, address: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng });
      }
    }, () => alert('Unable to retrieve your location. Please type it in manually.'));
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  let deliveryFee = 0;
  let distanceKm = 0;
  
  if (customer.fulfillmentType === 'delivery' && merchant?.delivery_enabled && customer.lat && merchantCoords) {
    distanceKm = getDistanceFromLatLonInKm(merchantCoords.lat, merchantCoords.lng, customer.lat, customer.lng);
    const blocks = Math.ceil(distanceKm / 3); 
    deliveryFee = blocks * (merchant.delivery_rate_per_km || 0);
  }
  
  const finalTotal = cartSubtotal + deliveryFee;

  async function handleCheckout(e) {
    e.preventDefault(); 
    setIsSubmitting(true);
    
    const { error } = await supabase.from('orders').insert([{ 
      merchant_id: merchant.id, 
      customer_name: customer.name, 
      customer_address: customer.fulfillmentType === 'pickup' ? 'Store Pickup' : customer.address, 
      customer_notes: customer.notes, 
      items: cart, 
      total_amount: finalTotal, 
      status: 'Pending' 
    }])
    
    if (error) { alert('Error placing order. Please try again.'); setIsSubmitting(false); return; }

    const currency = merchant.currency || '₦';
    let orderText = `*New Order from ${customer.name}!* \n\n`
    
    if (customer.fulfillmentType === 'delivery') {
       orderText += `*Order Type:* 🚚 Delivery\n*Delivery Address:* ${customer.address}\n`
       if (customer.lat && customer.lng) {
         orderText += `*Distance:* ${distanceKm.toFixed(1)} km\n`
         orderText += `*Map Pin:* https://www.google.com/maps?q=${customer.lat},${customer.lng}\n`
       }
       orderText += `\n`
    } else {
       orderText += `*Order Type:* 🏬 Store Pickup\n\n`
    }
    
    orderText += `*Items Ordered:*\n`
    cart.forEach(item => { orderText += `- ${item.quantity}x ${item.name} (${currency}${(item.price * item.quantity).toLocaleString()})\n` })
    
    if (deliveryFee > 0) {
      orderText += `\n*Subtotal:* ${currency}${cartSubtotal.toLocaleString()}\n`
      orderText += `*Delivery Fee:* ${currency}${deliveryFee.toLocaleString()}\n`
    }
    
    orderText += `\n*Final Total:* ${currency}${finalTotal.toLocaleString()}\n`
    if (customer.notes) orderText += `\n*Customer Note:* ${customer.notes}`

    const cleanPhone = merchant.phone_number.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderText)}`

    setCart([]); 
    setIsCheckoutOpen(false); 
    setIsSubmitting(false);
    window.open(whatsappUrl, '_blank')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Loading Store...</div>
  if (!merchant) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-red-600">Store Not Found</div>

  if (merchant.status === 'suspended') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
          <div className="text-gray-400 mb-6 flex justify-center"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Store Temporarily Unavailable</h1>
          <p className="text-gray-500 font-medium">This merchant is currently not accepting orders on the platform. Please check back later.</p>
        </div>
      </div>
    )
  }

  const themeColor = merchant.theme_color || '#000000'
  const currency = merchant.currency || '₦'
  const hasSocials = merchant.instagram_url || merchant.tiktok_url || merchant.facebook_url || merchant.x_url || merchant.linkedin_url
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]
  
  const displayedProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const fontStyle = merchant.hero_font === 'serif' ? 'serif' : merchant.hero_font === 'monospace' ? 'monospace' : 'sans-serif';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans flex flex-col">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          {merchant.logo_url ? <img src={merchant.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover border" /> : <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: themeColor }}>{merchant.business_name.charAt(0)}</div>}
          <div><h1 className="text-xl font-bold text-gray-900">{merchant.business_name}</h1><p className="text-sm text-gray-500">Order directly via WhatsApp</p></div>
        </div>
      </header>

      {merchant.hero_text && (
        <div className="w-full py-16 px-6 text-center shadow-inner" style={{ backgroundColor: themeColor, fontFamily: fontStyle }}>
          <h2 className="text-3xl md:text-5xl font-black max-w-4xl mx-auto leading-tight" style={{ color: merchant.hero_text_color || '#ffffff' }}>
            {merchant.hero_text}
          </h2>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input type="text" placeholder="Search the catalog..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-10 pr-4 outline-none focus:ring-2 transition-shadow shadow-sm font-medium" style={{ '--tw-ring-color': themeColor }} />
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
                <p className="font-black text-lg mt-auto mb-4" style={{ color: themeColor }}>{currency}{Number(product.price).toLocaleString()}</p>
                <button onClick={() => initiateAddToCart(product)} className="w-full py-2.5 rounded-lg font-bold text-white transition-opacity hover:opacity-90 active:scale-95" style={{ backgroundColor: themeColor }}>Add to Cart</button>
              </div>
            </div>
          ))}
          {displayedProducts.length === 0 && <div className="col-span-full text-center py-12 text-gray-500 font-medium">{searchQuery ? `No items found matching "${searchQuery}".` : "No products available."}</div>}
        </div>
      </main>

      <footer className="w-full bg-white border-t border-gray-200 mt-8 py-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {hasSocials && (
            <>
              <h3 className="text-gray-900 font-bold mb-6 text-lg">Connect with {merchant.business_name}</h3>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {merchant.instagram_url && (<a href={merchant.instagram_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-50 text-gray-700 hover:text-pink-600 border border-gray-200 hover:border-pink-600 px-5 py-2.5 rounded-full font-bold transition-colors text-sm shadow-sm"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>Instagram</a>)}
                {merchant.tiktok_url && (<a href={merchant.tiktok_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-50 text-gray-700 hover:text-black border border-gray-200 hover:border-black px-5 py-2.5 rounded-full font-bold transition-colors text-sm shadow-sm"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>TikTok</a>)}
                {merchant.facebook_url && (<a href={merchant.facebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-50 text-gray-700 hover:text-blue-600 border border-gray-200 hover:border-blue-600 px-5 py-2.5 rounded-full font-bold transition-colors text-sm shadow-sm"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>Facebook</a>)}
                {merchant.x_url && (<a href={merchant.x_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-50 text-gray-700 hover:text-black border border-gray-200 hover:border-black px-5 py-2.5 rounded-full font-bold transition-colors text-sm shadow-sm"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>X (Twitter)</a>)}
                {merchant.linkedin_url && (<a href={merchant.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-50 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-700 px-5 py-2.5 rounded-full font-bold transition-colors text-sm shadow-sm"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>LinkedIn</a>)}
              </div>
            </>
          )}

          {(merchant.physical_address || merchant.contact_email) && (
            <div className="border-t border-gray-100 pt-8 flex flex-col items-center gap-3">
              {merchant.physical_address && (
                <div className="text-sm text-gray-500 flex flex-col items-center gap-1">
                  <span className="font-bold text-gray-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Location</span>
                  <p className="max-w-md text-center">{merchant.physical_address}</p>
                </div>
              )}
              {merchant.contact_email && (
                <div className="text-sm text-gray-500 flex flex-col items-center gap-1">
                  <span className="font-bold text-gray-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email Us</span>
                  <a href={`mailto:${merchant.contact_email}`} className="hover:underline font-medium">{merchant.contact_email}</a>
                </div>
              )}
            </div>
          )}
        </div>
      </footer>

      <div className="w-full text-center pb-8 pt-4">
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Powered by SolutionPRO Technologies
        </a>
      </div>

      {cartCount > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center pointer-events-none">
          <button onClick={() => setIsCheckoutOpen(true)} className="w-full max-w-md bg-black text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-2xl flex justify-between items-center transform transition-transform hover:scale-[1.02] active:scale-95 pointer-events-auto">
            <span className="bg-white text-black px-3 py-1 rounded-lg text-sm">{cartCount} items</span><span>View Cart</span><span>{currency}{cartSubtotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* VARIANT SELECTION MODAL */}
      {selectedProductForVariant && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-slide-in">
          <div className="w-full max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 truncate pr-4">{selectedProductForVariant.name}</h3>
              <button onClick={() => setSelectedProductForVariant(null)} className="text-gray-400 hover:text-black p-1 bg-white rounded-full border shadow-sm shrink-0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="p-5 overflow-y-auto">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-3">Choose an Option</p>
              
              <button onClick={() => handleSelectVariant(selectedProductForVariant, null)} className="w-full flex justify-between items-center p-4 border-2 border-gray-200 rounded-xl hover:border-black hover:bg-gray-50 transition-colors mb-3 text-left">
                <div>
                  <span className="block font-bold text-gray-900">Base Item (No Add-ons)</span>
                  <span className="text-sm text-gray-500 font-medium">Standard preparation</span>
                </div>
                <span className="font-black text-lg">{currency}{Number(selectedProductForVariant.price).toLocaleString()}</span>
              </button>

              {selectedProductForVariant.variants.map((variant, idx) => (
                <button key={idx} onClick={() => handleSelectVariant(selectedProductForVariant, variant)} className="w-full flex justify-between items-center p-4 border-2 border-gray-200 rounded-xl hover:border-black hover:bg-gray-50 transition-colors mb-3 text-left">
                  <div>
                    <span className="block font-bold text-gray-900">{variant.label}</span>
                    <span className="text-sm text-green-600 font-bold">+{currency}{Number(variant.price).toLocaleString()}</span>
                  </div>
                  <span className="font-black text-lg" style={{ color: themeColor }}>
                    {currency}{(Number(selectedProductForVariant.price) + Number(variant.price)).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full overflow-y-auto flex flex-col animate-slide-in">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-20">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-500 font-bold hover:text-black p-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            
            <div className="p-4 flex-1">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center mb-4 pb-4 border-b">
                  <div className="flex-1 pr-4"><h4 className="font-bold text-gray-800">{item.name}</h4><p className="text-sm text-gray-500">{currency}{Number(item.price).toLocaleString()} each</p></div>
                  <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1"><button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg bg-white rounded shadow-sm">-</button><span className="font-bold w-4 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg bg-white rounded shadow-sm">+</button></div>
                </div>
              ))}
              
              <div className="mt-6">
                <h3 className="font-bold text-lg mb-4">Checkout Details</h3>
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Order Type</label>
                    <div className="flex gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-colors font-bold ${customer.fulfillmentType === 'delivery' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" className="hidden" checked={customer.fulfillmentType === 'delivery'} onChange={() => setCustomer({...customer, fulfillmentType: 'delivery'})} />
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                        Delivery
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-colors font-bold ${customer.fulfillmentType === 'pickup' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" className="hidden" checked={customer.fulfillmentType === 'pickup'} onChange={() => setCustomer({...customer, fulfillmentType: 'pickup', address: '', lat: null, lng: null})} />
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Store Pickup
                      </label>
                    </div>
                  </div>

                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label><input required className="w-full border p-3 rounded-xl focus:ring-2 outline-none bg-gray-50 focus:bg-white transition-colors" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Jane Doe" /></div>
                  
                  {customer.fulfillmentType === 'delivery' && (
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Delivery Address</label>
                      <button type="button" onClick={getLocation} className="w-full mb-2 bg-blue-50 text-blue-700 border border-blue-200 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> Pin My Current Location
                      </button>
                      <input required className="w-full border p-3 rounded-xl focus:ring-2 outline-none bg-gray-50 focus:bg-white transition-colors" value={customer.address} onChange={e => searchAddress(e.target.value)} placeholder="Or search for an address..." />
                      
                      {addressSuggestions.length > 0 && (
                        <ul className="absolute z-30 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                          {addressSuggestions.map((sug, i) => (
                            <li key={i} onClick={() => selectAddress(sug)} className="p-3 hover:bg-gray-50 cursor-pointer text-sm font-medium border-b border-gray-100 last:border-0">{sug.display_name}</li>
                          ))}
                        </ul>
                      )}
                      
                      {merchant?.delivery_enabled && !customer.lat && customer.address.length > 5 && (
                        <p className="text-xs text-orange-600 mt-2 font-bold bg-orange-50 p-2 rounded border border-orange-100">Please select an address from the dropdown or pin your location to calculate the delivery fee.</p>
                      )}
                    </div>
                  )}
                  
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Order Notes (Optional)</label><input className="w-full border p-3 rounded-xl focus:ring-2 outline-none bg-gray-50 focus:bg-white transition-colors" value={customer.notes} onChange={e => setCustomer({...customer, notes: e.target.value})} placeholder="Extra spicy, please!" /></div>
                </form>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 sticky bottom-0 z-20">
              {customer.fulfillmentType === 'delivery' && merchant?.delivery_enabled && customer.lat && (
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200 text-sm text-gray-600 font-medium">
                  <span>Delivery Fee ({distanceKm.toFixed(1)} km)</span>
                  <span className="font-bold text-gray-900">{currency}{deliveryFee.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center mb-4 text-lg"><span className="font-bold text-gray-600">Total to Pay</span><span className="font-black text-2xl text-gray-900">{currency}{finalTotal.toLocaleString()}</span></div>
              <button form="checkout-form" type="submit" disabled={isSubmitting || (customer.fulfillmentType === 'delivery' && merchant?.delivery_enabled && !customer.lat)} className="w-full text-white px-6 py-4 rounded-xl font-bold text-lg shadow-md transition-opacity hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2" style={{ backgroundColor: themeColor }}>
                {isSubmitting ? 'Processing...' : <><span className="flex items-center gap-2">Order via WhatsApp <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span></>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } } .animate-slide-in { animation: slide-in 0.3s ease-out forwards; } .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </div>
  )
}