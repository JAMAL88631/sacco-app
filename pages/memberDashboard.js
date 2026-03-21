import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function MemberDashboard() {
  const [member, setMember] = useState(null)
  const [loans, setLoans] = useState([])
  const [transactions, setTransactions] = useState([])
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [loanPurpose, setLoanPurpose] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('=== Starting loadData ===')
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('Auth check:', { user: user?.id, error: userError })

      if (userError) {
        console.error('❌ Auth error:', userError)
        setMessage('🔴 Auth error: ' + userError.message)
        setMessageType('error')
        setLoading(false)
        return
      }

      if (!user) {
        console.log('No user, redirecting to auth')
        router.push('/auth')
        return
      }

      console.log('✅ User authenticated:', user.id)
      setMessage('🔄 Loading your data...')

      // Try to load existing member
      console.log('📋 Attempting to load member record...')
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Member query result:', { 
        success: !memberError, 
        error: memberError?.message,
        code: memberError?.code,
        data: memberData 
      })

      let finalMemberData = memberData

      // If member doesn't exist, create it
      if (!memberData) {
        console.log('⚠️ Member not found, creating new member record...')
        const newMemberData = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || 'Member',
          savings: 0
        }
        console.log('Creating member with data:', newMemberData)
        
        const { data: newMember, error: createError } = await supabase
          .from('members')
          .insert([newMemberData])
          .select()
          .single()

        console.log('Member creation result:', { 
          success: !createError, 
          error: createError?.message,
          code: createError?.code,
          data: newMember 
        })

        if (createError) {
          console.error('❌ Create member error:', createError)
          const errorMsg = `Database issue: ${createError.message}`
          setMessage('🔴 Error: ' + errorMsg)
          setMessageType('error')
          setLoading(false)
          return
        }

        finalMemberData = newMember
      }

      if (finalMemberData) {
        console.log('✅ Member data set:', finalMemberData)
        setMember(finalMemberData)
        setMessage('')
      } else {
        throw new Error('No member data available')
      }

      // Load loans
      console.log('📊 Loading loans...')
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false })

      if (loanError) {
        console.warn('⚠️ Loan load warning:', loanError)
      } else {
        console.log('✅ Loans loaded:', loanData?.length || 0)
        setLoans(loanData || [])
      }

      // Load transactions
      console.log('💰 Loading transactions...')
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false })

      if (transactionError) {
        console.warn('⚠️ Transaction load warning:', transactionError)
      } else {
        console.log('✅ Transactions loaded:', transactionData?.length || 0)
        setTransactions(transactionData || [])
      }

      console.log('=== Data loading complete ===')
    } catch (err) {
      console.error('❌ Unexpected error:', err)
      setMessage('🔴 Error: ' + err.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const deposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setMessage('Enter a valid deposit amount')
      setMessageType('error')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const amount = parseFloat(depositAmount)
      const newSavings = (member.savings || 0) + amount

      await supabase
        .from('members')
        .update({ savings: newSavings })
        .eq('id', member.id)

      await supabase.from('transactions').insert([
        {
          member_id: user.id,
          type: 'deposit',
          amount: amount,
          description: 'Savings deposit'
        }
      ])

      setMember({ ...member, savings: newSavings })
      setMessage(`Successfully deposited KES ${amount.toLocaleString()}`)
      setMessageType('success')
      setDepositAmount('')
      loadData()
    } catch (err) {
      setMessage('Deposit failed: ' + err.message)
      setMessageType('error')
    }
  }

  const withdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setMessage('Enter a valid withdrawal amount')
      setMessageType('error')
      return
    }

    const amount = parseFloat(withdrawAmount)
    if (amount > member.savings) {
      setMessage('Insufficient savings balance')
      setMessageType('error')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const newSavings = member.savings - amount

      await supabase
        .from('members')
        .update({ savings: newSavings })
        .eq('id', member.id)

      await supabase.from('transactions').insert([
        {
          member_id: user.id,
          type: 'withdrawal',
          amount: amount,
          description: 'Savings withdrawal'
        }
      ])

      setMember({ ...member, savings: newSavings })
      setMessage(`Successfully withdrawn KES ${amount.toLocaleString()}`)
      setMessageType('success')
      setWithdrawAmount('')
      loadData()
    } catch (err) {
      setMessage('Withdrawal failed: ' + err.message)
      setMessageType('error')
    }
  }

  const applyLoan = async () => {
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      setMessage('Enter a valid loan amount')
      setMessageType('error')
      return
    }

    if (!loanPurpose) {
      setMessage('Please provide loan purpose')
      setMessageType('error')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('loans').insert([
        {
          member_id: user.id,
          amount: parseFloat(loanAmount),
          purpose: loanPurpose,
          status: 'pending',
          repaid: 0
        }
      ])

      if (error) throw error

      setMessage('Loan application submitted! Awaiting approval.')
      setMessageType('success')
      setLoanAmount('')
      setLoanPurpose('')
      loadData()
    } catch (err) {
      setMessage('Loan application failed: ' + err.message)
      setMessageType('error')
    }
  }

  const repayLoan = async (loanId) => {
    const repayAmount = prompt('Enter repayment amount:')
    if (!repayAmount || parseFloat(repayAmount) <= 0) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const loan = loans.find(l => l.id === loanId)
      const amount = parseFloat(repayAmount)

      if (amount + loan.repaid > loan.amount) {
        setMessage('Repayment exceeds loan amount')
        setMessageType('error')
        return
      }

      const newRepaid = loan.repaid + amount
      const status = newRepaid >= loan.amount ? 'completed' : 'active'

      await supabase
        .from('loans')
        .update({ repaid: newRepaid, status })
        .eq('id', loanId)

      await supabase.from('transactions').insert([
        {
          member_id: user.id,
          type: 'loan_repayment',
          amount: amount,
          description: `Loan repayment`
        }
      ])

      setMessage(`Loan repayment of KES ${amount.toLocaleString()} recorded`)
      setMessageType('success')
      loadData()
    } catch (err) {
      setMessage('Repayment failed: ' + err.message)
      setMessageType('error')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="text-lg font-semibold text-gray-800 mb-4">Loading...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (message && messageType === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{message}</p>
          <button
            onClick={() => {
              setMessage('')
              setMessageType('')
              loadData()
            }}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 mb-2"
          >
            Try Again
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/auth')
            }}
            className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Member Data</h2>
          <p className="text-gray-700 mb-4">Your member profile could not be loaded.</p>
          <button
            onClick={() => {
              setLoading(true)
              loadData()
            }}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 mb-2"
          >
            Reload
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/auth')
            }}
            className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Welcome, {member.name || member.email}
              </h1>
              <p className="text-gray-600">{member.email}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              messageType === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl shadow-lg p-2">
          {['overview', 'savings', 'loans', 'transactions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition capitalize ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Savings Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-gray-600 text-sm font-medium">Total Savings</h3>
              <p className="text-4xl font-bold text-blue-600 mt-2">
                KES {(member.savings || 0).toLocaleString()}
              </p>
              <p className="text-gray-500 text-sm mt-4">Available funds</p>
            </div>

            {/* Active Loans Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-gray-600 text-sm font-medium">Active Loans</h3>
              <p className="text-4xl font-bold text-purple-600 mt-2">
                {loans.filter(l => l.status !== 'completed').length}
              </p>
              <p className="text-gray-500 text-sm mt-4">
                Total: KES {loans.filter(l => l.status !== 'completed').reduce((sum, l) => sum + (l.amount || 0), 0).toLocaleString()}
              </p>
            </div>

            {/* Loan Repayments Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-gray-600 text-sm font-medium">Total Repaid</h3>
              <p className="text-4xl font-bold text-green-600 mt-2">
                KES {loans.reduce((sum, l) => sum + (l.repaid || 0), 0).toLocaleString()}
              </p>
              <p className="text-gray-500 text-sm mt-4">Loan payments made</p>
            </div>
          </div>
        )}

        {/* Savings Tab */}
        {activeTab === 'savings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deposit */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Deposit Savings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={deposit}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Deposit
                </button>
              </div>
            </div>

            {/* Withdraw */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Withdraw Savings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={withdraw}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loans Tab */}
        {activeTab === 'loans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Apply for Loan */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Apply for Loan</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Amount
                  </label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose
                  </label>
                  <select
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select purpose</option>
                    <option value="emergency">Emergency</option>
                    <option value="business">Business</option>
                    <option value="education">Education</option>
                    <option value="medical">Medical</option>
                    <option value="housing">Housing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button
                  onClick={applyLoan}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Apply for Loan
                </button>
              </div>
            </div>

            {/* Active Loans */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Loans</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loans.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No loans yet</p>
                ) : (
                  loans.map(loan => (
                    <div key={loan.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-800">
                            KES {loan.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{loan.purpose || 'Loan'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          loan.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : loan.status === 'approved'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {loan.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>Repaid: KES {(loan.repaid || 0).toLocaleString()} / {loan.amount.toLocaleString()}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${(loan.repaid / loan.amount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      {loan.status !== 'completed' && (
                        <button
                          onClick={() => repayLoan(loan.id)}
                          className="mt-2 w-full bg-blue-500 text-white py-1 rounded text-xs font-semibold hover:bg-blue-600 transition"
                        >
                          Make Payment
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Transaction History</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No transactions yet</p>
              ) : (
                transactions.map((tx, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-200 py-3">
                    <div>
                      <p className="font-semibold text-gray-800 capitalize">{tx.type}</p>
                      <p className="text-xs text-gray-500">{tx.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.type === 'deposit' || tx.type === 'loan_repayment'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'loan_repayment' ? '+' : '-'} KES {tx.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}