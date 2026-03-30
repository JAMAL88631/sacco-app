import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-green-50 flex flex-col overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-green-600 to-blue-600"></div>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 md:px-6 lg:px-8 py-4 flex justify-center">
          <div className="w-full flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-3xl">💰</span>
              <div className="text-3xl font-black text-green-600">Western Sacco Union</div>
            </div>
            <Link href="/auth" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-colors duration-200 shadow-sm hover:shadow-md">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 px-4">
        <div className="w-full">
          {/* Hero Section */}
          <section className="py-12 md:py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left - Text Content */}
              <div className="space-y-8">
                <div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-4">
                    Save Smart, Borrow Fair
                  </h1>
                  <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                    Join thousands of members in a community-driven savings cooperative. Deposit safely, borrow flexibly, and grow your wealth together.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link href="/auth" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors duration-200 text-center shadow-md hover:shadow-lg">
                    Start Saving Now
                  </Link>
                  <button className="border-2 border-green-600 text-green-600 hover:bg-green-50 px-8 py-4 rounded-lg font-bold text-lg transition-colors duration-200">
                    Learn More
                  </button>
                </div>
              </div>

              {/* Right - Features Quick View */}
              <div className="space-y-4">
                <div className="bg-white border-l-4 border-green-600 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                  <h3 className="font-bold text-slate-900 mb-2 text-lg">💳 Easy Deposits</h3>
                  <p className="text-slate-600">Save money regularly with flexible deposit options</p>
                </div>
                <div className="bg-white border-l-4 border-blue-600 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                  <h3 className="font-bold text-slate-900 mb-2 text-lg">📊 Smart Loans</h3>
                  <p className="text-slate-600">Borrow at fair rates with simple approval process</p>
                </div>
                <div className="bg-white border-l-4 border-purple-600 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                  <h3 className="font-bold text-slate-900 mb-2 text-lg">👥 Community</h3>
                  <p className="text-slate-600">Grow wealth together with supportive members</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white py-12 md:py-16">
        <div className="px-4">
          <div className="w-full">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="bg-blue-800 border-2 border-blue-700 p-6 md:p-8 rounded-lg">
                <div className="text-4xl md:text-5xl font-black mb-2">1000+</div>
                <p className="text-blue-100 font-semibold">Active Members</p>
              </div>
              <div className="bg-blue-800 border-2 border-blue-700 p-6 md:p-8 rounded-lg">
                <div className="text-4xl md:text-5xl font-black mb-2">5M+</div>
                <p className="text-blue-100 font-semibold">Saved Together</p>
              </div>
              <div className="bg-blue-800 border-2 border-blue-700 p-6 md:p-8 rounded-lg">
                <div className="text-4xl md:text-5xl font-black mb-2">100%</div>
                <p className="text-blue-100 font-semibold">Secure & Trusted</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-slate-50 py-12 md:py-16 lg:py-24 flex-1">
        <div className="px-4">
          <div className="w-full">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 text-center mb-8 md:mb-12">Why Choose Western Sacco Union?</h2>
            
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-white p-6 md:p-8 rounded-lg shadow-md border-t-4 border-green-600 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-xl font-bold text-slate-900 mb-3">Easy Savings Plans</h3>
                <p className="text-slate-600 leading-relaxed">Set up automatic deposits and watch your savings grow with fixed interest rates</p>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-lg shadow-md border-t-4 border-blue-600 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-xl font-bold text-slate-900 mb-3">Flexible Loans</h3>
                <p className="text-slate-600 leading-relaxed">Get loans at competitive rates with flexible repayment terms that fit your budget</p>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-lg shadow-md border-t-4 border-purple-600 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-xl font-bold text-slate-900 mb-3">Transparent & Secure</h3>
                <p className="text-slate-600 leading-relaxed">No hidden fees - all charges are clear and your money is protected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12 md:py-16">
        <div className="w-full px-4 flex justify-center">
          <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-4 md:mb-6">Ready to Join?</h2>
            <p className="text-base md:text-lg mb-6 md:mb-8 text-green-50">Create your account today and start saving with our community</p>
            <Link href="/auth" className="bg-white text-green-600 hover:bg-slate-50 px-8 md:px-10 py-3 md:py-4 rounded-lg font-bold text-base md:text-lg inline-block transition-colors duration-200 shadow-lg hover:shadow-xl">
              Sign Up Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-8 md:py-12">
        <div className="w-full px-4 flex justify-center">
          <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl text-center">
            <p className="mb-2 font-semibold">💰 Western Sacco Union</p>
            <p className="text-sm text-slate-400">&copy; 2024 All rights reserved. Secure • Fair • Community-Driven</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
