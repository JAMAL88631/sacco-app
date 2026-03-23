import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgvnjjgrwqhaonzoipxq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dCxpfTDMRO0AiRsQ5m-v7w_04CnGRYh';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isMissingColumnError(error, columnName) {
  const column = String(columnName || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const mentionsColumn = message.includes(column) || details.includes(column);
  const schemaError =
    message.includes('does not exist') ||
    details.includes('does not exist') ||
    message.includes('schema cache') ||
    details.includes('schema cache') ||
    message.includes('could not find column') ||
    details.includes('could not find column');

  return mentionsColumn && schemaError;
}

function stripUnsupportedColumns(payload, error) {
  const nextPayload = { ...payload };
  const optionalColumns = ['phone_number', 'role', 'is_admin', 'savings'];

  optionalColumns.forEach((column) => {
    if (isMissingColumnError(error, column)) {
      delete nextPayload[column];
    }
  });

  return nextPayload;
}

async function updateMemberWithFallback(client, memberId, payload) {
  let currentPayload = { ...payload };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await client.from('members').update(currentPayload).eq('id', memberId);

    if (!error) {
      return null;
    }

    const nextPayload = stripUnsupportedColumns(currentPayload, error);
    if (Object.keys(nextPayload).length === Object.keys(currentPayload).length) {
      return error;
    }

    currentPayload = nextPayload;
  }

  return new Error('Could not update member profile with current schema.');
}

async function insertMemberWithFallback(client, payload) {
  let currentPayload = { ...payload };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await client.from('members').insert([currentPayload]);

    if (!error) {
      return null;
    }

    const nextPayload = stripUnsupportedColumns(currentPayload, error);
    if (Object.keys(nextPayload).length === Object.keys(currentPayload).length) {
      return error;
    }

    currentPayload = nextPayload;
  }

  return new Error('Could not create member profile with current schema.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { accessToken, fullName, phoneNumber } = req.body || {};

  const trimmedName = String(fullName || '').trim();
  const trimmedPhone = String(phoneNumber || '').trim();

  if (!accessToken) {
    return res.status(401).json({ error: 'Missing access token.' });
  }

  if (!trimmedName || !trimmedPhone) {
    return res.status(400).json({ error: 'Full name and phone number are required.' });
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

  const dataClient = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : authClient;

  try {
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid session.' });
    }

    let memberData = null;
    const { data, error: lookupError } = await dataClient
      .from('members')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (lookupError) {
      return res.status(500).json({ error: lookupError.message || 'Could not load member profile.' });
    }

    memberData = data || null;

    const payload = {
      id: user.id,
      email: memberData?.email || user.email || '',
      name: trimmedName,
      phone_number: trimmedPhone,
      savings: Number(memberData?.savings || 0),
      role: memberData?.role || 'member',
      is_admin: Boolean(memberData?.is_admin || false),
    };

    const writeError = memberData
      ? await updateMemberWithFallback(dataClient, user.id, {
          name: payload.name,
          phone_number: payload.phone_number,
        })
      : await insertMemberWithFallback(dataClient, payload);

    if (writeError) {
      return res.status(500).json({ error: writeError.message || 'Could not save profile details.' });
    }

    if (supabaseServiceRoleKey) {
      const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      try {
        await serviceClient.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata || {}),
            full_name: trimmedName,
            phone_number: trimmedPhone,
          },
        });
      } catch {
        // Non-fatal: profile table is source of truth.
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Could not complete profile.' });
  }
}
