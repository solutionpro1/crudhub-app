import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  
  const [isGoogleOnboarding, setIsGoogleOnboarding] = useState(false)
  const [googleUserEmail, setGoogleUserEmail] = useState('')
  const [googleStore, setGoogleStore] = useState({ business_name: '', slug: '', phone_number: '' })
  const [googleCountryCode, setGoogleCountryCode] = useState('+234')
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [googleError, setGoogleError] = useState('')

  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)

  const [loginInput, setLoginInput] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const navigate = useNavigate()

  const [newStore, setNewStore] = useState({ business_name: '', slug: '', phone_number: '', contact_email: '', password: '' })
  const [countryCode, setCountryCode] = useState('+234')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const countryList = [
    { code: "+234", name: "NG" }, { code: "+1", name: "US/CA" }, { code: "+44", name: "GB" }, { code: "+233", name: "GH" }
  ].sort((a, b) => a.name.localeCompare(b.name))

  useEffect(() => {
    async function checkGoogleAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && session.user && session.user.email) {
        const email = session.user.email.toLowerCase()
        const { data: existingMerchant } = await supabase.from('merchants').select('slug').eq('contact_email', email).single()

        if (existingMerchant) {
          sessionStorage.setItem(`crudhub_auth_${existingMerchant.slug}`, 'true')
          navigate(`/${existingMerchant.slug}/manage`)
        } else {
          setGoogleUserEmail(email)
          setIsGoogleOnboarding(true)
        }
      }
    }
    checkGoogleAuth()
  }, [navigate])

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) alert('Google Sign-In Error: ' + error.message)
  }

  async function handleGoogleOnboardingSubmit(e) {
    e.preventDefault()
    setIsGoogleSubmitting(true)
    setGoogleError('')

    const { data: existingSlug } = await supabase.from('merchants').select('id').eq('slug', googleStore.slug).single()
    if (existingSlug) { setGoogleError('This Store Link is already taken.'); setIsGoogleSubmitting(false); return }

    const trialEndDate = new Date(); trialEndDate.setDate(trialEndDate.getDate() + 14)
    const fullPhoneNumber = googleCountryCode + googleStore.phone_number.replace(/^0+/, '')

    const { error } = await supabase.from('merchants').insert([{
      business_name: googleStore.business_name,
      slug: googleStore.slug,
      phone_number: fullPhoneNumber,
      contact_email: googleUserEmail,
      pin_code: 'google-oauth-user',
      theme_color: '#000000',
      status: 'active',
      subscription_plan: 'trial',
      subscription_end_date: trialEndDate.toISOString()
    }])

    if (error) { setGoogleError(error.message); setIsGoogleSubmitting(false) } 
    else { sessionStorage.setItem(`crudhub_auth_${googleStore.slug}`, 'true'); navigate(`/${googleStore.slug}/manage`) }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    let query = supabase.from('merchants').select('slug, pin_code')
    if (loginInput.includes('@')) {
      query = query.eq('contact_email', loginInput.toLowerCase())
    } else {
      const formattedSlug = loginInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      query = query.eq('slug', formattedSlug)
    }

    const { data, error } = await query.single()
    if (error || !data) { setLoginError('Store not found.'); setIsLoggingIn(false); return }
    if (data.pin_code !== loginPassword) { setLoginError('Incorrect password or PIN.'); setIsLoggingIn(false); return }

    sessionStorage.setItem(`crudhub_auth_${data.slug}`, 'true')
    navigate(`/${data.slug}/manage`)
  }

  function handleBusinessNameChange(e) {
    const name = e.target.value
    setNewStore({ ...newStore, business_name: name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') })
  }

  function handleGoogleBusinessNameChange(e) {
    const name = e.target.value
    setGoogleStore({ ...googleStore, business_name: name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') })
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (!agreedToTerms) { setSignupError('You must agree to the Terms.'); return }
    setIsSubmitting(true); setSignupError('')

    const { data: existingSlug } = await supabase.from('merchants').select('id').eq('slug', newStore.slug).single()
    if (existingSlug) { setSignupError('Store URL taken.'); setIsSubmitting(false); return }

    const trialEndDate = new Date(); trialEndDate.setDate(trialEndDate.getDate() + 14)
    const fullPhoneNumber = countryCode + newStore.phone_number.replace(/^0+/, '')

    const { error } = await supabase.from('merchants').insert([{
      business_name: newStore.business_name, slug: newStore.slug, phone_number: fullPhoneNumber,
      contact_email: newStore.contact_email.toLowerCase(), pin_code: newStore.password,
      theme_color: '#000000', status: 'active', subscription_plan: 'trial', subscription_end_date: trialEndDate.toISOString()
    }])

    if (error) { setSignupError(error.message); setIsSubmitting(false) } 
    else { sessionStorage.setItem(`crudhub_auth_${newStore.slug}`, 'true'); navigate(`/${newStore.slug}/manage`) }
  }

  const salesMessage = "Hello SolutionPRO! I would like to talk to sales about setting up my Crudhub store."
  const whatsappSalesUrl = `https://wa.me/2349028116376?text=${encodeURIComponent(salesMessage)}`
  const CloseIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>)

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/crudhub-logo.jpg" alt="Logo" className="h-10 w-10 rounded-full object-cover border" />
            <span className="text-2xl font-black">Crudhub</span>
          </div>
          <button onClick={() => setIsLoginOpen(true)} className="text-sm font-bold bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg cursor-pointer">Merchant Login</button>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto text-center mt-10">
        <h1 className="text-5xl md:text-7xl font-black mb-6">Your Business.<br/><span className="text-green-600">On WhatsApp.</span></h1>
        <button onClick={() => setIsSignupOpen(true)} className="bg-black text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-800 cursor-pointer">Launch Your Store</button>
      </section>

      {/* GOOGLE ONBOARDING MODAL */}
      {isGoogleOnboarding && (
        <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-slide-in">
            <h2 className="text-2xl font-bold mb-1">Complete Your Store Setup</h2>
            <p className="text-gray-500 text-sm mb-6">Authenticated with <strong>{googleUserEmail}</strong>. Fill in your business details below.</p>
            <form onSubmit={handleGoogleOnboardingSubmit} className="space-y-4">
              <div><label className="block text-sm font-bold mb-1">Business Name</label><input required className="w-full border p-3 rounded-lg bg-gray-50" value={googleStore.business_name} onChange={handleGoogleBusinessNameChange} placeholder="e.g. Olamide Fashion" /></div>
              <div><label className="block text-sm font-bold mb-1">Store Link</label><div className="flex items-center bg-gray-50 border rounded-lg overflow-hidden"><span className="pl-3 text-gray-400 text-sm">crudhub.com.ng/</span><input required className="w-full p-3 bg-transparent outline-none font-bold" value={googleStore.slug} onChange={e => setGoogleStore({...googleStore, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} /></div></div>
              <div><label className="block text-sm font-bold mb-1">WhatsApp Number</label><div className="flex bg-gray-50 border rounded-lg overflow-hidden"><select className="bg-transparent pl-3 pr-2 py-3 font-bold border-r" value={googleCountryCode} onChange={e => setGoogleCountryCode(e.target.value)}><option value="+234">NG (+234)</option></select><input required type="tel" className="w-full p-3 bg-transparent outline-none font-bold" value={googleStore.phone_number} onChange={e => setGoogleStore({...googleStore, phone_number: e.target.value.replace(/\D/g, '')})} /></div></div>
              {googleError && <p className="text-red-500 text-sm font-bold">{googleError}</p>}
              <button type="submit" disabled={isGoogleSubmitting} className="w-full bg-black text-white font-bold py-3.5 rounded-xl">{isGoogleSubmitting ? 'Creating...' : 'Finish & Launch'}</button>
            </form>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative animate-slide-in">
            <button type="button" onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold cursor-pointer"><CloseIcon /></button>
            <h2 className="text-2xl font-bold mb-2">Merchant Login</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">Access your store dashboard.</p>
            
            <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl mb-4 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.35 7.23 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 11.7s.43 3.58 1.19 5.12l4.09-2.55z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.65 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
              Continue with Google
            </button>

            <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-bold">Or with Email</span><div className="flex-grow border-t border-gray-200"></div></div>

            <form onSubmit={handleLogin} className="space-y-4 mt-2">
              <div><label className="block text-sm font-bold mb-1 text-gray-700">Email or Business Name</label><input required className="w-full p-3 bg-gray-50 border rounded-xl outline-none font-bold text-sm" value={loginInput} onChange={e => setLoginInput(e.target.value)} /></div>
              <div><label className="block text-sm font-bold mb-1 text-gray-700">Password / PIN</label><input required type="password" className="w-full p-3 bg-gray-50 border rounded-xl outline-none font-bold tracking-widest text-sm" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} /></div>
              {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
              <button type="submit" disabled={isLoggingIn} className="w-full bg-black text-white font-bold py-3.5 rounded-xl">{isLoggingIn ? 'Verifying...' : 'Go to Portal'}</button>
            </form>
          </div>
        </div>
      )}

      {/* SIGNUP MODAL */}
      {isSignupOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-slide-in max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setIsSignupOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold cursor-pointer"><CloseIcon /></button>
            <h2 className="text-2xl font-bold mb-2">Create Your Store</h2>
            
            <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl mb-4 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.35 7.23 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 11.7s.43 3.58 1.19 5.12l4.09-2.55z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.65 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
              Sign up with Google
            </button>

            <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-bold">Or with Email</span><div className="flex-grow border-t border-gray-200"></div></div>

            <form onSubmit={handleSignup} className="space-y-4 mt-2">
              <div><label className="block text-sm font-bold mb-1">Business Name</label><input required className="w-full border p-3 rounded-lg bg-gray-50" value={newStore.business_name} onChange={handleBusinessNameChange} /></div>
              <div><label className="block text-sm font-bold mb-1">Store Link</label><div className="flex items-center bg-gray-50 border rounded-lg overflow-hidden"><span className="pl-3 text-gray-400 text-sm">crudhub.com.ng/</span><input required className="w-full p-3 bg-transparent outline-none font-bold" value={newStore.slug} onChange={e => setNewStore({...newStore, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} /></div></div>
              <div><label className="block text-sm font-bold mb-1">WhatsApp Number</label><div className="flex bg-gray-50 border rounded-lg overflow-hidden"><select className="bg-transparent pl-3 pr-2 py-3 font-bold border-r" value={countryCode} onChange={e => setCountryCode(e.target.value)}><option value="+234">NG (+234)</option></select><input required type="tel" className="w-full p-3 bg-transparent outline-none font-bold" value={newStore.phone_number} onChange={e => setNewStore({...newStore, phone_number: e.target.value.replace(/\D/g, '')})} /></div></div>
              <div><label className="block text-sm font-bold mb-1">Email Address</label><input required type="email" className="w-full border p-3 rounded-lg bg-gray-50" value={newStore.contact_email} onChange={e => setNewStore({...newStore, contact_email: e.target.value})} /></div>
              <div><label className="block text-sm font-bold mb-1">Password</label><input required type="password" minLength="6" className="w-full border p-3 rounded-lg bg-gray-50 font-mono" value={newStore.password} onChange={e => setNewStore({...newStore, password: e.target.value})} /></div>
              
              <div className="flex items-start gap-3 mt-4 bg-gray-50 p-3 rounded-lg border">
                <input type="checkbox" id="terms" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-1 w-4 h-4 text-black rounded" />
                <div className="text-sm text-gray-600"><label htmlFor="terms">I agree to the Terms & Privacy Policy.</label></div>
              </div>

              {signupError && <p className="text-red-500 text-sm font-bold">{signupError}</p>}
              <button type="submit" disabled={isSubmitting || !agreedToTerms} className="w-full bg-black text-white font-bold py-3.5 rounded-xl">{isSubmitting ? 'Creating...' : 'Launch Store'}</button>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-black text-white py-16 text-center">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-6">Ready to scale your business?</h2>
          <a href={whatsappSalesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold">Contact Sales</a>
          <p className="text-gray-600 text-xs mt-8">&copy; {new Date().getFullYear()} Crudhub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}