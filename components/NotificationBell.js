import { Bell, CheckCheck } from 'lucide-react';

function formatNotificationDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString();
}

export default function NotificationBell({
  notifications,
  unreadCount,
  isOpen,
  onToggle,
  onMarkRead,
  onMarkAllRead,
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="relative rounded-2xl border border-sky-200 bg-sky-300 p-3 text-slate-900 shadow-[0_14px_28px_rgba(125,211,252,0.2)] transition hover:bg-sky-200"
        style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-3 w-[min(24rem,85vw)] overflow-hidden rounded-[1.5rem] border border-white/10 bg-white text-slate-900 shadow-[0_22px_60px_rgba(2,8,23,0.28)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div>
              <p className="text-lg font-bold" style={{ color: '#16a34a' }}>Notifications</p>
              <p className="text-sm" style={{ color: '#ca8a04' }}>{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: '#ca8a04' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-slate-100 px-4 py-4 last:border-b-0 ${
                    notification.isRead ? 'bg-white' : 'bg-sky-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold" style={{ color: '#16a34a' }}>
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{notification.body}</p>
                      <p className="mt-2 text-xs font-medium" style={{ color: '#ca8a04' }}>
                        {formatNotificationDate(notification.created_at)}
                      </p>
                    </div>

                    {!notification.isRead ? (
                      <button
                        type="button"
                        onClick={() => onMarkRead(notification.id)}
                        className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white"
                      >
                        Mark read
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Read
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

