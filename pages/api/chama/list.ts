import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuthenticatedUser } from '../../../lib/serverAuth';
import { listMemberChamas } from '../../../lib/chama/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const authState = await requireAuthenticatedUser(req as never);
  if (authState.error) {
    return res.status(authState.error.status).json({ error: authState.error.message });
  }

  try {
    const chamas = await listMemberChamas(authState.user.id);
    return res.status(200).json({ chamas });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Could not load chamas.' });
  }
}
