import type { SplitEvent, SplitExpense } from '@/types';

export interface MemberBalance extends Record<string, unknown> {
  name: string;
  paid: number; // Tổng tiền người này đã trả trước
  owed: number; // Tổng phần người này phải chịu
  net: number; // paid - owed: dương = được nhận lại, âm = phải trả thêm
}

export interface Transfer extends Record<string, unknown> {
  key: string; // "from|to|amount", đổi số tiền thì khóa đổi theo nên dấu "đã chuyển" cũ tự mất
  from: string;
  to: string;
  amount: number;
}

/**
 * Phần phải chịu của từng người trong một khoản chi.
 * Chia đều: tiền lẻ (đơn vị 1 ₫) dồn cho những người đầu danh sách để tổng luôn khớp.
 */
export function expenseShares(expense: SplitExpense): Record<string, number> {
  const shares: Record<string, number> = {};
  if (expense.splitMode === 'CUSTOM') {
    for (const name of expense.participants) {
      shares[name] = Math.max(0, Math.round(expense.customShares?.[name] ?? 0));
    }
    return shares;
  }
  const n = expense.participants.length;
  if (n === 0) return shares;
  const base = Math.floor(expense.amount / n);
  let remainder = expense.amount - base * n;
  for (const name of expense.participants) {
    shares[name] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return shares;
}

export function computeBalances(event: SplitEvent): MemberBalance[] {
  const map = new Map<string, MemberBalance>();
  const ensure = (name: string) => {
    if (!map.has(name)) map.set(name, { name, paid: 0, owed: 0, net: 0 });
    return map.get(name)!;
  };
  event.members.forEach(ensure);

  for (const expense of event.expenses) {
    ensure(expense.paidBy).paid += expense.amount;
    const shares = expenseShares(expense);
    for (const [name, share] of Object.entries(shares)) {
      ensure(name).owed += share;
    }
  }

  const result = [...map.values()];
  result.forEach((b) => (b.net = b.paid - b.owed));
  return result;
}

/**
 * Gộp thành ít lượt chuyển nhất: người nợ nhiều nhất trả cho người được nhận nhiều nhất, lặp lại.
 * roundTo: làm tròn mỗi lượt chuyển (mặc định 1.000 ₫), lượt nào tròn về 0 thì bỏ.
 */
export function computeTransfers(balances: MemberBalance[], roundTo = 1000): Transfer[] {
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ name: b.name, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ name: b.name, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const exact = Math.min(debtors[i].amount, creditors[j].amount);
    const amount = roundTo > 1 ? Math.round(exact / roundTo) * roundTo : exact;
    if (amount > 0) {
      const from = debtors[i].name;
      const to = creditors[j].name;
      transfers.push({ key: `${from}|${to}|${amount}`, from, to, amount });
    }
    debtors[i].amount -= exact;
    creditors[j].amount -= exact;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transfers;
}

export function eventTotal(event: SplitEvent): number {
  return event.expenses.reduce((sum, e) => sum + e.amount, 0);
}
