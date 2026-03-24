import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../components/ToastProvider'
import { getCurrentMemberProfile, getHomeRouteForRole, normalizeRole, syncRoleSession } from '../lib/auth'

function isMissingColumnError(error, columnName) {
  const column = String(columnName || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()
  const isColumnMentioned = message.includes(column) || details.includes(column)
  const looksLikeSchemaError =
    message.includes('does not exist') ||
    details.includes('does not exist') ||
    message.includes('schema cache') ||
    details.includes('schema cache') ||
    message.includes('could not find column') ||
    details.includes('could not find column')

  return isColumnMentioned && looksLikeSchemaError
}

function stripUnsupportedColumns(payload, error) {
  const nextPayload = { ...payload }
  const optionalColumns = ['phone_number', 'role', 'is_admin', 'savings']

  optionalColumns.forEach((column) => {
    if (isMissingColumnError(error, column)) {
      delete nextPayload[column]
    }
  })

  return nextPayload
}

function hasProfileDetails(user, member) {
  const memberName = String(member?.name || '').trim()
  const metadataName = String(user?.user_metadata?.full_name || '').trim()
  const memberPhone = String(member?.phone_number || '').trim()
  const metadataPhone = String(user?.user_metadata?.phone_number || '').trim()

  return Boolean((memberName || metadataName) && (memberPhone || metadataPhone))
}

export default function AuthPage() {
  const { showToast } = useToast()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false)
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
        showToast({ type: 'success', title: 'Account created', description: 'You can now log in to your dashboard.' })
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

      const { user, member } = await getCurrentMemberProfile()
      if (!hasProfileDetails(user, member)) {
        showToast({
          type: 'info',
          title: 'Update profile details',
          description: 'Please update your full name and phone number in the Profile tab.',
        })
      }

      const role = normalizeRole(member)
      const syncedRole = await syncRoleSession(role)

      showToast({ type: 'success', title: 'Login successful', description: 'Redirecting to your dashboard.' })
      setTimeout(() => router.push(getHomeRouteForRole(syncedRole)), 800)
    } catch (err) {
      showToast({ type: 'error', title: 'Login failed', description: err.message })
      setLoading(false)
    }
  }

  const handleCompleteProfile = async (e) => {
    e.preventDefault()
    setLoading(true)

    const trimmedName = fullName.trim()
    const trimmedPhone = phoneNumber.trim()

    if (!trimmedName || !trimmedPhone) {
      showToast({
        type: 'error',
        title: 'Missing details',
        description: 'Full name and phone number are required.',
      })
      setLoading(false)
      return
    }

    try {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession()
      const user = session?.user

      if (authError || !session?.access_token || !user) {
        showToast({
          type: 'error',
          title: 'Session expired',
          description: 'Please log in again.',
        })
        setNeedsProfileCompletion(false)
        setIsLogin(true)
        setLoading(false)
        return
      }

      const response = await fetch('/api/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: session.access_token,
          fullName: trimmedName,
          phoneNumber: trimmedPhone,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update profile details.')
      }

      const { member: updatedMember } = await getCurrentMemberProfile()
      const role = normalizeRole(updatedMember)
      const syncedRole = await syncRoleSession(role)

      showToast({
        type: 'success',
        title: 'Profile updated',
        description: 'Redirecting to your dashboard.',
      })
      setNeedsProfileCompletion(false)
      setTimeout(() => router.push(getHomeRouteForRole(syncedRole)), 700)
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: err.message || 'Could not update profile details.',
      })
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

              {needsProfileCompletion ? (
                <form onSubmit={handleCompleteProfile} className="mx-auto mt-6 max-w-xs space-y-4">
                  <p className="text-center text-sm font-semibold" style={{ color: '#ca8a04' }}>
                    One last step. Add your personal details to continue.
                  </p>

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

                  <button
                    type="submit"
                    disabled={loading}
                    className="mx-auto block w-64 max-w-full rounded-full bg-sky-300 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-sky-200 disabled:opacity-60"
                    style={{ backgroundColor: '#7dd3fc', color: '#0f172a' }}
                  >
                    {loading ? 'Saving details...' : 'Continue'}
                  </button>
                </form>
              ) : isLogin ? (
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
