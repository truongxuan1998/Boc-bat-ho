import { BatHoLoan, HuiGroup, SystemData } from '@/types';
import { createBatHoLoan } from './batHoCalculator';
import {
  isSupabaseConfigured,
  fetchHuiGroupsFromCloud,
  fetchBatHoLoansFromCloud,
  syncHuiGroupToCloud,
  syncBatHoLoanToCloud,
} from './supabaseClient';

const STORAGE_KEY = 'BOC_BAT_HO_DATA_V1';

export const initialSampleData: SystemData = {
  lastUpdated: new Date().toISOString(),
  huiGroups: [
    {
      id: 'hui_xom_cho',
      name: 'Dây 5 Triệu Tháng - Chị Em Xóm Chợ',
      amountPerSlot: 5000000,
      totalSlots: 10,
      cycle: 'MONTHLY',
      commissionPerPeriod: 500000,
      startDate: '2026-08-15',
      status: 'ACTIVE',
      slots: [
        { id: 's1', huiId: 'hui_xom_cho', slotNumber: 1, memberName: 'Chị Lan (Chủ hụi)', memberPhone: '0901234567', isDead: true, wonPeriod: 1, bidAmount: 600000 },
        { id: 's2', huiId: 'hui_xom_cho', slotNumber: 2, memberName: 'Anh Tuấn', memberPhone: '0912345678', isDead: true, wonPeriod: 2, bidAmount: 450000 },
        { id: 's3', huiId: 'hui_xom_cho', slotNumber: 3, memberName: 'Cô Ba Hàng Cá', memberPhone: '0983456789', isDead: true, wonPeriod: 3, bidAmount: 350000 },
        { id: 's4', huiId: 'hui_xom_cho', slotNumber: 4, memberName: 'Bác Năm Quán Cơm', memberPhone: '0974567890', isDead: false },
        { id: 's5', huiId: 'hui_xom_cho', slotNumber: 5, memberName: 'Chị Hoa Tạp Hóa', memberPhone: '0935678901', isDead: false },
        { id: 's6', huiId: 'hui_xom_cho', slotNumber: 6, memberName: 'Em Linh Tiệm Tóc', memberPhone: '0946789012', isDead: false },
        { id: 's7', huiId: 'hui_xom_cho', slotNumber: 7, memberName: 'Anh Dũng Xe Ôm', memberPhone: '0957890123', isDead: false },
        { id: 's8', huiId: 'hui_xom_cho', slotNumber: 8, memberName: 'Bà Tám Bánh Mì', memberPhone: '0968901234', isDead: false },
        { id: 's9', huiId: 'hui_xom_cho', slotNumber: 9, memberName: 'Chị Thảo Quần Áo', memberPhone: '0929012345', isDead: false },
        { id: 's10', huiId: 'hui_xom_cho', slotNumber: 10, memberName: 'Chú Bảy Cafe', memberPhone: '0910123456', isDead: false },
      ],
      periods: [
        {
          periodNumber: 1,
          openDate: '2026-08-15',
          winnerSlotId: 's1',
          winnerName: 'Chị Lan (Chủ hụi)',
          bidAmount: 600000,
          totalCollected: 39600000,
          commissionFee: 500000,
          actualReceived: 39100000,
          isCompleted: true,
          payments: [
            { slotId: 's2', slotNumber: 2, memberName: 'Anh Tuấn', amountToPay: 4400000, isPaid: true, paidAt: '2026-08-15' },
            { slotId: 's3', slotNumber: 3, memberName: 'Cô Ba Hàng Cá', amountToPay: 4400000, isPaid: true, paidAt: '2026-08-15' },
            { slotId: 's4', slotNumber: 4, memberName: 'Bác Năm Quán Cơm', amountToPay: 4400000, isPaid: true, paidAt: '2026-08-16' },
            { slotId: 's5', slotNumber: 5, memberName: 'Chị Hoa Tạp Hóa', amountToPay: 4400000, isPaid: true, paidAt: '2026-08-15' },
            { slotId: 's6', slotNumber: 6, memberName: 'Em Linh Tiệm Tóc', amountToPay: 4400000, isPaid: true, paidAt: '2026-08-15' },
            { slotId: 's7', slotNumber: 7, memberName: 'Anh Dũng Xe Ôm', amountToPay: 4400000, isPaid: true, paidAt: '2026-08-17' },
            { slotId: 's8', slotNumber: 8, memberName: 'Bà Tám Bánh Mì', amountToPay: 4400000, isPaid: true, paidAt: '2026-08-15' },
            { slotId: 's9', slotNumber: 9, memberName: 'Chị Thảo Quần Áo', amountToPay: 4400000, isPaid: true, paidAt: '2026-08-15' },
            { slotId: 's10', slotNumber: 10, memberName: 'Chú Bảy Cafe', amountToPay: 4400000, isPaid: true, paidAt: '2026-08-15' },
          ],
        },
        {
          periodNumber: 2,
          openDate: '2026-09-15',
          winnerSlotId: 's2',
          winnerName: 'Anh Tuấn',
          bidAmount: 450000,
          totalCollected: 41400000,
          commissionFee: 500000,
          actualReceived: 40900000,
          isCompleted: true,
          payments: [
            { slotId: 's1', slotNumber: 1, memberName: 'Chị Lan (Chủ hụi)', amountToPay: 5000000, isPaid: true, paidAt: '2026-09-15' },
            { slotId: 's3', slotNumber: 3, memberName: 'Cô Ba Hàng Cá', amountToPay: 4550000, isPaid: true, paidAt: '2026-09-15' },
            { slotId: 's4', slotNumber: 4, memberName: 'Bác Năm Quán Cơm', amountToPay: 4550000, isPaid: true, paidAt: '2026-09-16' },
            { slotId: 's5', slotNumber: 5, memberName: 'Chị Hoa Tạp Hóa', amountToPay: 4550000, isPaid: true, paidAt: '2026-09-15' },
            { slotId: 's6', slotNumber: 6, memberName: 'Em Linh Tiệm Tóc', amountToPay: 4550000, isPaid: true, paidAt: '2026-09-15' },
            { slotId: 's7', slotNumber: 7, memberName: 'Anh Dũng Xe Ôm', amountToPay: 4550000, isPaid: true, paidAt: '2026-09-15' },
            { slotId: 's8', slotNumber: 8, memberName: 'Bà Tám Bánh Mì', amountToPay: 4550000, isPaid: true, paidAt: '2026-09-15' },
            { slotId: 's9', slotNumber: 9, memberName: 'Chị Thảo Quần Áo', amountToPay: 4550000, isPaid: true, paidAt: '2026-09-15' },
            { slotId: 's10', slotNumber: 10, memberName: 'Chú Bảy Cafe', amountToPay: 4550000, isPaid: true, paidAt: '2026-09-15' },
          ],
        },
        {
          periodNumber: 3,
          openDate: '2026-10-15',
          winnerSlotId: 's3',
          winnerName: 'Cô Ba Hàng Cá',
          bidAmount: 350000,
          totalCollected: 42550000,
          commissionFee: 500000,
          actualReceived: 42050000,
          isCompleted: true,
          payments: [
            { slotId: 's1', slotNumber: 1, memberName: 'Chị Lan (Chủ hụi)', amountToPay: 5000000, isPaid: true, paidAt: '2026-10-15' },
            { slotId: 's2', slotNumber: 2, memberName: 'Anh Tuấn', amountToPay: 5000000, isPaid: true, paidAt: '2026-10-15' },
            { slotId: 's4', slotNumber: 4, memberName: 'Bác Năm Quán Cơm', amountToPay: 4650000, isPaid: true, paidAt: '2026-10-15' },
            { slotId: 's5', slotNumber: 5, memberName: 'Chị Hoa Tạp Hóa', amountToPay: 4650000, isPaid: true, paidAt: '2026-10-15' },
            { slotId: 's6', slotNumber: 6, memberName: 'Em Linh Tiệm Tóc', amountToPay: 4650000, isPaid: true, paidAt: '2026-10-16' },
            { slotId: 's7', slotNumber: 7, memberName: 'Anh Dũng Xe Ôm', amountToPay: 4650000, isPaid: true, paidAt: '2026-10-15' },
            { slotId: 's8', slotNumber: 8, memberName: 'Bà Tám Bánh Mì', amountToPay: 4650000, isPaid: true, paidAt: '2026-10-15' },
            { slotId: 's9', slotNumber: 9, memberName: 'Chị Thảo Quần Áo', amountToPay: 4650000, isPaid: true, paidAt: '2026-10-15' },
            { slotId: 's10', slotNumber: 10, memberName: 'Chú Bảy Cafe', amountToPay: 4650000, isPaid: false },
          ],
        },
      ],
    },
  ],
  batHoLoans: [
    (() => {
      const loan = createBatHoLoan('Nguyễn Văn Hùng', '0912345678', 10000000, 8000000, 50, '2026-10-01', 'Phường Bến Nghé, Q1');
      for (let i = 0; i < 25; i++) {
        loan.payments[i].isPaid = true;
        loan.payments[i].paidAt = loan.payments[i].date;
      }
      return loan;
    })(),
    (() => {
      const loan = createBatHoLoan('Trần Thị Mai', '0987654321', 20000000, 16000000, 50, '2026-09-20', 'Chợ Tân Bình');
      for (let i = 0; i < 40; i++) {
        loan.payments[i].isPaid = true;
        loan.payments[i].paidAt = loan.payments[i].date;
      }
      return loan;
    })(),
    (() => {
      const loan = createBatHoLoan('Lê Hoàng Nam', '0909887766', 15000000, 12000000, 50, '2026-10-25', 'Quận Gò Vấp');
      for (let i = 0; i < 5; i++) {
        loan.payments[i].isPaid = true;
        loan.payments[i].paidAt = loan.payments[i].date;
      }
      return loan;
    })(),
  ],
};

