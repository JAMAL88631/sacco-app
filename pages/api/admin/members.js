import { createServiceClient, requireAdminUser } from '../../../lib/serverAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const authState = await requireAdminUser(req);
  if (authState.error) {
    return res.status(authState.error.status).json({ error: authState.error.message });
  }

  try {
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('members')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return res.status(200).json({ members: data || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Could not load members.' });
  }
}
