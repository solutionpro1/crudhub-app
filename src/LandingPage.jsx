import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)

  const [storeSlug, setStoreSlug] = useState('')
  const navigate = useNavigate()

  const [newStore, setNewStore] = useState({ business_name: '', slug: '', phone_number: '', pin_code: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  function handleLogin(e) {
    e.preventDefault()
    if (storeSlug) {
      navigate(`/${storeSlug.toLowerCase().trim()}/manage`)
    }
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
      setSignupError('You must agree to the Terms & Conditions to proceed.')
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

    const { error } = await supabase.from('merchants').insert([{
      business_name: newStore.business_name,
      slug: newStore.slug,
      phone_number: newStore.phone_number,
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
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto font-medium">Take your boutique, pharmacy, restaurant, or retail shop online in minutes. Get a beautiful digital storefront, custom QR codes, and receive every order directly to your WhatsApp. Zero commissions.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => setIsSignupOpen(true)} className="bg-black text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-transform active:scale-95 flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Launch Your Store
          </button>
          <a href="#features" className="bg-white text-gray-900 border-2 border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-300 transition-colors">See How it Works</a>
        </div>
      </section>

      <section id="features" className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Everything you need to sell online.</h2>
            <p className="text-gray-500 font-medium text-lg">We handle the tech so you can focus on growing your business.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-center">
              <div className="text-gray-800 mb-4 flex justify-center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>
              <h3 className="text-xl font-bold mb-3">Direct to WhatsApp</h3>
              <p className="text-gray-500 font-medium">No clunky dashboards to monitor. Customers browse your catalog and checkout straight into your WhatsApp inbox.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-center">
              <div className="text-gray-800 mb-4 flex justify-center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg></div>
              <h3 className="text-xl font-bold mb-3">Your Brand, Your Rules</h3>
              <p className="text-gray-500 font-medium">Customize your storefront with your exact logo and brand colors. Make it feel like your own premium app.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-center">
              <div className="text-gray-800 mb-4 flex justify-center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
              <h3 className="text-xl font-bold mb-3">Instant QR Codes</h3>
              <p className="text-gray-500 font-medium">Print auto-generated QR codes for your shop, tables, or packaging. Customers just scan, order, and pay seamlessly.</p>
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
          <p className="text-gray-600 text-xs font-medium mt-4">? {new Date().getFullYear()} Crudhub. Powered by SolutionPRO Technologies. All rights reserved.</p>
        </div>
      </footer>

      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative animate-slide-in">
            <button type="button" onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold">
              ?
            </button>
            <h2 className="text-2xl font-bold mb-2">Merchant Login</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">Enter your store's URL name to access your dashboard.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="flex items-center bg-gray-50 border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-transparent transition-shadow">
                  <span className="pl-4 text-gray-400 font-medium text-sm">crudhub.com.ng/</span>
                  <input required placeholder="your-store" className="w-full p-3 bg-transparent outline-none font-bold text-gray-900" value={storeSlug} onChange={e => setStoreSlug(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors shadow-md">Go to Portal</button>
            </form>
          </div>
        </div>
      )}

      {isSignupOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-slide-in">
            <button type="button" onClick={() => setIsSignupOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold cursor-pointer">
              ?
            </button>
            <h2 className="text-2xl font-bold mb-2">Create Your Store</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">Launch your platform immediately. No credit card required.</p>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">Business Name</label>
                <input required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white" value={newStore.business_name} onChange={handleBusinessNameChange} placeholder="e.g., SolutionPRO Gadgets" />
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
                <input required type="tel" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white" value={newStore.phone_number} onChange={e => setNewStore({...newStore, phone_number: e.target.value})} placeholder="+234..." />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">Create a 4-Digit PIN</label>
                <input required type="password" maxLength="4" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white tracking-widest font-mono" value={newStore.pin_code} onChange={e => setNewStore({...newStore, pin_code: e.target.value.replace(/\D/g, '')})} placeholder="1234" />
              </div>
              
              <div className="flex items-start gap-3 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={agreedToTerms} 
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-black focus:ring-black rounded border-gray-300"
                />
                <div className="text-sm text-gray-600 font-medium leading-tight">
                  <label htmlFor="terms">I agree to the </label>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setIsTermsOpen(true); }} 
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Terms & Conditions
                  </button>
                  <label htmlFor="terms"> and confirm my business operates legally.</label>
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

      {/* EXPANDED TERMS MODAL (SUBSCRIPTION HIDDEN) */}
      {isTermsOpen && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-3xl max-h-[85vh] overflow-y-auto relative animate-slide-in">
            <button onClick={() => setIsTermsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold cursor-pointer sticky-close">
              ?
            </button>
            <h2 className="text-3xl font-black mb-2 text-gray-900">Terms and Conditions</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 pb-4 border-b border-gray-100">Last Updated: August 2026</p>
            
            <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">1. Introduction and Agreement</h3>
                <p>Welcome to Crudhub, a software-as-a-service (SaaS) platform operated and maintained by SolutionPRO Technologies. By checking the agreement box and launching a store, you (the "Merchant") enter into a binding agreement with SolutionPRO Technologies. If you do not agree to these terms, you may not use our services.</p>
              </div>
              
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">2. Software Provider Status</h3>
                <p>Crudhub is strictly a digital infrastructure provider. We supply the software that allows you to display a digital catalog and route customer orders directly to your WhatsApp number. We do not process payments, hold funds, manage logistics, deliver physical goods, or offer quality control. Every transaction is an independent contract between you and your end-consumer.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">3. Account Registration & Security</h3>
                <p>To use Crudhub, you must register a valid WhatsApp number and create a secure 4-digit PIN. You are entirely responsible for maintaining the confidentiality of this PIN and for any activity that occurs under your account. SolutionPRO Technologies will not be liable for any loss or damage arising from your failure to protect your login credentials.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">4. Service Access and Modifications</h3>
                <p>SolutionPRO Technologies currently provides Crudhub as a platform for registered merchants. We reserve the right to modify, update, suspend, or adjust the features and access requirements of the platform at our discretion. Merchants will be provided with reasonable notice regarding any future updates to our service structure or access policies.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">5. Acceptable Use Policy (Prohibited Usage)</h3>
                <p>You agree not to use the Crudhub platform to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Sell, advertise, or distribute illegal drugs, contraband, or unlicensed pharmaceuticals.</li>
                  <li>Distribute counterfeit goods or violate intellectual property rights.</li>
                  <li>Engage in fraudulent activities or deceive end-consumers.</li>
                  <li>Spam or abuse the WhatsApp API integration.</li>
                </ul>
                <p className="mt-2">Violation of this policy will result in the immediate and permanent deletion of your account and data, without prior notice.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">6. Limitation of Liability</h3>
                <p>To the maximum extent permitted by law, SolutionPRO Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, resulting from (a) your access to or use of the platform; (b) any conduct or content of any third party on the platform; (c) any downtime, server failures, or WhatsApp API outages.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">7. Governing Law</h3>
                <p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, specifically within the jurisdiction of Ogun State, without regard to its conflict of law provisions.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">8. Contact Information</h3>
                <p>For legal inquiries or support, please contact SolutionPRO Technologies at:</p>
                <div className="mt-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p><strong>Address:</strong> 33A Olorunsogo Street, Sote, Ibafo, Ogun State, Nigeria</p>
                  <p><strong>Phone:</strong> +234 902 811 6376</p>
                  <p><strong>Email:</strong> realsolutionpro@outlook.com</p>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100">
              <button onClick={() => setIsTermsOpen(false)} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors shadow-md">I Have Read & Understand</button>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDED PRIVACY MODAL (SUBSCRIPTION HIDDEN) */}
      {isPrivacyOpen && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-3xl max-h-[85vh] overflow-y-auto relative animate-slide-in">
            <button onClick={() => setIsPrivacyOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold cursor-pointer sticky-close">
              ?
            </button>
            <h2 className="text-3xl font-black mb-2 text-gray-900">Privacy Policy</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 pb-4 border-b border-gray-100">Last Updated: August 2026</p>
            
            <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">1. Information We Collect</h3>
                <p>When you register for Crudhub as a Merchant, SolutionPRO Technologies collects essential business data. This includes your business name, a valid WhatsApp phone number, your digital catalog data (product names, descriptions, pricing, and images), and a secure 4-digit PIN generated by you for authentication purposes.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">2. How We Use Your Data</h3>
                <p>The data we collect is utilized strictly to provide and improve the Crudhub platform. Specifically, we use your data to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Generate and host your public-facing digital storefront.</li>
                  <li>Authenticate your login sessions to the Merchant Portal.</li>
                  <li>Format and route incoming customer orders directly to your provided WhatsApp number.</li>
                  <li>Send automated system notifications and important platform updates.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">3. End-Consumer Data Processing</h3>
                <p>When a customer places an order on your storefront, they input their name, delivery address, and order notes. <strong>Crudhub acts only as a Data Processor</strong> in this exchange; you (the Merchant) are the Data Controller. Crudhub temporarily processes this customer information solely to compile the WhatsApp message payload. We do not store end-consumer data for marketing, analytics, or resale.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">4. Data Security & NDPR Compliance</h3>
                <p>SolutionPRO Technologies is committed to adhering to standard data protection regulations, including the Nigeria Data Protection Regulation (NDPR). Our backend infrastructure (powered by Supabase) utilizes secure, encrypted cloud environments to protect your information against unauthorized access, alteration, disclosure, or destruction.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">5. Data Sharing and Third Parties</h3>
                <p><strong>We will never sell, rent, or trade your personal or business data to third parties.</strong> Data is only shared with our necessary cloud infrastructure providers (e.g., hosting servers and databases) required to keep the platform online.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">6. Your Rights to Data Deletion</h3>
                <p>You maintain full ownership of your catalog data. You have the right to request the complete modification or deletion of your account and all associated data from our servers. To initiate a permanent data deletion request, please contact our support team at <strong>realsolutionpro@outlook.com</strong>.</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100">
              <button onClick={() => setIsPrivacyOpen(false)} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors shadow-md">I Have Read & Understand</button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.2s ease-out forwards; } html { scroll-behavior: smooth; } .sticky-close { position: sticky; float: right; top: 0; }`}} />
    </div>
  )
}
