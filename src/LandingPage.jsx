import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [storeSlug, setStoreSlug] = useState('')
  const navigate = useNavigate()

  function handleLogin(e) {
    e.preventDefault()
    if (storeSlug) {
      navigate(`/${storeSlug.toLowerCase().trim()}/manage`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* NAVIGATION BAR */}
      <nav className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/crudhub-logo.jpg" alt="Crudhub Logo" className="h-10 w-auto rounded object-contain" />
            <span className="text-2xl font-black tracking-tight">Crudhub</span>
          </div>
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-lg transition-colors"
          >
            Merchant Login
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto text-center mt-10">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
          Your Restaurant.<br/>
          <span className="text-green-600">On WhatsApp.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto font-medium">
          Take your food business online in minutes. Get a beautiful digital menu, custom QR codes, and receive every order directly to your WhatsApp. Zero commissions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="mailto:admin@crudhub.app" className="bg-black text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-transform active:scale-95">
            Launch Your Store
          </a>
          <a href="#features" className="bg-white text-gray-900 border-2 border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-300 transition-colors">
            See How it Works
          </a>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Everything you need to sell online.</h2>
            <p className="text-gray-500 font-medium text-lg">We handle the tech so you can focus on the food.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-center">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-xl font-bold mb-3">Direct to WhatsApp</h3>
              <p className="text-gray-500 font-medium">No clunky dashboards to monitor. Customers browse your menu and checkout straight into your WhatsApp inbox.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-center">
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="text-xl font-bold mb-3">Your Brand, Your Rules</h3>
              <p className="text-gray-500 font-medium">Customize your storefront with your exact logo and brand colors. Make it feel like your own premium app.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-center">
              <div className="text-5xl mb-4">📲</div>
              <h3 className="text-xl font-bold mb-3">Instant QR Codes</h3>
              <p className="text-gray-500 font-medium">Print auto-generated QR codes for your tables. Customers just scan, order, and pay without waiting for a waiter.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white py-12 text-center">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-6">Ready to scale your business?</h2>
          <a href="mailto:admin@crudhub.app" className="inline-block bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors mb-12">
            Contact Sales
          </a>
          <p className="text-gray-500 text-sm font-medium">© {new Date().getFullYear()} Crudhub Technologies. All rights reserved.</p>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative animate-slide-in">
            <button onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black font-bold">✕</button>
            <h2 className="text-2xl font-bold mb-2">Merchant Login</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">Enter your store's URL name to access your dashboard.</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="flex items-center bg-gray-50 border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-transparent transition-shadow">
                  <span className="pl-4 text-gray-400 font-medium text-sm">crudhub.app/</span>
                  <input 
                    required
                    placeholder="your-store"
                    className="w-full p-3 bg-transparent outline-none font-bold text-gray-900"
                    value={storeSlug}
                    onChange={e => setStoreSlug(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors shadow-md">
                Go to Portal
              </button>
            </form>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: slide-in 0.2s ease-out forwards; }
        html { scroll-behavior: smooth; }
      `}} />
    </div>
  )
}
