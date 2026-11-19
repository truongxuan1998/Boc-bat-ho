import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BatHoLoan, HuiGroup } from '@/types';

const SUPABASE_CONFIG_KEY = 'BOC_BAT_HO_SUPABASE_CONFIG';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Lấy cấu hình Supabase từ ENV hoặc LocalStorage
 */
export function getSupabaseConfig(): SupabaseConfig {
  // Ưu tiên ENV
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (envUrl && envKey && envUrl.startsWith('http')) {
    return { url: envUrl, anonKey: envKey };
  }

  // Nếu không có ENV, lấy từ LocalStorage (được người dùng nhập trên giao diện)
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.anonKey) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Lỗi khi đọc cấu hình Supabase từ LocalStorage', e);
    }
  }

  return { url: '', anonKey: '' };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    SUPABASE_CONFIG_KEY,
    JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
  );
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('http'));
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }
  if (cachedClient && lastUrl === config.url && lastKey === config.anonKey) {
    return cachedClient;
  }
  cachedClient = createClient(config.url, config.anonKey);
  lastUrl = config.url;
  lastKey = config.anonKey;
  return cachedClient;
}

// ==========================================
// THAO TÁC DỮ LIỆU ĐÁM MÂY (CLOUD CRUD)
// ==========================================

export async function fetchHuiGroupsFromCloud(): Promise<HuiGroup[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('hui_groups')
      .select('*')
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Lỗi khi tải Dây Hụi từ Supabase:', error.message);
      return null;
    }
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      amountPerSlot: Number(row.amount_per_slot),
      totalSlots: Number(row.total_slots),
      cycle: row.cycle,
      commissionPerPeriod: Number(row.commission_per_period),
      interestStep: row.interest_step !== undefined ? Number(row.interest_step) : 30000,
      startMonth: row.start_month !== undefined ? Number(row.start_month) : 4,
      startDate: row.start_date,
      status: row.status,
      slots: row.slots || [],
      periods: row.periods || [],
      note: row.note,
    }));
  } catch (e) {
    console.warn('Lỗi kết nối Supabase:', e);
    return null;
  }
}

export async function syncHuiGroupToCloud(group: HuiGroup): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('hui_groups').upsert({
      id: group.id,
      name: group.name,
      amount_per_slot: group.amountPerSlot,
      total_slots: group.totalSlots,
      cycle: group.cycle,
      commission_per_period: group.commissionPerPeriod,
      start_date: group.startDate,
      status: group.status,
      slots: group.slots,
      periods: group.periods,
      note: group.note,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('Lỗi khi lưu Dây Hụi lên Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Lỗi kết nối Supabase:', e);
    return false;
  }
}

/**
 * Xóa mềm dây hụi trên Cloud (Soft Delete)
 * Cập nhật status = 'DELETED' để bảo toàn dữ liệu và đồng bộ trạng thái đã xóa về mọi máy
 */
export async function softDeleteHuiGroupFromCloud(groupId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('hui_groups')
      .update({
        status: 'DELETED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupId);

    if (error) {
      console.warn('Lỗi khi xóa mềm Dây Hụi trên Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Lỗi kết nối Supabase:', e);
    return false;
  }
}

export async function fetchBatHoLoansFromCloud(): Promise<BatHoLoan[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('bat_ho_loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Lỗi khi tải Bát Họ từ Supabase:', error.message);
      return null;
    }
    return (data || []).map((row) => ({
      id: row.id,
      customerName: row.customer_name,
      phone: row.phone,
      address: row.address,
      startDate: row.start_date,
      totalAmount: Number(row.total_amount),
      receivedAmount: Number(row.received_amount),
      cutFee: Number(row.cut_fee),
      totalDays: Number(row.total_days),
      dailyAmount: Number(row.daily_amount),
      status: row.status,
      payments: row.payments || [],
      note: row.note,
    }));
  } catch (e) {
    console.warn('Lỗi kết nối Supabase:', e);
    return null;
  }
}

export async function syncBatHoLoanToCloud(loan: BatHoLoan): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('bat_ho_loans').upsert({
      id: loan.id,
      customer_name: loan.customerName,
      phone: loan.phone,
      address: loan.address,
      start_date: loan.startDate,
      total_amount: loan.totalAmount,
      received_amount: loan.receivedAmount,
      cut_fee: loan.cutFee,
      total_days: loan.totalDays,
      daily_amount: loan.dailyAmount,
      status: loan.status,
      payments: loan.payments,
      note: loan.note,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('Lỗi khi lưu Bát Họ lên Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Lỗi kết nối Supabase:', e);
    return false;
  }
}

/**
 * Đăng ký lắng nghe thay đổi thời gian thực (Supabase Realtime)
 * Mỗi khi có máy khác cập nhật tiền hụi hay bát họ, hàm onUpdate sẽ được gọi
 */
export function subscribeToRealtimeChanges(onUpdate: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('boc_bat_ho_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hui_groups' },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bat_ho_loans' },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Tải file ảnh mã QR đã khử trùng lên Supabase Storage bucket 'qr-codes'
 * @param blob Blob ảnh sạch sau khi đã được xác thực và nén
 * @param fileName Tên file trong bucket (ví dụ: hui_123/slot_4.webp)
 * @returns Public URL của ảnh hoặc null nếu chưa có bucket / lỗi
 */
export async function uploadQrCodeToStorage(
  blob: Blob,
  fileName: string
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.storage
      .from('qr-codes')
      .upload(fileName, blob, {
        upsert: true,
        contentType: 'image/webp',
        cacheControl: '3600',
      });

    if (error) {
      console.warn('Lỗi khi tải ảnh lên Supabase Storage:', error.message);
      return null;
    }

    const { data: urlData } = client.storage
      .from('qr-codes')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (e) {
    console.warn('Lỗi kết nối Storage:', e);
    return null;
  }
}
