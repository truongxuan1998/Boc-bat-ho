import {
  HuiGroup,
  HuiPeriod,
  HuiPeriodPayment,
  HuiSlot,
  ProgressiveHuiMatrix,
  ProgressiveHuiMemberRow,
  ProgressiveHuiCell,
} from '@/types';

/**
 * Tính toán chi tiết cho một kỳ khui hụi mới (hỗ trợ cả Hụi Lũy Tiến Bậc Thang)
 * @param hui Dây hụi
 * @param winnerSlotId Chân hụi hốt kỳ này
 * @param bidAmount Mức thăm / kêu hụi (nếu chơi đấu giá) hoặc 0 (nếu chơi lũy tiến)
 * @param openDate Ngày khui
 */
export function calculateNewHuiPeriod(
  hui: HuiGroup,
  winnerSlotId: string,
  bidAmount: number = 0,
  openDate: string = new Date().toISOString().split('T')[0]
): HuiPeriod {
  const winnerSlot = hui.slots.find((s) => s.id === winnerSlotId);
  if (!winnerSlot) {
    throw new Error('Không tìm thấy chân hụi được chọn');
  }

  const periodNumber = (hui.periods?.length || 0) + 1;
  const payments: HuiPeriodPayment[] = [];
  let totalCollected = 0;
  const interestStep = hui.interestStep || 0;

  // Lặp qua tất cả các chân khác (ngoại trừ chân hốt kỳ này)
  for (const slot of hui.slots) {
    if (slot.id === winnerSlotId) {
      continue; // Người hốt không tự đóng cho mình kỳ này
    }

    let amountToPay = hui.amountPerSlot;

    if (interestStep > 0) {
      // LOGIC HỤI LŨY TIẾN BẬC THANG
      if (slot.isDead) {
        // Chân chết: đã lụm ở kỳ trước, đóng thêm lãi theo khoảng cách số kỳ
        const wonPeriod = slot.wonPeriod || 1;
        const stepCount = Math.max(1, periodNumber - wonPeriod);
        const extraInterest = stepCount * interestStep;
        amountToPay = hui.amountPerSlot + extraInterest;
      } else {
        // Chân sống: đóng tiền gốc cơ bản
        amountToPay = hui.amountPerSlot;
      }
    } else {
      // Hụi thường (nếu có bidAmount)
      if (slot.isDead) {
        amountToPay = hui.amountPerSlot;
      } else {
        amountToPay = Math.max(0, hui.amountPerSlot - bidAmount);
      }
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

  const commissionFee = 0;
  const actualReceived = totalCollected;

  return {
    periodNumber,
    openDate,
    winnerSlotId,
    winnerName: winnerSlot.memberName,
    bidAmount: interestStep > 0 ? (periodNumber - 1) * periodNumber / 2 * interestStep : bidAmount,
    totalCollected,
    commissionFee,
    actualReceived,
    payments,
    isCompleted: false,
  };
}

/**
 * Sinh ma trận tính hụi lũy tiến bậc thang chuẩn 100% theo logic bảng tính Excel
 * @param members Danh sách tên các thành viên (theo thứ tự lụm)
 * @param startMonth Tháng bắt đầu khui (1 - 12)
 * @param interestStep Bước nhảy lãi lũy tiến Δ (Vd: 30.000 đ hoặc 30)
 * @param amountPerSlot Tiền đóng hụi mỗi chân (Vd: 3.000.000 đ). Người lụm sẽ nhận (N-1) * amountPerSlot + lãi
 */
export function generateProgressiveMatrix(
  members: string[],
  startMonth: number = 4,
  interestStep: number = 30000,
  amountPerSlot: number = 3000000
): ProgressiveHuiMatrix {
  const totalMembers = members.length;
  // Số tiền LỤM gốc nhận được từ các thành viên khác: (N - 1) * amountPerSlot
  const basePot = Math.max(0, (totalMembers - 1) * amountPerSlot);

  const months: string[] = [];
  for (let i = 0; i < totalMembers; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    months.push(`THÁNG ${m}`);
  }

  const rows: ProgressiveHuiMemberRow[] = members.map((name, memberIndex) => {
    const turnIndex = memberIndex + 1; // 1-based index (kỳ người này lụm)
    const cells: ProgressiveHuiCell[] = [];
    let wonBonus = 0;
    let totalInterestPaid = 0;
    let totalPaid = 0;

    for (let monthIdx = 0; monthIdx < totalMembers; monthIdx++) {
      const currentPeriod = monthIdx + 1;
      const monthName = months[monthIdx];

      if (currentPeriod < turnIndex) {
        // Chưa tới lượt lụm (Chân sống - ô màu đen)
        // Đóng đúng tiền gốc cơ bản mỗi tháng
        totalPaid += amountPerSlot;
        cells.push({
          monthIndex: monthIdx,
          monthName,
          type: 'ALIVE',
          label: '—',
          interestAmount: 0,
          amountToPayOrReceive: amountPerSlot,
          totalToPay: amountPerSlot,
        });
      } else if (currentPeriod === turnIndex) {
        // Đúng kỳ lụm (Ô màu xanh lá)
        // Tiền lãi nhận thêm = tổng (i * interestStep) từ 1 đến turnIndex-1
        wonBonus = ((turnIndex - 1) * turnIndex) / 2 * interestStep;
        const totalReceived = basePot + wonBonus;
        const label =
          wonBonus > 0
            ? interestStep >= 1000
              ? `LỤM + ${new Intl.NumberFormat('vi-VN').format(wonBonus)} đ`
              : `LỤM+${wonBonus}`
            : 'LỤM';
        cells.push({
          monthIndex: monthIdx,
          monthName,
          type: 'WON',
          label,
          interestAmount: wonBonus,
          amountToPayOrReceive: totalReceived,
          totalReceived,
        });
      } else {
        // Đã lụm ở kỳ trước (Chân chết - ô màu xám)
        // Đóng thêm tiền lãi = (currentPeriod - turnIndex) * interestStep
        const stepCount = currentPeriod - turnIndex;
        const extraInterest = stepCount * interestStep;
        const toPay = amountPerSlot + extraInterest;
        totalInterestPaid += extraInterest;
        totalPaid += toPay;
        const deadLabel =
          interestStep >= 1000
            ? `-${new Intl.NumberFormat('vi-VN').format(extraInterest)} đ`
            : `-${extraInterest}`;
        cells.push({
          monthIndex: monthIdx,
          monthName,
          type: 'DEAD',
          label: deadLabel,
          interestAmount: -extraInterest,
          amountToPayOrReceive: toPay,
          totalToPay: toPay,
        });
      }
    }

    const wonAmount = basePot + wonBonus;
    const netProfit = wonBonus - totalInterestPaid;

    return {
      memberId: `mem_${turnIndex}`,
      memberName: name,
      turnIndex,
      cells,
      wonAmount,
      wonBonus,
      totalInterestPaid,
      totalPaid,
      netProfit,
    };
  });

  return {
    months,
    members: rows,
    interestStep,
    baseAmount: amountPerSlot,
    basePot,
    totalMembers,
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
 * Định dạng tiền tệ VND đồng nhất với ký hiệu ₫
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}
