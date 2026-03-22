export default function AdminNotificationPanel({
  audience,
  onAudienceChange,
  selectedRecipientId,
  onRecipientChange,
  members,
  title,
  onTitleChange,
  body,
  onBodyChange,
  onSend,
  busy,
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: '#16a34a' }}>Send Notification</h2>
      <p className="mt-2 text-sm" style={{ color: '#ca8a04' }}>
        Send a quick alert.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Send To</label>
          <select
            value={audience}
            onChange={(event) => onAudienceChange(event.target.value)}
            className="mx-auto mt-2 block w-full max-w-[14rem] rounded-full border border-slate-200 bg-white px-4 py-2.5 text-center text-sm text-slate-900 shadow-sm outline-none focus:border-sky-300"
          >
            <option value="all">All</option>
            <option value="user">One</option>
          </select>
        </div>

        {audience === 'user' ? (
          <div>
            <label className="block text-sm font-semibold text-slate-700">Person</label>
            <select
              value={selectedRecipientId}
              onChange={(event) => onRecipientChange(event.target.value)}
              className="mx-auto mt-2 block w-full max-w-[14rem] rounded-full border border-slate-200 bg-white px-4 py-2.5 text-center text-sm text-slate-900 shadow-sm outline-none focus:border-sky-300"
            >
              <option value="">Choose</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-semibold text-slate-700">Title</label>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Title"
            className="mx-auto mt-2 block w-full max-w-[14rem] rounded-full border border-slate-200 bg-white px-4 py-2.5 text-center text-sm text-slate-900 shadow-sm outline-none focus:border-sky-300"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">Message</label>
          <textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder="Message"
            rows={3}
            className="mx-auto mt-2 block w-full max-w-[14rem] rounded-3xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-900 shadow-sm outline-none focus:border-sky-300"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onSend}
          disabled={busy}
          className="rounded-2xl border border-sky-200 bg-sky-300 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-sky-200 disabled:opacity-60"
          style={{ backgroundColor: '#7dd3fc', color: '#0f172a', borderColor: '#bae6fd' }}
        >
          {busy ? 'Sending...' : 'Send Notification'}
        </button>
      </div>
    </section>
  );
}
