import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)

  // Login States
  const [loginInput, setLoginInput] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const navigate = useNavigate()

  // Signup States
  const [newStore, setNewStore] = useState({ business_name: '', slug: '', phone_number: '', pin_code: '' })
  const [countryCode, setCountryCode] = useState('+234')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const countryList = [
    { code: "+93", name: "AF" }, { code: "+355", name: "AL" }, { code: "+213", name: "DZ" }, { code: "+376", name: "AD" },
    { code: "+244", name: "AO" }, { code: "+54", name: "AR" }, { code: "+61", name: "AU" }, { code: "+43", name: "AT" },
    { code: "+973", name: "BH" }, { code: "+880", name: "BD" }, { code: "+375", name: "BY" }, { code: "+32", name: "BE" },
    { code: "+229", name: "BJ" }, { code: "+55", name: "BR" }, { code: "+359", name: "BG" }, { code: "+226", name: "BF" },
    { code: "+257", name: "BI" }, { code: "+855", name: "KH" }, { code: "+237", name: "CM" }, { code: "+1", name: "CA/US" },
    { code: "+238", name: "CV" }, { code: "+236", name: "CF" }, { code: "+235", name: "TD" }, { code: "+56", name: "CL" },
    { code: "+86", name: "CN" }, { code: "+57", name: "CO" }, { code: "+242", name: "CG" }, { code: "+243", name: "CD" },
    { code: "+225", name: "CI" }, { code: "+385", name: "HR" }, { code: "+53", name: "CU" }, { code: "+357", name: "CY" },
    { code: "+420", name: "CZ" }, { code: "+45", name: "DK" }, { code: "+253", name: "DJ" }, { code: "+20", name: "EG" },
    { code: "+240", name: "GQ" }, { code: "+291", name: "ER" }, { code: "+372", name: "EE" }, { code: "+251", name: "ET" },
    { code: "+358", name: "FI" }, { code: "+33", name: "FR" }, { code: "+241", name: "GA" }, { code: "+220", name: "GM" },
    { code: "+995", name: "GE" }, { code: "+49", name: "DE" }, { code: "+233", name: "GH" }, { code: "+30", name: "GR" },
    { code: "+224", name: "GN" }, { code: "+245", name: "GW" }, { code: "+509", name: "HT" }, { code: "+504", name: "HN" },
    { code: "+36", name: "HU" }, { code: "+354", name: "IS" }, { code: "+91", name: "IN" }, { code: "+62", name: "ID" },
    { code: "+98", name: "IR" }, { code: "+964", name: "IQ" }, { code: "+353", name: "IE" }, { code: "+972", name: "IL" },
    { code: "+39", name: "IT" }, { code: "+81", name: "JP" }, { code: "+962", name: "JO" }, { code: "+254", name: "KE" },
    { code: "+82", name: "KR" }, { code: "+965", name: "KW" }, { code: "+961", name: "LB" }, { code: "+231", name: "LR" },
    { code: "+218", name: "LY" }, { code: "+261", name: "MG" }, { code: "+265", name: "MW" }, { code: "+60", name: "MY" },
    { code: "+223", name: "ML" }, { code: "+222", name: "MR" }, { code: "+230", name: "MU" }, { code: "+52", name: "MX" },
    { code: "+212", name: "MA" }, { code: "+258", name: "MZ" }, { code: "+264", name: "NA" }, { code: "+31", name: "NL" },
    { code: "+64", name: "NZ" }, { code: "+227", name: "NE" }, { code: "+234", name: "NG" }, { code: "+47", name: "NO" },
    { code: "+92", name: "PK" }, { code: "+507", name: "PA" }, { code: "+595", name: "PY" }, { code: "+51", name: "PE" },
    { code: "+63", name: "PH" }, { code: "+48", name: "PL" }, { code: "+351", name: "PT" }, { code: "+974", name: "QA" },
    { code: "+40", name: "RO" }, { code: "+7", name: "RU" }, { code: "+250", name: "RW" }, { code: "+966", name: "SA" },
    { code: "+221", name: "SN" }, { code: "+381", name: "RS" }, { code: "+232", name: "SL" }, { code: "+65", name: "SG" },
    { code: "+27", name: "ZA" }, { code: "+34", name: "ES" }, { code: "+94", name: "LK" }, { code: "+249", name: "SD" },
    { code: "+46", name: "SE" }, { code: "+41", name: "CH" }, { code: "+963", name: "SY" }, { code: "+886", name: "TW" },
    { code: "+255", name: "TZ" }, { code: "+66", name: "TH" }, { code: "+228", name: "TG" }, { code: "+216", name: "TN" },
    { code: "+90", name: "TR" }, { code: "+256", name: "UG" }, { code: "+380", name: "UA" }, { code: "+971", name: "AE" },
    { code: "+44", name: "GB" }, { code: "+598", name: "UY" }, { code: "+998", name: "UZ" }, { code: "+58", name: "VE" },
    { code: "+84", name: "VN" }, { code: "+967", name: "YE" }, { code: "+260", name: "ZM" }, { code: "+263", name: "ZW" }
  ].sort((a, b) => a.name.localeCompare(b.name))

  async function handleLogin(e) {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    const formattedSlug = loginInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    const { data, error } = await supabase
      .from('merchants')
      .select('pin_code')
      .eq('slug', formattedSlug)
      .single()

    if (error || !data) {
      setLoginError('Store not found. Please check your Business Name.')
      setIsLoggingIn(false)
      return
    }

    if (data.pin_code !== loginPin) {
      setLoginError('Incorrect PIN. Please try again.')
      setIsLoggingIn(false)
      return
    }

    navigate(`/${formattedSlug}/manage`)
  }

  function handleBusinessNameChange(e) {
    const name = e.target.value
    setNewStore({
      ...newStore,
      business_name: name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    })
  }

  async function handleSignup(e) {
    e.preventDefault()
    
    if (!agreedToTerms) {
      setSignupError('You must agree to the Terms & Conditions and Privacy Policy to proceed.')
      return
    }
    
    setIsSubmitting(true)
    setSignupError('')

    const { data: existing } = await supabase.from('merchants').select('id').eq('slug', newStore.slug).single()
    if (existing) {
       setSignupError('This store URL is already taken. Please choose another one.')
       setIsSubmitting(false)
       return
    }

    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 14)

    const fullPhoneNumber = countryCode + newStore.phone_number.replace(/^0+/, '')

    const { error } = await supabase.from('merchants').insert([{
      business_name: newStore.business_name,
      slug: newStore.slug,
      phone_number: fullPhoneNumber,
      pin_code: newStore.pin_code,
      theme_color: '#000000',
      status: 'active',
      subscription_plan: 'trial',
      subscription_end_date: trialEndDate.toISOString()
    }])

    if (error) {
      setSignupError(error.message)
      setIsSubmitting(false)
    } else {
      navigate(`/${newStore.slug}/manage`)
    }
  }

  const salesMessage = "Hello SolutionPRO! I would like to talk to sales about setting up my Crudhub store."
  const whatsappSalesUrl = `https://wa.me/2349028116376?text=${encodeURIComponent(salesMessage)}`
  
  const forgotPinMessage = "Hello Support, I forgot my Crudhub Merchant PIN or Business Name. Can you help me recover my account?"
  const whatsappForgotPinUrl = `https://wa.me/2349028116376?text=${encodeURIComponent(forgotPinMessage)}`

  const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/crudhub-logo.jpg" alt="Crudhub Logo" className="h-10 w-10 rounded-full object-cover shadow-sm border border-gray-100" />
            <span className="text-2xl font-black tracking-tight">Crudhub</span>
          </div>
          <button onClick={() => setIsLoginOpen(true)} className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-lg transition-colors">Merchant Login</button>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto text-center mt-10">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">Your Business.<br/><span className="text-green-600">On WhatsApp.</span></h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto font-medium">Take your boutique, pharmacy, restaurant, or retail shop online in minutes. Get a smart catalog, dynamic GPS delivery calculations, real-time analytics, and receive every order straight to your WhatsApp.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => setIsSignupOpen(true)} className="bg-black text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-transform active:scale-95 flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Launch Your Store
          </button>
          <a href="#features" className="bg-white text-gray-900 border-2 border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-300 transition-colors">See the Features</a>
        </div>
      </section>

      <section id="features" className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Enterprise features, zero complexity.</h2>
            <p className="text-gray-500 font-medium text-lg">Everything you need to automate sales, tracking, and delivery logistics.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>
              <h3 className="text-xl font-bold mb-3">Direct to WhatsApp</h3>
              <p className="text-gray-500 font-medium">No clunky dashboards to monitor. Customers browse your catalog and checkout straight into your WhatsApp inbox with a perfectly formatted receipt.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
              <h3 className="text-xl font-bold mb-3">Smart GPS Delivery</h3>
              <p className="text-gray-500 font-medium">Set your delivery rate per kilometer. Customers pin their exact location, and the system automatically calculates the distance and adds the delivery fee.</p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
              <h3 className="text-xl font-bold mb-3">Add-ons & Variations</h3>
              <p className="text-gray-500 font-medium">Sell items with multiple options. Add sizes, colors, or extra toppings with dynamic pricing that updates the customer's cart instantly.</p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
              <h3 className="text-xl font-bold mb-3">Analytics Dashboard</h3>
              <p className="text-gray-500 font-medium">Log into your merchant portal to track your total revenue, pending orders, and discover your top-selling products in real time.</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg></div>
              <h3 className="text-xl font-bold mb-3">Your Brand, Your Rules</h3>
              <p className="text-gray-500 font-medium">Customize your storefront with your logo, brand colors, and a premium Hero banner. Make it feel like your own dedicated app.</p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
              <h3 className="text-xl font-bold mb-3">Instant QR Codes</h3>
              <p className="text-gray-500 font-medium">Print auto-generated QR codes for your shop, tables, or packaging. Customers just scan to order and pay seamlessly.</p>
            </div>

          </div>
        </div>
      </section>

      <footer className="bg-black text-white py-16 text-center">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-6">Ready to scale your business?</h2>
          <a href={whatsappSalesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors mb-12">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Contact Sales
          </a>
          
          <div className="border-t border-gray-800 pt-8 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-400 text-sm font-medium">
            <div className="flex flex-col items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>+234 902 811 6376</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <span>realsolutionpro@outlook.com</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>33A Olorunsogo Street, Sote<br/>Ibafo, Ogun State</span>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-4 text-gray-500 text-sm font-medium">
             <button type="button" onClick={() => setIsTermsOpen(true)} className="hover:text-white transition-colors cursor-pointer">Terms & Conditions</button>
             <span>|</span>
             <button type="button" onClick={() => setIsPrivacyOpen(true)} className="hover:text-white transition-colors cursor-pointer">Privacy Policy</button>
          </div>
          <p className="text-gray-600 text-xs font-medium mt-4">&copy; {new Date().getFullYear()} Crudhub. Powered by SolutionPRO Technologies. All rights reserved.</p>
        </div>
      </footer>

      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative animate-slide-in">
            <button type="button" onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold cursor-pointer">
              <CloseIcon />
            </button>
            <h2 className="text-2xl font-bold mb-2">Merchant Login</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">Enter your credentials to manage your store.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">Business Name</label>
                <input required placeholder="" className="w-full p-3 bg-gray-50 border rounded-xl outline-none font-bold text-gray-900 focus:ring-2 focus:ring-black focus:bg-white transition-shadow" value={loginInput} onChange={e => setLoginInput(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">4-Digit PIN</label>
                <input required type="password" maxLength="4" placeholder="••••" className="w-full p-3 bg-gray-50 border rounded-xl outline-none font-bold tracking-widest text-gray-900 focus:ring-2 focus:ring-black focus:bg-white transition-shadow" value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, ''))} />
              </div>
              {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
              <button type="submit" disabled={isLoggingIn} className="w-full bg-black text-white font-bold py-3.5 mt-2 rounded-xl hover:bg-gray-800 transition-colors shadow-md disabled:bg-gray-400">
                {isLoggingIn ? 'Verifying...' : 'Go to Portal'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <a href={whatsappForgotPinUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-bold">Forgot PIN or Business Name?</a>
            </div>
          </div>
        </div>
      )}

      {isSignupOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-slide-in">
            <button type="button" onClick={() => setIsSignupOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold cursor-pointer">
              <CloseIcon />
            </button>
            <h2 className="text-2xl font-bold mb-2">Create Your Store</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">Launch your platform immediately. No credit card required.</p>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">Business Name</label>
                <input required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white" value={newStore.business_name} onChange={handleBusinessNameChange} placeholder="" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">Store Link</label>
                <div className="flex items-center bg-gray-50 border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-transparent transition-shadow">
                  <span className="pl-3 text-gray-400 font-medium text-sm">crudhub.com.ng/</span>
                  <input required className="w-full p-3 bg-transparent outline-none font-bold text-gray-900" value={newStore.slug} onChange={e => setNewStore({...newStore, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} placeholder="your-store" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">WhatsApp Number</label>
                <div className="flex bg-gray-50 border rounded-lg focus-within:ring-2 focus-within:ring-black focus-within:bg-white overflow-hidden">
                  <select 
                    className="bg-transparent pl-3 pr-2 py-3 text-gray-700 font-bold outline-none border-r border-gray-200 cursor-pointer"
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                  >
                    <option value="+234">NG (+234)</option>
                    {countryList.map((country, idx) => (
                      <option key={idx} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                  <input required type="tel" className="w-full p-3 bg-transparent outline-none font-bold" value={newStore.phone_number} onChange={e => setNewStore({...newStore, phone_number: e.target.value.replace(/\D/g, '')})} placeholder="" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">Create a 4-Digit PIN</label>
                <input required type="password" maxLength="4" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white tracking-widest font-mono" value={newStore.pin_code} onChange={e => setNewStore({...newStore, pin_code: e.target.value.replace(/\D/g, '')})} placeholder="••••" />
              </div>
              
              <div className="flex items-start gap-3 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={agreedToTerms} 
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-black focus:ring-black rounded border-gray-300"
                />
                <div className="text-sm text-gray-600 font-medium leading-tight pt-0.5">
                  <label htmlFor="terms">I agree to the </label>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setIsTermsOpen(true); }} 
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Terms & Conditions
                  </button>
                  <span> and </span>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setIsPrivacyOpen(true); }} 
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Privacy Policy
                  </button>
                  <label htmlFor="terms">, and confirm my business operates legally.</label>
                </div>
              </div>

              {signupError && <p className="text-red-500 text-sm font-bold">{signupError}</p>}
              <button type="submit" disabled={isSubmitting || !agreedToTerms} className="w-full bg-black text-white font-bold py-3.5 mt-2 rounded-xl hover:bg-gray-800 transition-colors shadow-md disabled:bg-gray-400">
                {isSubmitting ? 'Creating Store...' : 'Launch Store Now'}
              </button>
            </form>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.2s ease-out forwards; } html { scroll-behavior: smooth; } .sticky-close { position: sticky; float: right; top: 0; }`}} />
    </div>
  )
}