import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function DiagnosticsPage() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const runDiagnostics = useCallback(async () => {
    const results = []
    setLoading(true)

    try {
      // Test 1: Supabase Connection
      console.log('Test 1: Supabase Connection...')
      
      if (supabase) {
        results.push({ test: 'Supabase Connection', pass: true, message: '✅ Supabase client initialized' })
      } else {
        results.push({ test: 'Supabase Connection', pass: false, message: '❌ Supabase client not found' })
      }

      // Test 2: Authentication
      console.log('Test 2: Authentication...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        results.push({ test: 'Authentication', pass: false, message: `❌ Auth error: ${authError.message}` })
      } else if (user) {
        results.push({ test: 'Authentication', pass: true, message: `✅ Logged in as: ${user.email}` })
      } else {
        results.push({ test: 'Authentication', pass: false, message: '❌ Not logged in' })
      }

      // Test 3: Members Table Exists
      console.log('Test 3: Checking members table...')
      const { error: membersError } = await supabase
        .from('members')
        .select('count', { count: 'exact' })
        .limit(1)
      
      if (membersError) {
        results.push({ 
          test: 'Members Table Exists', 
          pass: false, 
          message: `❌ Error: ${membersError.message}` 
        })
      } else {
        results.push({ 
          test: 'Members Table Exists', 
          pass: true, 
          message: '✅ Members table found' 
        })
      }

      // Test 4: Loans Table Exists
      console.log('Test 4: Checking loans table...')
      const { error: loansError } = await supabase
        .from('loans')
        .select('count', { count: 'exact' })
        .limit(1)
      
      if (loansError) {
        results.push({ 
          test: 'Loans Table Exists', 
          pass: false, 
          message: `❌ Error: ${loansError.message}` 
        })
      } else {
        results.push({ 
          test: 'Loans Table Exists', 
          pass: true, 
          message: '✅ Loans table found' 
        })
      }

      // Test 5: Transactions Table Exists
      console.log('Test 5: Checking transactions table...')
      const { error: txError } = await supabase
        .from('transactions')
        .select('count', { count: 'exact' })
        .limit(1)
      
      if (txError) {
        results.push({ 
          test: 'Transactions Table Exists', 
          pass: false, 
          message: `❌ Error: ${txError.message}` 
        })
      } else {
        results.push({ 
          test: 'Transactions Table Exists', 
          pass: true, 
          message: '✅ Transactions table found' 
        })
      }

      // Test 6: Can Read Member Data
      if (user) {
        console.log('Test 6: Reading member data...')
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (memberError && memberError.code === 'PGRST116') {
          results.push({ 
            test: 'Member Data', 
            pass: true, 
            message: '⚠️ No member record yet (will auto-create)' 
          })
        } else if (memberError) {
          results.push({ 
            test: 'Member Data', 
            pass: false, 
            message: `❌ Error: ${memberError.message}` 
          })
        } else {
          results.push({ 
            test: 'Member Data', 
            pass: true, 
            message: `✅ Member found: ${memberData.name}` 
          })
        }
      }

    } catch (err) {
      results.push({ 
        test: 'Unexpected Error', 
        pass: false, 
        message: `❌ ${err.message}` 
      })
    }

    setTests(results)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void runDiagnostics()
    }, 0)

    return () => clearTimeout(timer)
  }, [runDiagnostics])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🔧</div>
          <p className="text-2xl font-bold text-slate-900 mb-2">Running Diagnostics</p>
          <div className="animate-spin w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  const allPass = tests.every(t => t.pass)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="h-1 bg-green-600"></div>
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-black text-green-600">🔍 Diagnostics</h1>
        </div>
      </div>

      <div className="flex-1 w-full px-6 lg:px-8 py-8">
        {/* Tests List */}
        <div className="space-y-4 mb-8">
          {tests.map((test, idx) => (
            <div 
              key={idx} 
              className={`p-4 rounded-lg border ${
                test.pass 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">
                  {test.pass ? '✅' : '❌'}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold ${test.pass ? 'text-green-700' : 'text-red-700'}`}>
                    {test.test}
                  </h3>
                  <p className={`text-sm ${
                    test.pass 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>{test.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Card */}
        <div className={`p-8 rounded-lg border-t-4 mb-8 ${
          allPass 
            ? 'bg-green-50 border-green-600' 
            : 'bg-red-50 border-red-600'
        }`}>
          <h3 className="font-bold text-2xl mb-4 text-slate-900">Status</h3>
          {allPass ? (
            <div>
              <div className="text-6xl mb-4">✅</div>
              <p className="text-green-700 text-xl font-bold mb-2">All systems operational!</p>
              <p className="text-slate-600">
                Your SACCO app is ready to use.{' '}
                <Link href="/" className="text-green-600 hover:text-green-700 underline font-bold">
                  Go to home
                </Link>{' '}
                to manage your savings.
              </p>
            </div>
          ) : (
            <div>
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-red-700 text-xl font-bold mb-4">Some issues detected</p>
              <p className="text-slate-600 mb-3">Please fix the database:</p>
              <ol className="list-decimal list-inside space-y-2 text-slate-600 mb-4">
                <li>Visit your Supabase project dashboard</li>
                <li>Open the SQL Editor</li>
                <li>Run the SQL from SETUP_DATABASE.md</li>
                <li>Verify tables: members, loans, transactions</li>
                <li>Configure Row Level Security (RLS) policies</li>
                <li>Click Re-run Tests</li>
              </ol>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={runDiagnostics}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            🔄 Re-run Tests
          </button>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            🏠 Home
          </button>
          <button
            onClick={() => router.push('/auth')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            🔐 Login
          </button>
        </div>

        {/* Help Card */}
        <div className="bg-white border-t-4 border-blue-600 rounded-lg p-8">
          <h4 className="font-bold text-slate-900 text-lg mb-2">💡 Need Help?</h4>
          <p className="text-slate-600 mb-2">
            Press <code className="bg-slate-100 px-2 py-1 rounded text-sm">F12</code> to open Developer Tools and check the Console for error details.
          </p>
          <p className="text-slate-500 text-sm">Share error messages with support for faster assistance.</p>
        </div>
      </div>
    </div>
  )
}
