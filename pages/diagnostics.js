import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function DiagnosticsPage() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runDiagnostics()
  }, [])

  const addTest = (name, status, message) => {
    setTests(prev => [...prev, { name, status, message }])
  }

  const runDiagnostics = async () => {
    const results = []

    try {
      // Test 1: Supabase Connection
      console.log('Test 1: Supabase Connection...')
      addTest('Supabase Connection', 'testing', 'Connecting...')
      
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
      const { data: membersCheck, error: membersError } = await supabase
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
      const { data: loansCheck, error: loansError } = await supabase
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
      const { data: txCheck, error: txError } = await supabase
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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md text-center">
          <div className="text-xl font-semibold text-gray-800 mb-4">Running Diagnostics...</div>
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  const allPass = tests.every(t => t.pass)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">SACCO Diagnostics</h1>
          <p className="text-gray-600 mb-6">Database & Connection Status</p>

          <div className="space-y-3">
            {tests.map((test, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border-2 ${
                  test.pass 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-1">
                    {test.pass ? '✅' : '❌'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{test.name}</h3>
                    <p className="text-gray-700 text-sm mt-1">{test.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Status:</h3>
            {allPass ? (
              <div className="text-green-700">
                <p className="font-semibold">✅ All systems operational!</p>
                <p className="text-sm mt-2">Your SACCO app should work. Go to <a href="/" className="underline">home</a> and try logging in.</p>
              </div>
            ) : (
              <div className="text-red-700">
                <p className="font-semibold">❌ Some issues detected</p>
                <p className="text-sm mt-2">Please follow the instructions below:</p>
                <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
                  <li>Go to your Supabase project</li>
                  <li>Run the SQL from SETUP_DATABASE.md in the SQL Editor</li>
                  <li>Make sure all 3 tables exist: members, loans, transactions</li>
                  <li>Create RLS policies for each table</li>
                  <li>Come back here to verify</li>
                </ol>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={runDiagnostics}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              🔄 Re-run Tests
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              ← Back Home
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">📋 Need Help?</h4>
            <p className="text-gray-700 text-sm">
              Open your browser's Developer Tools (F12) and check the Console tab for detailed error messages. Share those error messages for faster debugging.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
