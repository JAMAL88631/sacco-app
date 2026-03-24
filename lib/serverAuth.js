import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgvnjjgrwqhaonzoipxq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dCxpfTDMRO0AiRsQ5m-v7w_04CnGRYh';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function normalizeRole(member) {
  if (!member) {
    return 'member';
  }

  if (member.role === 'admin' || member.role === 'member') {
    return member.role;
  }

  return member.is_admin ? 'admin' : 'member';
}

export function getAccessTokenFromRequest(req) {
  const headerValue = req.headers.authorization || '';
  if (headerValue.startsWith('Bearer ')) {
    return headerValue.slice(7);
  }

  return req.body?.accessToken || '';
}

export function createAuthClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
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
}

export function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireAuthenticatedUser(req) {
  const accessToken = getAccessTokenFromRequest(req);

  if (!accessToken) {
    return { error: { status: 401, message: 'Missing access token.' } };
  }

  const authClient = createAuthClient(accessToken);
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken);

  if (error || !user) {
    return { error: { status: 401, message: 'Invalid session.' } };
  }

  return {
    accessToken,
    authClient,
    user,
  };
}

export async function getMemberRole(authClient, userId) {
  const { data: profile, error } = await authClient
    .from('members')
    .select('id, role, is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeRole(profile);
}

export async function requireAdminUser(req) {
  const authState = await requireAuthenticatedUser(req);
  if (authState.error) {
    return authState;
  }

  const role = await getMemberRole(authState.authClient, authState.user.id);
  if (role !== 'admin') {
    return {
      error: {
        status: 403,
        message: 'Admin access required.',
      },
    };
  }

  return {
    ...authState,
    role,
  };
}

export function parsePositiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}
