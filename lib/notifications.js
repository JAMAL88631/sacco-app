import { supabase } from './supabaseClient';

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('Session expired. Please log in again.');
  }

  return accessToken;
}

async function fetchAuthorizedJson(url, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed.');
  }

  return payload;
}

export async function fetchNotificationsForMember(memberId, limit = 25) {
  const { data: notifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('*')
    .or(`recipient_id.is.null,recipient_id.eq.${memberId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (notificationsError) {
    throw notificationsError;
  }

  const notificationIds = (notifications || []).map((notification) => notification.id);

  if (!notificationIds.length) {
    return {
      items: [],
      unreadCount: 0,
    };
  }

  const { data: reads, error: readsError } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('member_id', memberId)
    .in('notification_id', notificationIds);

  if (readsError) {
    throw readsError;
  }

  const readIds = new Set((reads || []).map((read) => read.notification_id));
  const items = notifications.map((notification) => ({
    ...notification,
    isRead: readIds.has(notification.id),
  }));

  return {
    items,
    unreadCount: items.filter((item) => !item.isRead).length,
  };
}

export async function markNotificationRead(notificationId, memberId) {
  const { error } = await supabase
    .from('notification_reads')
    .upsert(
      [
        {
          notification_id: notificationId,
          member_id: memberId,
        },
      ],
      { onConflict: 'notification_id,member_id' }
    );

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsRead(notifications, memberId) {
  const unread = notifications.filter((notification) => !notification.isRead);

  if (!unread.length) {
    return;
  }

  const { error } = await supabase.from('notification_reads').upsert(
    unread.map((notification) => ({
      notification_id: notification.id,
      member_id: memberId,
    })),
    { onConflict: 'notification_id,member_id' }
  );

  if (error) {
    throw error;
  }
}

export async function sendNotification({ createdBy, recipientId, title, body }) {
  await fetchAuthorizedJson('/api/admin/notifications', {
    method: 'POST',
    body: JSON.stringify({
      createdBy,
      recipientId: recipientId || null,
      title: title.trim(),
      body: body.trim(),
    }),
  });
}

export async function fetchMembersForNotifications() {
  const payload = await fetchAuthorizedJson('/api/admin/members', {
    method: 'GET',
  });

  return payload?.members || [];
}
