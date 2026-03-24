import { createServiceClient, requireAdminUser } from '../../../lib/serverAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const authState = await requireAdminUser(req);
  if (authState.error) {
    return res.status(authState.error.status).json({ error: authState.error.message });
  }

  const recipientId = req.body?.recipientId ? String(req.body.recipientId).trim() : null;
  const title = String(req.body?.title || '').trim();
  const body = String(req.body?.body || '').trim();

  if (!title) {
    return res.status(400).json({ error: 'Enter a notification title.' });
  }

  if (!body) {
    return res.status(400).json({ error: 'Enter a notification message.' });
  }

  try {
    const serviceClient = createServiceClient();
    const { error } = await serviceClient.from('notifications').insert([
      {
        created_by: authState.user.id,
        recipient_id: recipientId || null,
        title,
        body,
      },
    ]);

    if (error) {
      throw error;
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Could not send notification.' });
  }
}
