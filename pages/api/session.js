import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgvnjjgrwqhaonzoipxq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dCxpfTDMRO0AiRsQ5m-v7w_04CnGRYh';

function resolveRole(member, requestedRole = 'member') {
  if (member?.role === 'admin' || member?.role === 'member') {
    return member.role;
  }

  if (typeof member?.is_admin === 'boolean') {
    return member.is_admin ? 'admin' : 'member';
  }

  return requestedRole === 'admin' ? 'member' : 'member';
}

function serializeCookie(name, value, maxAge = 60 * 60 * 24 * 7) {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { accessToken, role: requestedRole } = req.body || {};

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token.' });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid session.' });
    }

    let member = null;

    const { data: primaryMember, error: memberError } = await authClient
      .from('members')
      .select('id, role, is_admin')
      .eq('id', user.id)
      .single();

    if (!memberError) {
      member = primaryMember;
    } else if (memberError.code === 'PGRST116') {
      const fallbackMember = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email || 'Member',
        savings: 0,
        role: 'member',
        is_admin: false,
      };

      const { data: insertedMember } = await authClient
        .from('members')
        .upsert([fallbackMember], { onConflict: 'id' })
        .select('id, role, is_admin')
        .single();

      member = insertedMember || { id: user.id, role: 'member', is_admin: false };
    } else {
      const { data: legacyMember } = await authClient
        .from('members')
        .select('id, is_admin')
        .eq('id', user.id)
        .single();

      member = legacyMember || { id: user.id, role: 'member', is_admin: false };
    }

    const role = resolveRole(member, requestedRole);

    res.setHeader('Set-Cookie', [
      serializeCookie('sacco-auth', '1'),
      serializeCookie('sacco-role', role),
      serializeCookie('sacco-user', user.id),
    ]);

    return res.status(200).json({ role, userId: user.id });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', [
      clearCookie('sacco-auth'),
      clearCookie('sacco-role'),
      clearCookie('sacco-user'),
    ]);

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
