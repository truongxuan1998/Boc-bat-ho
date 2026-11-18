// Định nghĩa kiểu dữ liệu cho hệ thống Bốc Bát Họ & Quản Lý Hụi

// 1. CHƠI HỌ / HỤI XOAY VÒNG (ROSCA)
export type HuiCycle = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface HuiSlot extends Record<string, unknown> {
  id: string;
  huiId: string;
  memberName: string;
  memberPhone?: string;
  slotNumber: number; // Chân số 1, 2, 3...
  isDead: boolean; // True: đã hốt/bốc rồi (chân chết), False: chưa hốt (chân sống)
  wonPeriod?: number; // Đã hốt ở kỳ nào
  bidAmount?: number; // Số tiền bỏ thăm/kêu hụi khi hốt
  note?: string;
  [key: string]: unknown;
}

export interface HuiPeriodPayment extends Record<string, unknown> {
  slotId: string;
  memberName: string;
  slotNumber: number;
  amountToPay: number; // Số tiền cần đóng kỳ này
  isPaid: boolean;
  paidAt?: string;
  paymentMethod?: 'TRANSFER' | 'CASH';
  note?: string;
  [key: string]: unknown;
}

export interface HuiPeriod extends Record<string, unknown> {
  periodNumber: number; // Kỳ 1, Kỳ 2...
  openDate: string; // Ngày khui họ
  winnerSlotId: string; // Chân hốt kỳ này
  winnerName: string;
  bidAmount: number; // Mức thăm / kêu hụi (tiền trả lãi)
  totalCollected: number; // Tổng tiền thu được từ các chân khác
  commissionFee: number; // Tiền xâu chủ họ lấy
  actualReceived: number; // Tiền thực lĩnh của người hốt = totalCollected - commissionFee
  payments: HuiPeriodPayment[]; // Trạng thái đóng tiền của từng chân
  isCompleted: boolean;
  [key: string]: unknown;
}

export interface HuiGroup extends Record<string, unknown> {
  id: string;
  name: string; // Vd: Dây 5 triệu tháng - Nhóm Bạn Thân
  amountPerSlot: number; // Tiền chân gốc (Vd: 2.000.000 đ)
  totalSlots: number; // Tổng số chân (Vd: 12 chân = 12 kỳ)
  cycle: HuiCycle; // Chu kỳ mở
  commissionPerPeriod: number; // Tiền xâu mỗi kỳ (Vd: 500.000 đ hoặc tính theo đợt)
  startDate: string; // Ngày bắt đầu
  status: 'ACTIVE' | 'COMPLETED';
  slots: HuiSlot[]; // Danh sách các chân
  periods: HuiPeriod[]; // Lịch sử các kỳ đã khui
  note?: string;
  [key: string]: unknown;
}

// 2. BÁT HỌ NGÀY (TRUYỀN THỐNG "10 ĂN 8", VAY GÓP NGÀY)
export interface DailyInstallmentPayment extends Record<string, unknown> {
  dayIndex: number; // Ngày thứ 1, 2, 3... 50
  date: string; // Ngày thực tế YYYY-MM-DD
  amount: number; // Tiền cần đóng ngày này (Vd: 200.000 đ)
  isPaid: boolean;
  paidAt?: string;
  note?: string;
  [key: string]: unknown;
}

export interface BatHoLoan extends Record<string, unknown> {
  id: string;
  customerName: string; // Tên người bốc bát họ
  phone: string;
  address?: string;
  startDate: string; // Ngày bốc
  totalAmount: number; // Tiền bát họ (Vd: 10.000.000 đ)
  receivedAmount: number; // Tiền thực tế cầm về (Vd: 8.000.000 đ - 10 ăn 8)
  cutFee: number; // Tiền cắt phế ngay lúc bốc (Vd: 2.000.000 đ)
  totalDays: number; // Thời gian góp (Thường là 50 ngày, 40 ngày, 60 ngày)
  dailyAmount: number; // Số tiền đóng mỗi ngày = totalAmount / totalDays (Vd: 200.000 đ/ngày)
  status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'BAD_DEBT';
  payments: DailyInstallmentPayment[];
  note?: string;
  [key: string]: unknown;
}

// 3. TỔNG THỂ HỆ THỐNG
export interface SystemData {
  huiGroups: HuiGroup[];
  batHoLoans: BatHoLoan[];
  lastUpdated: string;
}
