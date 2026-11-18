import { BatHoLoan, DailyInstallmentPayment } from '@/types';

/**
 * Tạo một hợp đồng Bát Họ mới (Ví dụ: 10 triệu bốc 8 triệu cầm về, đóng trong 50 ngày)
 */
export function createBatHoLoan(
  customerName: string,
  phone: string,
  totalAmount: number,
  receivedAmount: number,
  totalDays: number = 50,
  startDateStr: string = new Date().toISOString().split('T')[0],
  address?: string,
  note?: string
): BatHoLoan {
  const cutFee = Math.max(0, totalAmount - receivedAmount);
  const dailyAmount = Math.round(totalAmount / totalDays);
  const payments: DailyInstallmentPayment[] = [];

  const startDate = new Date(startDateStr);

  for (let i = 1; i <= totalDays; i++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + (i - 1));
    const dateStr = curDate.toISOString().split('T')[0];

    payments.push({
      dayIndex: i,
      date: dateStr,
      amount: dailyAmount,
      isPaid: false,
    });
  }

  return {
    id: 'batho_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    customerName,
    phone,
    address,
    startDate: startDateStr,
    totalAmount,
    receivedAmount,
    cutFee,
    totalDays,
    dailyAmount,
    status: 'ACTIVE',
    payments,
    note,
  };
}

export interface BatHoStats {
  paidDays: number;
  remainingDays: number;
  paidAmount: number;
  remainingAmount: number;
  progressPercent: number;
  expectedPaidDays: number; // Số ngày lẽ ra phải đóng tính đến hôm nay
  lateDays: number; // Số ngày bị chậm
  isOverdue: boolean;
}

/**
 * Tính toán trạng thái thanh toán và chậm trễ của Bát Họ
 */
export function calculateBatHoStats(loan: BatHoLoan): BatHoStats {
  const paidDays = loan.payments.filter((p) => p.isPaid).length;
  const remainingDays = loan.totalDays - paidDays;
  const paidAmount = paidDays * loan.dailyAmount;
  const remainingAmount = Math.max(0, loan.totalAmount - paidAmount);
  const progressPercent = Math.min(100, Math.round((paidDays / loan.totalDays) * 100));

  // Tính số ngày lẽ ra phải đóng tính từ ngày bốc đến ngày hiện tại
  const start = new Date(loan.startDate).getTime();
  const now = new Date().getTime();
  const diffTime = Math.max(0, now - start);
  const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const expectedPaidDays = Math.min(loan.totalDays, elapsedDays);

  const lateDays = Math.max(0, expectedPaidDays - paidDays);
  const isOverdue = lateDays > 0;

  return {
    paidDays,
    remainingDays,
    paidAmount,
    remainingAmount,
    progressPercent,
    expectedPaidDays,
    lateDays,
    isOverdue,
  };
}
