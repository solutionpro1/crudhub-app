import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  
  // Unified 2-Step Onboarding States
  const [signupStep, setSignupStep] = useState(1) // 1: Auth, 2: Store Details
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpMessage, setOtpMessage] = useState('')
  
  const [newStore, setNewStore] = useState({ business_name: '', slug: '', phone_number: '' })
  const [countryCode, setCountryCode] = useState('+234')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupError, setSignupError] = useState('')

  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)

  // Login States
  const [loginInput, setLoginInput] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const navigate = useNavigate()

  const countryList = [
    { code: "+234", name: "NG" }, { code: "+1", name: "US/CA" }, { code: "+44", name: "GB" }, { code: "+233", name: "GH" }
  ].sort((a, b) => a.name.localeCompare(b.name))

  // Check if user just returned from Google OAuth redirect
  useEffect(() => {
    async function checkGoogleAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && session.user && session.user.email) {
        const email = session.user.email.toLowerCase()
        
        // Check if this Google email already has a store
        const { data: existingMerchant } = await supabase
          .from('merchants')
          .select('slug')
          .eq('contact_email', email)
          .single()

        if (existingMerchant) {
          sessionStorage.setItem(`crudhub_auth_${existingMerchant.slug}`, 'true')
          navigate(`/${existingMerchant.slug}/manage`)
        } else {
          // New Google user! Open signup modal directly at Step 2
          setSignupEmail(email)
          setSignupPassword('google-oauth-user')
          setSignupStep(2)
          setIsSignupOpen(true)
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

  async function handleCancelSignup() {
    // If they cancel out of a partial Google registration, sign them out of Google
    if (signupPassword === 'google-oauth-user') {
      await supabase.auth.signOut()
    }
    setIsSignupOpen(false)
    setSignupStep(1)
    setSignupEmail('')
    setSignupPassword('')
    setOtpSent(false)
    setOtpCode('')
    setOtpMessage('')
    setSignupError('')
    setNewStore({ business_name: '', slug: '', phone_number: '' })
    setAgreedToTerms(false)
  }

  // STEP 1: Process Email Auth & OTP
  async function handleAuthStepSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setSignupError('')
    setOtpMessage('')

    if (!otpSent) {
      const { data: existingEmail } = await supabase.from('merchants').select('id').eq('contact_email', signupEmail.toLowerCase()).single()
      if (existingEmail) { setSignupError('This email is already registered.'); setIsSubmitting(false); return }

      const { error: otpError } = await supabase.auth.signInWithOtp({ email: signupEmail.toLowerCase() })
      if (otpError) {
        setSignupError(otpError.message)
        setIsSubmitting(false)
        return
      }
      setOtpSent(true)
      setOtpMessage('Verification code sent! Please check your email inbox.')
      setIsSubmitting(false)
      return
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: signupEmail.toLowerCase(),
      token: otpCode,
      type: 'email'
    })

    if (verifyError) {
      setSignupError('Invalid or expired verification code. Please try again.')
      setIsSubmitting(false)
      return
    }

    // Verified! Move to Step 2
    setSignupError('')
    setSignupStep(2)
    setIsSubmitting(false)
  }

  // STEP 2: Process Store Details
  async function handleDetailsStepSubmit(e) {
    e.preventDefault()
    if (!agreedToTerms) { setSignupError('You must agree to the Terms & Conditions and Privacy Policy to proceed.'); return }
    setIsSubmitting(true)
    setSignupError('')

    const { data: existingSlug } = await supabase.from('merchants').select('id').eq('slug', newStore.slug).single()
    if (existingSlug) { setSignupError('This store URL is already taken. Please choose another one.'); setIsSubmitting(false); return }

    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 14)
    const fullPhoneNumber = countryCode + newStore.phone_number.replace(/^0+/, '')

    const { error } = await supabase.from('merchants').insert([{
      business_name: newStore.business_name,
      slug: newStore.slug,
      phone_number: fullPhoneNumber,
      contact_email: signupEmail.toLowerCase(),
      pin_code: signupPassword,
      theme_color: '#000000',
      status: 'active',
      subscription_plan: 'trial',
      subscription_end_date: trialEndDate.toISOString()
    }])

    if (error) {
      setSignupError(error.message)
      setIsSubmitting(false)
    } else {
      sessionStorage.setItem(`crudhub_auth_${newStore.slug}`, 'true')
      navigate(`/${newStore.slug}/manage`)
    }
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

    if (error || !data) {
      setLoginError('Store not found. Check your email or business name.')
      setIsLoggingIn(false)
      return
    }

    if (data.pin_code !== loginPassword) {
      setLoginError('Incorrect password or PIN. Please try again.')
      setIsLoggingIn(false)
      return
    }

    sessionStorage.setItem(`crudhub_auth_${data.slug}`, 'true')
    navigate(`/${data.slug}/manage`)
  }

  function handleBusinessNameChange(e) {
    const name = e.target.value
    setNewStore({
      ...newStore,
      business_name: name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    })
  }

  const salesMessage = "Hello SolutionPRO! I would like to talk to sales about setting up my Crudhub store."
  const whatsappSalesUrl = `https://wa.me/2349028116376?text=${encodeURIComponent(salesMessage)}`
  const forgotPinMessage = "Hello Support, I forgot my Crudhub Merchant login details. Can you help me recover my account?"
  const whatsappForgotPinUrl = `https://wa.me/2349028116376?text=${encodeURIComponent(forgotPinMessage)}`

  const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="bg-white border-b border-gray-200 fixed w-full top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/crudhub-logo.jpg" alt="Crudhub Logo" className="h-10 w-10 rounded-full object-cover shadow-sm border border-gray-100" />
            <span className="text-2xl font-black tracking-tight">Crudhub</span>
          </div>
          <button onClick={() => setIsLoginOpen(true)} className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-lg transition-colors cursor-pointer">Merchant Login</button>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto text-center mt-10">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">Your Business.<br/><span className="text-green-600">On WhatsApp.</span></h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto font-medium">Take your boutique, pharmacy, restaurant, or retail shop online in minutes. Get a beautiful digital storefront, custom QR codes, and receive every order directly to your WhatsApp.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => setIsSignupOpen(true)} className="bg-black text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Launch Your Store
          </button>
          <a href="#features" className="bg-white text-gray-900 border-2 border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-300 transition-colors">See the Features</a>
        </div>
      </section>

      {/* TWO-STEP SIGNUP MODAL */}
      {isSignupOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-slide-in max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={handleCancelSignup} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold cursor-pointer"><CloseIcon /></button>
            
            {signupStep === 1 ? (
              <>
                <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
                <p className="text-gray-500 text-sm font-medium mb-6">Authenticate to start building your store.</p>
                
                {!otpSent && (
                  <>
                    <button onClick={handleGoogleLogin} type="button" className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl mb-4 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.35 7.23 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 11.7s.43 3.58 1.19 5.12l4.09-2.55z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.65 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
                      Sign up with Google
                    </button>
                    <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-bold">Or with Email</span><div className="flex-grow border-t border-gray-200"></div></div>
                  </>
                )}

                <form onSubmit={handleAuthStepSubmit} className="space-y-4 mt-2">
                  <div className={otpSent ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">Email Address</label>
                    <input required type="email" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white text-sm" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="you@business.com" readOnly={otpSent} />
                  </div>
                  <div className={otpSent ? 'hidden' : 'block'}>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">Create a Password</label>
                    <input required type="password" minLength="6" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white font-mono tracking-widest" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="••••••••" />
                  </div>

                  {otpSent && (
                    <div className="animate-slide-in mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <label className="block text-sm font-bold mb-1.5 text-blue-900">Enter 6-Digit Email Code</label>
                      <input required type="text" maxLength="6" className="w-full border border-blue-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono text-center text-xl tracking-[0.5em] font-bold" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
                      <p className="text-xs text-blue-600 font-bold mt-2 text-center">{otpMessage}</p>
                    </div>
                  )}

                  {signupError && <p className="text-red-500 text-sm font-bold">{signupError}</p>}
                  
                  <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white font-bold py-3.5 mt-2 rounded-xl hover:bg-gray-800 transition-colors shadow-md disabled:bg-gray-400">
                    {isSubmitting ? 'Processing...' : (otpSent ? 'Verify & Continue' : 'Send Verification Code')}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2">Setup Your Store</h2>
                <p className="text-gray-500 text-sm font-medium mb-6">Authenticated securely as <strong>{signupEmail}</strong>. Let's finish your setup.</p>
                
                <form onSubmit={handleDetailsStepSubmit} className="space-y-4">
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
                      <select className="bg-transparent pl-3 pr-2 py-3 text-gray-700 font-bold outline-none border-r border-gray-200 cursor-pointer" value={countryCode} onChange={e => setCountryCode(e.target.value)}>
                        <option value="+234">NG (+234)</option>
                      </select>
                      <input required type="tel" className="w-full p-3 bg-transparent outline-none font-bold" value={newStore.phone_number} onChange={e => setNewStore({...newStore, phone_number: e.target.value.replace(/\D/g, '')})} placeholder="" />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 w-4 h-4 text-black focus:ring-black rounded border-gray-300 cursor-pointer" />
                    <div className="text-sm text-gray-600 font-medium leading-tight pt-0.5">
                      <label htmlFor="terms" className="cursor-pointer">I agree to the </label>
                      <button type="button" onClick={() => setIsTermsOpen(true)} className="text-blue-600 hover:underline font-bold cursor-pointer">Terms & Conditions</button>
                      <span> and </span>
                      <button type="button" onClick={() => setIsPrivacyOpen(true)} className="text-blue-600 hover:underline font-bold cursor-pointer">Privacy Policy</button>
                      <label htmlFor="terms" className="cursor-pointer">, and confirm my business operates legally.</label>
                    </div>
                  </div>

                  {signupError && <p className="text-red-500 text-sm font-bold">{signupError}</p>}
                  
                  <button type="submit" disabled={isSubmitting || !agreedToTerms} className="w-full bg-black text-white font-bold py-3.5 mt-2 rounded-xl hover:bg-gray-800 transition-colors shadow-md disabled:bg-gray-400">
                    {isSubmitting ? 'Creating Store...' : 'Finish & Launch Store'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* LOGIN MODAL WITH GOOGLE AUTH */}
      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative animate-slide-in">
            <button type="button" onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center font-bold cursor-pointer"><CloseIcon /></button>
            <h2 className="text-2xl font-bold mb-2">Merchant Login</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">Access your store dashboard.</p>
            
            <button onClick={handleGoogleLogin} type="button" className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl mb-4 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.35 7.23 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 11.7s.43 3.58 1.19 5.12l4.09-2.55z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.65 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
              Continue with Google
            </button>

            <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-bold">Or with Email</span><div className="flex-grow border-t border-gray-200"></div></div>

            <form onSubmit={handleLogin} className="space-y-4 mt-2">
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">Email or Business Name</label>
                <input required className="w-full p-3 bg-gray-50 border rounded-xl outline-none font-bold text-sm" value={loginInput} onChange={e => setLoginInput(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700">Password / PIN</label>
                <input required type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 border rounded-xl outline-none font-bold tracking-widest text-sm" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              </div>
              {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
              <button type="submit" disabled={isLoggingIn} className="w-full bg-black text-white font-bold py-3.5 mt-2 rounded-xl hover:bg-gray-800 transition-colors shadow-md disabled:bg-gray-400">
                {isLoggingIn ? 'Verifying...' : 'Go to Portal'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <a href={whatsappForgotPinUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-bold">Forgot Login Details?</a>
            </div>
          </div>
        </div>
      )}

      {/* REMAINDER OF LANDING PAGE (FEATURES, FOOTER, POLICY MODALS) */}
      <section id="features" className="py-20 bg-white px-6"><div className="max-w-6xl mx-auto"><div className="text-center mb-16"><h2 className="text-3xl md:text-4xl font-black mb-4">Enterprise features, zero complexity.</h2><p className="text-gray-500 font-medium text-lg">Everything you need to automate sales, tracking, and delivery logistics.</p></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"><div className="bg-gray-50 p-8 rounded-2xl border border-gray-100"><div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div><h3 className="text-xl font-bold mb-3">Direct to WhatsApp</h3><p className="text-gray-500 font-medium">No clunky dashboards to monitor. Customers browse your catalog and checkout straight into your WhatsApp inbox with a perfectly formatted receipt.</p></div><div className="bg-gray-50 p-8 rounded-2xl border border-gray-100"><div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><h3 className="text-xl font-bold mb-3">Smart GPS Delivery</h3><p className="text-gray-500 font-medium">Set your delivery rate per kilometer. Customers pin their exact location, and the system automatically calculates the distance and adds the delivery fee.</p></div><div className="bg-gray-50 p-8 rounded-2xl border border-gray-100"><div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div><h3 className="text-xl font-bold mb-3">Add-ons & Variations</h3><p className="text-gray-500 font-medium">Sell items with multiple options. Add sizes, colors, or extra toppings with dynamic pricing that updates the customer's cart instantly.</p></div><div className="bg-gray-50 p-8 rounded-2xl border border-gray-100"><div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><h3 className="text-xl font-bold mb-3">Analytics Dashboard</h3><p className="text-gray-500 font-medium">Log into your merchant portal to track your total revenue, pending orders, and discover your top-selling products in real time.</p></div><div className="bg-gray-50 p-8 rounded-2xl border border-gray-100"><div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg></div><h3 className="text-xl font-bold mb-3">Your Brand, Your Rules</h3><p className="text-gray-500 font-medium">Customize your storefront with your logo, brand colors, and a premium Hero banner. Make it feel like your own dedicated app.</p></div><div className="bg-gray-50 p-8 rounded-2xl border border-gray-100"><div className="text-gray-800 mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div><h3 className="text-xl font-bold mb-3">Instant QR Codes</h3><p className="text-gray-500 font-medium">Print auto-generated QR codes for your shop, tables, or packaging. Customers just scan to order and pay seamlessly.</p></div></div></div></section>
      <footer className="bg-black text-white py-16 text-center"><div className="max-w-6xl mx-auto px-6"><h2 className="text-2xl font-bold mb-6">Ready to scale your business?</h2><a href={whatsappSalesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors mb-12"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Contact Sales</a><div className="border-t border-gray-800 pt-8 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-400 text-sm font-medium"><div className="flex flex-col items-center gap-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>+234 902 811 6376</span></div><div className="flex flex-col items-center gap-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span>realsolutionpro@outlook.com</span></div><div className="flex flex-col items-center gap-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>33A Olorunsogo Street, Sote<br/>Ibafo, Ogun State</span></div></div><div className="mt-8 flex justify-center gap-4 text-gray-500 text-sm font-medium"><button type="button" onClick={() => setIsTermsOpen(true)} className="hover:text-white transition-colors cursor-pointer">Terms & Conditions</button><span>|</span><button type="button" onClick={() => setIsPrivacyOpen(true)} className="hover:text-white transition-colors cursor-pointer">Privacy Policy</button></div><p className="text-gray-600 text-xs font-medium mt-4">&copy; {new Date().getFullYear()} Crudhub. Powered by SolutionPRO Technologies. All rights reserved.</p></div></footer>
      {isTermsOpen && (<div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative animate-slide-in"><div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl"><h2 className="text-xl font-bold text-gray-900">Terms & Conditions</h2><button type="button" onClick={() => setIsTermsOpen(false)} className="text-gray-400 hover:text-black p-2 bg-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-sm border border-gray-200"><CloseIcon /></button></div><div className="p-6 overflow-y-auto text-gray-600 text-sm space-y-4"><p><strong>1. Acceptance of Terms</strong><br/>By creating a store and using the Crudhub platform, you agree to be bound by these Terms and Conditions.</p><p><strong>2. Description of Service</strong><br/>Crudhub provides merchants with a digital storefront, catalog management, and order routing via WhatsApp. Crudhub is not a party to the transactions between merchants and customers.</p><p><strong>3. Merchant Responsibilities</strong><br/>You are solely responsible for all products listed, pricing, fulfillment of orders, and compliance with all applicable local, state, and national laws. You must not use the platform to sell illegal, counterfeit, or prohibited goods.</p><p><strong>4. Subscription & Fees</strong><br/>Crudhub offers a 14-day free trial. Following the trial period, continued access to the platform requires a paid subscription. Failure to pay may result in suspension of your store.</p><p><strong>5. Limitation of Liability</strong><br/>SolutionPRO Technologies shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the service.</p></div><div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end"><button onClick={() => setIsTermsOpen(false)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors">I Understand</button></div></div></div>)}
      {isPrivacyOpen && (<div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative animate-slide-in"><div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl"><h2 className="text-xl font-bold text-gray-900">Privacy Policy</h2><button type="button" onClick={() => setIsPrivacyOpen(false)} className="text-gray-400 hover:text-black p-2 bg-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-sm border border-gray-200"><CloseIcon /></button></div><div className="p-6 overflow-y-auto text-gray-600 text-sm space-y-4"><p><strong>1. Information We Collect</strong><br/>We collect information you provide directly to us when creating a store, including your business name, email address, phone number, and physical address.</p><p><strong>2. How We Use Your Information</strong><br/>We use this information to provide, maintain, and improve our services, process transactions, and send you technical notices and support messages.</p><p><strong>3. Customer Data</strong><br/>When customers place an order through your store, their name, delivery address, and order details are routed directly to your WhatsApp. Crudhub stores this data temporarily to generate the order, but you (the merchant) are the primary custodian of your customers' data.</p><p><strong>4. Data Security</strong><br/>We implement security measures designed to protect your information from unauthorized access and use. However, no security system is impenetrable.</p><p><strong>5. Contact Us</strong><br/>If you have any questions about this Privacy Policy, please contact us at realsolutionpro@outlook.com.</p></div><div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end"><button onClick={() => setIsPrivacyOpen(false)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors">I Understand</button></div></div></div>)}
      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-in { animation: slide-in 0.2s ease-out forwards; } html { scroll-behavior: smooth; }`}} />
    </div>
  )
}