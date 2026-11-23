import type { FundRound, GroupFund } from '@/types';

export interface FundSummary {
  collected: number; // Tổng đã thu từ các đợt
  expected: number; // Tổng phải thu nếu mọi người góp đủ
  outstanding: number; // Còn thiếu (chưa góp)
  spent: number; // Tổng đã chi từ quỹ
  balance: number; // Số dư = đã thu − đã chi
}

export interface MemberContribution extends Record<string, unknown> {
  name: string;
  contributed: number; // Đã góp
  owing: number; // Còn thiếu
  unpaidRounds: string[]; // Tên các đợt chưa góp
}

export function roundCollected(round: FundRound): number {
  return round.participants.filter((m) => round.paid[m]).length * round.amountPerMember;
}

export function summarizeFund(fund: GroupFund): FundSummary {
  let collected = 0;
  let expected = 0;
  for (const r of fund.rounds) {
    collected += roundCollected(r);
    expected += r.participants.length * r.amountPerMember;
  }
  const spent = fund.expenses.reduce((s, e) => s + e.amount, 0);
  return {
    collected,
    expected,
    outstanding: expected - collected,
    spent,
    balance: collected - spent,
  };
}

// Mọi người từng có trong quỹ (kể cả người đã rời nhưng còn trong đợt cũ)
export function memberContributions(fund: GroupFund): MemberContribution[] {
  const names = [...fund.members];
  for (const r of fund.rounds) {
    for (const m of r.participants) if (!names.includes(m)) names.push(m);
  }
  return names.map((name) => {
    let contributed = 0;
    let owing = 0;
    const unpaidRounds: string[] = [];
    for (const r of fund.rounds) {
      if (!r.participants.includes(name)) continue;
      if (r.paid[name]) contributed += r.amountPerMember;
      else {
        owing += r.amountPerMember;
        unpaidRounds.push(r.title);
      }
    }
    return { name, contributed, owing, unpaidRounds };
  });
}
