import {
  createServiceClient,
  requireAuthenticatedUser,
  parsePositiveAmount,
} from '../../../lib/serverAuth';

const LOAN_INTEREST_RATE = 0.1;

function getLoanTotalDue(loan) {
  const principal = Number(loan?.amount || 0);
  return Math.round(principal * (1 + LOAN_INTEREST_RATE));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const authState = await requireAuthenticatedUser(req);
  if (authState.error) {
    return res.status(authState.error.status).json({ error: authState.error.message });
  }

  const amount = parsePositiveAmount(req.body?.amount);
  const loanId = String(req.body?.loanId || '').trim();

  if (!loanId) {
    return res.status(400).json({ error: 'Select a loan first.' });
  }

  if (!amount) {
    return res.status(400).json({ error: 'Enter a valid repayment amount.' });
  }

  try {
    const serviceClient = createServiceClient();
    const { data: loan, error: loanError } = await serviceClient
      .from('loans')
      .select('id, member_id, amount, purpose, status, repaid')
      .eq('id', loanId)
      .eq('member_id', authState.user.id)
      .maybeSingle();

    if (loanError) {
      throw loanError;
    }

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    const status = String(loan.status || '').toLowerCase();
    if (status !== 'approved' && status !== 'active') {
      return res.status(400).json({ error: 'This loan is not repayable.' });
    }

    const outstandingBalance = Math.max(0, getLoanTotalDue(loan) - Number(loan.repaid || 0));
    if (amount > outstandingBalance) {
      return res.status(400).json({
        error: `Repayment cannot exceed outstanding balance of KES ${outstandingBalance.toLocaleString()}.`,
      });
    }

    const nextRepaid = Number(loan.repaid || 0) + amount;
    const nextStatus = nextRepaid >= getLoanTotalDue(loan) ? 'completed' : loan.status;

    const { error: updateError } = await serviceClient
      .from('loans')
      .update({ repaid: nextRepaid, status: nextStatus })
      .eq('id', loan.id)
      .eq('member_id', authState.user.id);

    if (updateError) {
      throw updateError;
    }

    const { error: transactionError } = await serviceClient.from('transactions').insert([
      {
        member_id: authState.user.id,
        type: 'loan_repayment',
        amount,
        description: `Loan repayment${loan.purpose ? ` - ${loan.purpose}` : ''}`,
      },
    ]);

    if (transactionError) {
      throw transactionError;
    }

    return res.status(200).json({ ok: true, repaid: nextRepaid, status: nextStatus });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Could not process repayment.' });
  }
}
