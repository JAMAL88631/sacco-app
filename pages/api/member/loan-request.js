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
  const purpose = String(req.body?.purpose || '').trim();

  if (!amount) {
    return res.status(400).json({ error: 'Enter a valid loan amount.' });
  }

  if (!purpose) {
    return res.status(400).json({ error: 'Enter a loan purpose.' });
  }

  try {
    const serviceClient = createServiceClient();
    const { error } = await serviceClient.from('loans').insert([
      {
        member_id: authState.user.id,
        amount,
        purpose,
        status: 'pending',
        repaid: 0,
      },
    ]);

    if (error) {
      throw error;
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Loan request failed.' });
  }
}
