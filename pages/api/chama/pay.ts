import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuthenticatedUser } from '../../../lib/serverAuth';
import { payChamaContribution } from '../../../lib/chama/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const authState = await requireAuthenticatedUser(req as never);
  if (authState.error) {
    return res.status(authState.error.status).json({ error: authState.error.message });
  }

  try {
    const result = await payChamaContribution({
      chamaId: String(req.body?.chamaId || '').trim(),
      amount: Number(req.body?.amount),
      memberId: authState.user.id,
    });

    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    const message = (error as Error).message || 'Could not post chama payment.';
    const status =
      message.toLowerCase().includes('already paid') || message.toLowerCase().includes('only chama members') ? 400 : 500;
    return res.status(status).json({ error: message });
  }
}
