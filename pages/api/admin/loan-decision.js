import { createServiceClient, requireAdminUser } from '../../../lib/serverAuth';

function isMissingRejectedAtColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return message.includes('rejected_at') || details.includes('rejected_at');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const authState = await requireAdminUser(req);
  if (authState.error) {
    return res.status(authState.error.status).json({ error: authState.error.message });
  }

  const loanId = String(req.body?.loanId || '').trim();
  const action = String(req.body?.action || '').trim().toLowerCase();

  if (!loanId) {
    return res.status(400).json({ error: 'Loan id is required.' });
  }

  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'Invalid loan action.' });
  }

  try {
    const serviceClient = createServiceClient();
    const { data: loan, error: loanError } = await serviceClient
      .from('loans')
      .select('id, member_id, amount, purpose, status')
      .eq('id', loanId)
      .maybeSingle();

    if (loanError) {
      throw loanError;
    }

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    if (String(loan.status || '').toLowerCase() !== 'pending') {
      return res.status(400).json({ error: 'Only pending loans can be processed.' });
    }

    if (action === 'approve') {
      const { error: updateError } = await serviceClient
        .from('loans')
        .update({ status: 'approved' })
        .eq('id', loan.id)
        .eq('status', 'pending');

      if (updateError) {
        throw updateError;
      }

      const { error: transactionError } = await serviceClient.from('transactions').insert([
        {
          member_id: loan.member_id,
          type: 'loan_disbursement',
          amount: Number(loan.amount || 0),
          description: `Loan disbursement${loan.purpose ? ` - ${loan.purpose}` : ''}`,
        },
      ]);

      if (transactionError) {
        throw transactionError;
      }

      return res.status(200).json({ ok: true, status: 'approved' });
    }

    let { error: rejectError } = await serviceClient
      .from('loans')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      })
      .eq('id', loan.id)
      .eq('status', 'pending');

    if (rejectError && isMissingRejectedAtColumnError(rejectError)) {
      const fallback = await serviceClient
        .from('loans')
        .update({ status: 'rejected' })
        .eq('id', loan.id)
        .eq('status', 'pending');
      rejectError = fallback.error;
    }

    if (rejectError) {
      throw rejectError;
    }

    return res.status(200).json({ ok: true, status: 'rejected' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Could not process loan decision.' });
  }
}
