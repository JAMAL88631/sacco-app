import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../components/ToastProvider'
import { getCurrentMemberProfile, getHomeRouteForRole, normalizeRole, syncRoleSession } from '../lib/auth'

export default function AuthPage() {
  const { showToast } = useToast()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { user, member } = await getCurrentMemberProfile()
        if (!user) return

        const role = normalizeRole(member)
        const syncedRole = await syncRoleSession(role)
        router.push(getHomeRouteForRole(syncedRole))
      } catch (error) {
        console.error('Session check error:', error)
      }
    }
    checkUser()
  }, [router])

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!email || !password || !fullName || !phoneNumber) {
      showToast({ type: 'error', title: 'Missing fields', description: 'All fields are required.' })
      setLoading(false)
      return
    }

    if (password.length < 6) {
      showToast({ type: 'error', title: 'Weak password', description: 'Password must be at least 6 characters.' })
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber
          }
        }
      })

      if (error) {
        showToast({ type: 'error', title: 'Sign up failed', description: error.message })
        setLoading(false)
        return
      }

      if (data.user) {
        const { error: insertError } = await supabase.from('members').insert([
          {
            id: data.user.id,
            email: data.user.email || email,
            name: fullName,
            savings: 0,
            role: 'member',
            is_admin: false
          }
        ])

        if (insertError) {
          console.error('Member creation error:', insertError)
          showToast({ type: 'info', title: 'Account created', description: 'Please log in to continue.' })
        } else {
          showToast({ type: 'success', title: 'Account created', description: 'You can now log in to your dashboard.' })
        }

        setEmail('')
        setPassword('')
        setFullName('')
        setPhoneNumber('')
        setTimeout(() => setIsLogin(true), 2000)
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Sign up failed', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!email || !password) {
      showToast({ type: 'error', title: 'Missing credentials', description: 'Email and password are required.' })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        showToast({ type: 'error', title: 'Login failed', description: error.message })
        setLoading(false)
        return
      }

      const { member } = await getCurrentMemberProfile()
      const role = normalizeRole(member)
      const syncedRole = await syncRoleSession(role)

      showToast({ type: 'success', title: 'Login successful', description: 'Redirecting to your dashboard.' })
      setTimeout(() => router.push(getHomeRouteForRole(syncedRole)), 800)
    } catch (err) {
      showToast({ type: 'error', title: 'Login failed', description: err.message })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#102045_42%,#081226_100%)] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-yellow-300" style={{ color: '#fde047' }}>Sacco Space</p>
              <h1 className="mt-5 text-5xl font-black leading-tight text-green-400" style={{ color: '#22c55e' }}>
                Save confidently.
                <br />
                Borrow simply.
              </h1>
              <p className="mt-6 text-lg leading-8 text-yellow-200" style={{ color: '#facc15' }}>
                A cleaner member experience for savings, loans, and day-to-day account activity.
              </p>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-sm text-yellow-200" style={{ color: '#facc15' }}>Access</p>
                  <p className="mt-2 text-2xl font-bold text-green-400" style={{ color: '#22c55e' }}>24/7</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-sm text-yellow-200" style={{ color: '#facc15' }}>Member Tools</p>
                  <p className="mt-2 text-2xl font-bold text-green-400" style={{ color: '#22c55e' }}>4</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-sm text-yellow-200" style={{ color: '#facc15' }}>Secure</p>
                  <p className="mt-2 text-2xl font-bold text-green-400" style={{ color: '#22c55e' }}>Yes</p>
                </div>
              </div>
            </div>
          </section>

          <section className="w-full">
            <div className="rounded-[2rem] border border-white/10 bg-white/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-8">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-950 text-2xl text-blue-100 shadow-lg">
                  S
                </div>
                <h2 className="mt-5 text-3xl font-black text-green-600" style={{ color: '#16a34a' }}>{isLogin ? 'Welcome back' : 'Create account'}</h2>
                <p className="mt-2 text-sm text-yellow-600" style={{ color: '#ca8a04' }}>
                  {isLogin ? 'Sign in to continue to your member dashboard.' : 'Open your member account in a few quick steps.'}
                </p>
              </div>

              <div className="mx-auto mt-8 flex max-w-[16rem] rounded-full bg-slate-100 p-1.5">
                <button
                  onClick={() => {
                    setIsLogin(true)
                  }}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
                    isLogin ? 'bg-sky-300 text-slate-900 shadow-md' : 'text-yellow-700'
                  }`}
                  style={isLogin ? { backgroundColor: '#7dd3fc', color: '#0f172a' } : { color: '#ca8a04' }}
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false)
                  }}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
                    !isLogin ? 'bg-sky-300 text-slate-900 shadow-md' : 'text-yellow-700'
                  }`}
                  style={!isLogin ? { backgroundColor: '#7dd3fc', color: '#0f172a' } : { color: '#ca8a04' }}
                >
                  Sign Up
                </button>
              </div>

              {isLogin ? (
                <form onSubmit={handleLogin} className="mx-auto mt-6 max-w-xs space-y-4">
                  <div className="mx-auto w-64 max-w-full">
                    <label className="block text-center text-sm font-bold leading-none" style={{ color: '#fde047', marginBottom: '2px' }}>Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mx-auto block w-64 max-w-full rounded-full border border-sky-100 bg-white px-4 py-2.5 text-center text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      style={{ marginTop: 0 }}
                      disabled={loading}
                    />
                  </div>

                  <div className="mx-auto w-64 max-w-full">
                    <label className="block text-center text-sm font-bold leading-none" style={{ color: '#fde047', marginBottom: '2px' }}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="mx-auto block w-64 max-w-full rounded-full border border-sky-100 bg-white px-4 py-2.5 text-center text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      style={{ marginTop: 0 }}
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mx-auto block w-64 max-w-full rounded-full bg-sky-300 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-sky-200 disabled:opacity-60"
                    style={{ backgroundColor: '#7dd3fc', color: '#0f172a' }}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="mx-auto mt-6 max-w-xs space-y-4">
                  <div className="mx-auto w-64 max-w-full">
                    <label className="block text-center text-sm font-bold leading-none text-slate-800" style={{ marginBottom: '2px' }}>Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="mx-auto block w-64 max-w-full rounded-full border border-sky-100 bg-white px-4 py-2.5 text-center text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      style={{ marginTop: 0 }}
                      disabled={loading}
                    />
                  </div>

                  <div className="mx-auto w-64 max-w-full">
                    <label className="block text-center text-sm font-bold leading-none" style={{ color: '#fde047', marginBottom: '2px' }}>Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mx-auto block w-64 max-w-full rounded-full border border-sky-100 bg-white px-4 py-2.5 text-center text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      style={{ marginTop: 0 }}
                      disabled={loading}
                    />
                  </div>

                  <div className="mx-auto w-64 max-w-full">
                    <label className="block text-center text-sm font-bold leading-none text-slate-800" style={{ marginBottom: '2px' }}>Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+254710000000"
                      className="mx-auto block w-64 max-w-full rounded-full border border-sky-100 bg-white px-4 py-2.5 text-center text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      style={{ marginTop: 0 }}
                      disabled={loading}
                    />
                  </div>

                  <div className="mx-auto w-64 max-w-full">
                    <label className="block text-center text-sm font-bold leading-none" style={{ color: '#fde047', marginBottom: '2px' }}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="mx-auto block w-64 max-w-full rounded-full border border-sky-100 bg-white px-4 py-2.5 text-center text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      style={{ marginTop: 0 }}
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mx-auto block w-64 max-w-full rounded-full bg-sky-300 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-sky-200 disabled:opacity-60"
                    style={{ backgroundColor: '#7dd3fc', color: '#0f172a' }}
                  >
                    {loading ? 'Creating account...' : 'Sign Up'}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
