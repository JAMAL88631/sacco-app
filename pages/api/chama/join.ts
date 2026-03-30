import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuthenticatedUser } from '../../../lib/serverAuth';
import { joinChama } from '../../../lib/chama/service';

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
    const result = await joinChama({
      chamaId: String(req.body?.chamaId || '').trim(),
      cycleNumber: Number(req.body?.cycleNumber),
      memberId: authState.user.id,
    });

    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Could not join chama.' });
  }
}
