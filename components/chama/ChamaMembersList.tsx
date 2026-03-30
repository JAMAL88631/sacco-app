interface ChamaMembersListProps {
  members: Array<{
    memberId: string;
    name: string;
    email: string;
    cycleNumber: number;
    status: 'paid' | 'pending';
  }>;
}

export default function ChamaMembersList({ members }: ChamaMembersListProps) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <h2 className="text-center text-2xl font-bold text-green-600 sm:text-3xl" style={{ color: '#16a34a' }}>
        Members Rotation
      </h2>
      <div className="mt-6 space-y-3">
        {members.length === 0 ? (
          <p className="text-center text-base" style={{ color: '#ca8a04' }}>
            No members found for this chama yet.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.memberId}
              className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#13284f_0%,#0f1f3f_100%)] p-4 text-left text-white shadow-[0_10px_25px_rgba(2,8,23,0.22)]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold" style={{ color: '#16a34a' }}>
                    {member.name}
                  </p>
                  <p className="text-sm" style={{ color: '#ca8a04' }}>
                    {member.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: '#facc15' }}>
                    Cycle #{member.cycleNumber}
                  </p>
                  <p
                    className="mt-1 text-sm font-semibold"
                    style={{ color: member.status === 'paid' ? '#22c55e' : '#f59e0b' }}
                  >
                    {member.status}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
