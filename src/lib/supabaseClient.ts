import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BatHoLoan, GroupFund, HuiGroup, SplitEvent } from '@/types';

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
    return (data || []).map((row) => {
      let parsedStartMonth = row.start_month !== undefined ? Number(row.start_month) : undefined;
      let parsedInterestStep = row.interest_step !== undefined ? Number(row.interest_step) : undefined;
      let userNote = row.note;

      if (row.note && typeof row.note === 'string' && row.note.startsWith('{')) {
        try {
          const parsed = JSON.parse(row.note);
          if (parsed && typeof parsed === 'object') {
            if (parsed.startMonth !== undefined && parsedStartMonth === undefined) {
              parsedStartMonth = Number(parsed.startMonth);
            }
            if (parsed.interestStep !== undefined && parsedInterestStep === undefined) {
              parsedInterestStep = Number(parsed.interestStep);
            }
            if (parsed.userNote !== undefined) {
              userNote = parsed.userNote;
            }
          }
        } catch {
          // not JSON, keep original note
        }
      }

      return {
        id: row.id,
        name: row.name,
        amountPerSlot: Number(row.amount_per_slot),
        totalSlots: Number(row.total_slots),
        cycle: row.cycle,
        commissionPerPeriod: Number(row.commission_per_period),
        interestStep: parsedInterestStep !== undefined ? parsedInterestStep : 30000,
        startMonth: parsedStartMonth !== undefined ? parsedStartMonth : 4,
        startDate: row.start_date,
        status: row.status,
        slots: row.slots || [],
        periods: row.periods || [],
        note: userNote,
      };
    });
  } catch (e) {
    console.warn('Lỗi kết nối Supabase:', e);
    return null;
  }
}

export async function syncHuiGroupToCloud(group: HuiGroup): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    let metaNote = group.note || '';
    try {
      const meta = {
        userNote: group.note || '',
        startMonth: group.startMonth !== undefined ? group.startMonth : 4,
        interestStep: group.interestStep !== undefined ? group.interestStep : 30000,
      };
      metaNote = JSON.stringify(meta);
    } catch {
      metaNote = group.note || '';
    }

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
      note: metaNote,
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

  // Mỗi bảng mới một kênh riêng: bảng chưa tồn tại cũng không làm hỏng kênh hụi ở trên
  const extraChannels = ['split_events', 'group_funds'].map((table) =>
    client
      .channel(`boc_bat_ho_${table}_realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => onUpdate())
      .subscribe()
  );

  return () => {
    client.removeChannel(channel);
    extraChannels.forEach((c) => client.removeChannel(c));
  };
}

// ==========================================
// BẢNG TÀI LIỆU JSON (chia tiền: split_events, quỹ nhóm: group_funds)
// Bảng chưa được tạo thì chỉ báo một lần rồi bỏ qua, dữ liệu vẫn lưu trên máy
// ==========================================

type Row = Record<string, unknown>;

function createDocumentTable<T extends { id: string }>(
  table: string,
  label: string,
  schemaSection: string,
  toRow: (doc: T) => Row,
  fromRow: (row: Row) => T
) {
  let unavailable = false;
  const markUnavailable = (message: string) => {
    if (!unavailable) {
      console.warn(
        `Chưa đồng bộ được ${label} lên Supabase (hãy chạy ${schemaSection} trong supabase-schema.sql):`,
        message
      );
    }
    unavailable = true;
  };

  return {
    async fetchAll(): Promise<T[] | null> {
      const client = getSupabaseClient();
      if (!client || unavailable) return null;
      try {
        const { data, error } = await client
          .from(table)
          .select('*')
          .neq('status', 'DELETED')
          .order('created_at', { ascending: false });
        if (error) {
          markUnavailable(error.message);
          return null;
        }
        return (data || []).map(fromRow);
      } catch (e) {
        console.warn('Lỗi kết nối Supabase:', e);
        return null;
      }
    },

    async upsert(doc: T): Promise<boolean> {
      const client = getSupabaseClient();
      if (!client || unavailable) return false;
      try {
        const { error } = await client
          .from(table)
          .upsert({ ...toRow(doc), updated_at: new Date().toISOString() });
        if (error) {
          markUnavailable(error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('Lỗi kết nối Supabase:', e);
        return false;
      }
    },

    async softDelete(id: string): Promise<boolean> {
      const client = getSupabaseClient();
      if (!client || unavailable) return false;
      try {
        const { error } = await client
          .from(table)
          .update({ status: 'DELETED', updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) {
          markUnavailable(error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('Lỗi kết nối Supabase:', e);
        return false;
      }
    },
  };
}

const splitEventsTable = createDocumentTable<SplitEvent>(
  'split_events',
  'Chia tiền',
  'phần 8',
  (e) => ({
    id: e.id,
    name: e.name,
    event_date: e.date,
    members: e.members,
    expenses: e.expenses,
    paid_transfers: e.paidTransfers,
    status: e.status,
    created_at: e.createdAt,
  }),
  (row) => ({
    id: row.id as string,
    name: row.name as string,
    date: row.event_date as string,
    members: (row.members as string[]) || [],
    expenses: (row.expenses as SplitEvent['expenses']) || [],
    paidTransfers: (row.paid_transfers as string[]) || [],
    status: row.status as SplitEvent['status'],
    createdAt: row.created_at as string,
  })
);

const groupFundsTable = createDocumentTable<GroupFund>(
  'group_funds',
  'Quỹ nhóm',
  'phần 9',
  (f) => ({
    id: f.id,
    name: f.name,
    members: f.members,
    treasurer: f.treasurer ?? null,
    rounds: f.rounds,
    expenses: f.expenses,
    status: f.status,
    created_at: f.createdAt,
  }),
  (row) => ({
    id: row.id as string,
    name: row.name as string,
    members: (row.members as string[]) || [],
    treasurer: (row.treasurer as string | null) ?? undefined,
    rounds: (row.rounds as GroupFund['rounds']) || [],
    expenses: (row.expenses as GroupFund['expenses']) || [],
    status: row.status as GroupFund['status'],
    createdAt: row.created_at as string,
  })
);

export const fetchSplitEventsFromCloud = splitEventsTable.fetchAll;
export const syncSplitEventToCloud = splitEventsTable.upsert;
export const softDeleteSplitEventFromCloud = splitEventsTable.softDelete;

export const fetchGroupFundsFromCloud = groupFundsTable.fetchAll;
export const syncGroupFundToCloud = groupFundsTable.upsert;
export const softDeleteGroupFundFromCloud = groupFundsTable.softDelete;

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
