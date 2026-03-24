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
    const { data: pendingLoanData, error: pendingLoanError } = await serviceClient
      .from('loans')
      .select('id, member_id, amount, purpose, status, repaid, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (pendingLoanError) {
      throw pendingLoanError;
    }

    const pendingMemberIds = Array.from(
      new Set((pendingLoanData || []).map((loan) => loan.member_id).filter(Boolean))
    );

    let pendingMembersById = new Map();
    if (pendingMemberIds.length > 0) {
      const { data: pendingMembers, error: pendingMembersError } = await serviceClient
        .from('members')
        .select('id, name, email')
        .in('id', pendingMemberIds);

      if (pendingMembersError) {
        throw pendingMembersError;
      }

      pendingMembersById = new Map((pendingMembers || []).map((item) => [item.id, item]));
    }

    const loans = (pendingLoanData || []).map((loan) => ({
      ...loan,
      amount: Number(loan.amount || 0),
      repaid: Number(loan.repaid || 0),
      memberName: pendingMembersById.get(loan.member_id)?.name || 'Member',
      memberEmail: pendingMembersById.get(loan.member_id)?.email || 'No email',
    }));

    return res.status(200).json({ loans });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Could not load pending loans.' });
  }
}
