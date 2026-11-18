import { HuiGroup, HuiPeriod, HuiPeriodPayment, HuiSlot } from '@/types';

/**
 * Tính toán chi tiết cho một kỳ khui hụi mới
 * @param hui Dây hụi
 * @param winnerSlotId Chân hụi hốt kỳ này
 * @param bidAmount Mức thăm / kêu hụi (tiền trả lãi của người hốt)
 * @param openDate Ngày khui
 */
export function calculateNewHuiPeriod(
  hui: HuiGroup,
  winnerSlotId: string,
  bidAmount: number,
  openDate: string = new Date().toISOString().split('T')[0]
): HuiPeriod {
  const winnerSlot = hui.slots.find((s) => s.id === winnerSlotId);
  if (!winnerSlot) {
    throw new Error('Không tìm thấy chân hụi được chọn');
  }

  const periodNumber = (hui.periods?.length || 0) + 1;
  const payments: HuiPeriodPayment[] = [];
  let totalCollected = 0;

  // Lặp qua tất cả các chân khác (ngoại trừ chân hốt kỳ này)
  for (const slot of hui.slots) {
    if (slot.id === winnerSlotId) {
      continue; // Người hốt không tự đóng cho mình kỳ này
    }

    let amountToPay = 0;
    if (slot.isDead) {
      // Chân chết (đã hốt ở các kỳ trước): đóng 100% tiền gốc
      amountToPay = hui.amountPerSlot;
    } else {
      // Chân sống (chưa hốt): đóng tiền gốc trừ đi tiền thăm kêu của người hốt
      amountToPay = Math.max(0, hui.amountPerSlot - bidAmount);
    }

    totalCollected += amountToPay;
    payments.push({
      slotId: slot.id,
      memberName: slot.memberName,
      slotNumber: slot.slotNumber,
      amountToPay,
      isPaid: false,
    });
  }

  const commissionFee = hui.commissionPerPeriod || 0;
  const actualReceived = Math.max(0, totalCollected - commissionFee);

  return {
    periodNumber,
    openDate,
    winnerSlotId,
    winnerName: winnerSlot.memberName,
    bidAmount,
    totalCollected,
    commissionFee,
    actualReceived,
    payments,
    isCompleted: false,
  };
}

/**
 * Tính toán thống kê lợi nhuận / lỗ của từng chân trong dây hụi
 */
export interface SlotStatistic extends Record<string, unknown> {
  slotId: string;
  slotNumber: number;
  memberName: string;
  isDead: boolean;
  wonPeriod?: number;
  bidAmount?: number;
  totalPaid: number; // Tổng số tiền đã đóng qua các kỳ
  totalReceived: number; // Tổng số tiền đã nhận về (nếu đã hốt)
  netProfit: number; // Lãi / Lỗ ròng = totalReceived - totalPaid
  [key: string]: unknown;
}

export function calculateSlotStatistics(hui: HuiGroup): SlotStatistic[] {
  const statsMap = new Map<string, SlotStatistic>();

  // Khởi tạo
  for (const slot of hui.slots) {
    statsMap.set(slot.id, {
      slotId: slot.id,
      slotNumber: slot.slotNumber,
      memberName: slot.memberName,
      isDead: slot.isDead,
      wonPeriod: slot.wonPeriod,
      bidAmount: slot.bidAmount,
      totalPaid: 0,
      totalReceived: 0,
      netProfit: 0,
    });
  }

  // Cộng dồn qua từng kỳ đã khui
  for (const period of hui.periods || []) {
    // 1. Cộng tiền thực nhận cho người hốt
    const winnerStat = statsMap.get(period.winnerSlotId);
    if (winnerStat) {
      winnerStat.totalReceived += period.actualReceived;
    }

    // 2. Cộng tiền đã đóng của các chân khác
    for (const payment of period.payments) {
      const slotStat = statsMap.get(payment.slotId);
      if (slotStat) {
        slotStat.totalPaid += payment.amountToPay;
      }
    }
  }

  // Tính lãi ròng
  const result: SlotStatistic[] = [];
  for (const stat of statsMap.values()) {
    stat.netProfit = stat.totalReceived - stat.totalPaid;
    result.push(stat);
  }

  return result.sort((a, b) => a.slotNumber - b.slotNumber);
}

/**
 * Định dạng tiền tệ VND đẹp
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
