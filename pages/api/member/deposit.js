import {
  createServiceClient,
  requireAuthenticatedUser,
  parsePositiveAmount,
} from '../../../lib/serverAuth';

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
  if (!amount) {
    return res.status(400).json({ error: 'Enter a valid deposit amount.' });
  }

  try {
    const serviceClient = createServiceClient();

    const { data: member, error: memberError } = await serviceClient
      .from('members')
      .select('id, savings')
      .eq('id', authState.user.id)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: 'Member profile not found.' });
    }

    const nextSavings = Number(member.savings || 0) + amount;

    const { error: updateError } = await serviceClient
      .from('members')
      .update({ savings: nextSavings })
      .eq('id', authState.user.id);

    if (updateError) {
      throw updateError;
    }

    const { error: transactionError } = await serviceClient.from('transactions').insert([
      {
        member_id: authState.user.id,
        type: 'deposit',
        amount,
        description: 'Savings deposit',
      },
    ]);

    if (transactionError) {
      throw transactionError;
    }

    return res.status(200).json({ ok: true, savings: nextSavings });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Deposit failed.' });
  }
}
