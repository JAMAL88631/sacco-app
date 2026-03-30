import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuthenticatedUser } from '../../../../lib/serverAuth';
import { getChamaDashboard } from '../../../../lib/chama/service';

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
    const dashboard = await getChamaDashboard({
      chamaId: String(req.query?.id || '').trim(),
      memberId: authState.user.id,
    });

    return res.status(200).json(dashboard);
  } catch (error) {
    const message = (error as Error).message || 'Could not load chama dashboard.';
    const status =
      message.toLowerCase().includes('only chama members') || message.toLowerCase().includes('not found') ? 404 : 500;
    return res.status(status).json({ error: message });
  }
}
