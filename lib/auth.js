import { supabase } from './supabaseClient';

export async function getCurrentMemberProfile() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, member: null };
  }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('id', user.id)
    .single();

  if (memberError && memberError.code !== 'PGRST116') {
    throw memberError;
  }

  return {
    user,
    member,
  };
}

export function normalizeRole(member) {
  if (!member) {
    return 'member';
  }

  if (member.role === 'admin' || member.role === 'member') {
    return member.role;
  }

  return member.is_admin ? 'admin' : 'member';
}

export function getHomeRouteForRole(role) {
  return role === 'admin' ? '/admin' : '/dashboard';
}

export async function syncRoleSession(role) {
  const fallbackRole = role === 'admin' ? 'admin' : 'member';

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (!accessToken) {
    return fallbackRole;
  }

  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken, role: fallbackRole }),
    });

    const rawPayload = await response.text();
    let payload = null;

    try {
      payload = rawPayload ? JSON.parse(rawPayload) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return payload?.role === 'admin' ? 'admin' : fallbackRole;
    }

    return payload?.role === 'admin' ? 'admin' : 'member';
  } catch {
    return fallbackRole;
  }
}

export async function clearRoleSession() {
  await fetch('/api/session', {
    method: 'DELETE',
  });
}