export function loadSystemData(): SystemData {
  if (typeof window === 'undefined') {
    return initialSampleData;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSampleData));
      return initialSampleData;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi khi đọc dữ liệu từ LocalStorage', e);
    return initialSampleData;
  }
}

/**
 * Đọc dữ liệu đám mây Supabase (nếu có cấu hình), tự động đồng bộ 2 chiều
 */
export async function loadSystemDataWithCloud(): Promise<SystemData> {
  const localData = loadSystemData();
  if (!isSupabaseConfigured()) {
    return localData;
  }

  try {
    const [cloudHui, cloudBatHo] = await Promise.all([
      fetchHuiGroupsFromCloud(),
      fetchBatHoLoansFromCloud(),
    ]);

    // Nếu trên Cloud đã có dữ liệu, dùng dữ liệu Cloud và cache vào LocalStorage
    if (cloudHui && cloudHui.length > 0) {
      const updatedData: SystemData = {
        huiGroups: cloudHui,
        batHoLoans: cloudBatHo || localData.batHoLoans,
        lastUpdated: new Date().toISOString(),
      };
      saveSystemData(updatedData);
      return updatedData;
    }

    // Nếu trên Cloud còn trống, tự động đẩy dữ liệu cục bộ lên Cloud
    if (localData.huiGroups.length > 0 || localData.batHoLoans.length > 0) {
      for (const h of localData.huiGroups) {
        await syncHuiGroupToCloud(h);
      }
      for (const b of localData.batHoLoans) {
        await syncBatHoLoanToCloud(b);
      }
    }
  } catch (e) {
    console.error('Lỗi đồng bộ Supabase:', e);
  }

  return localData;
}

export function saveSystemData(data: SystemData): void {
  if (typeof window === 'undefined') return;
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Đẩy bất đồng bộ lên Supabase nếu có kết nối
    if (isSupabaseConfigured()) {
      data.huiGroups.forEach((h) => syncHuiGroupToCloud(h));
      data.batHoLoans.forEach((b) => syncBatHoLoanToCloud(b));
    }
  } catch (e) {
    console.error('Lỗi khi lưu dữ liệu', e);
  }
}
