import React from 'react'

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      <header className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-tight">Crudhub</span>
          </div>
          <a href="/" className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors">Back to Home</a>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-6 mt-12 bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-black mb-2">Terms and Conditions</h1>
        <p className="text-gray-500 font-medium mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>Welcome to Crudhub, a software-as-a-service platform powered by SolutionPRO Technologies ("we," "our," or "us"). By using our platform, you agree to these Terms and Conditions. Crudhub provides digital storefront and WhatsApp ordering infrastructure for independent retail businesses.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Software Provider Status</h2>
            <p>SolutionPRO Technologies provides the software infrastructure (Crudhub) for merchants to display their products and receive orders via WhatsApp. We are strictly a technology provider. We do not handle logistics, product fulfillment, quality control, or direct payment processing between the merchant and the end-consumer. All disputes regarding orders must be resolved directly between the buyer and the merchant.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Subscriptions and Billing</h2>
            <p>New merchants are granted a 14-day free trial. Upon expiration, continued access to the merchant dashboard and public storefront requires an active subscription. Current subscription rates are ₦1,400 monthly or ₦13,440 yearly. Failure to renew will result in the immediate suspension of the public storefront (the "Kill Switch"). We reserve the right to modify pricing with prior notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Prohibited Usage</h2>
            <p>Merchants are strictly prohibited from using Crudhub to display, sell, or distribute illegal substances, counterfeit goods, unlicensed pharmaceuticals, or any products that violate local, state, or federal laws in their jurisdiction. SolutionPRO Technologies reserves the right to terminate any account found violating these terms without refund.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Contact Information</h2>
            <p>For legal inquiries, support, or billing questions, please contact SolutionPRO Technologies at:</p>
            <ul className="mt-3 space-y-1 font-medium bg-gray-50 p-4 rounded-lg border border-gray-100">
              <li>Address: 33A Olorunsogo Street, Sote, Ibafo, Ogun State, Nigeria</li>
              <li>Phone: +234 902 811 6376</li>
              <li>Email: realsolutionpro@outlook.com</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
