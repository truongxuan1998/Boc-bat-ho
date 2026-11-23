// Định dạng số có dấu chấm phân cách hàng nghìn (chuẩn Việt Nam)
export function formatNumber(val: number): string {
  if (!Number.isFinite(val)) return '';
  return new Intl.NumberFormat('vi-VN').format(val);
}

// Lấy số nguyên từ chuỗi người dùng nhập (bỏ dấu chấm, chữ, khoảng trắng)
export function parseDigits(raw: string): number {
  const clean = raw.replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

// Chuyển YYYY-MM-DD sang DD/MM/YYYY
export function formatDateVi(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Danh sách lựa chọn 12 tháng
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));
