import { BatHoLoan, HuiGroup, SystemData } from '@/types';
import {
  isSupabaseConfigured,
  fetchHuiGroupsFromCloud,
  fetchBatHoLoansFromCloud,
  syncHuiGroupToCloud,
  syncBatHoLoanToCloud,
} from './supabaseClient';

const STORAGE_KEY = 'BOC_BAT_HO_DATA_V1';
const CLOUD_SYNC_INITIALIZED_KEY = 'BOC_BAT_HO_CLOUD_INITIALIZED_V1';

export const emptySystemData: SystemData = {
  lastUpdated: new Date().toISOString(),
  huiGroups: [],
  batHoLoans: [],
};

export function loadSystemData(): SystemData {
  if (typeof window === 'undefined') {
    return emptySystemData;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptySystemData;
    }
    const parsed = JSON.parse(raw);
    return {
      huiGroups: parsed.huiGroups || [],
      batHoLoans: parsed.batHoLoans || [],
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (e) {
    console.error('Lỗi khi đọc dữ liệu từ LocalStorage', e);
    return emptySystemData;
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
      if (typeof window !== 'undefined') {
        localStorage.setItem(CLOUD_SYNC_INITIALIZED_KEY, 'true');
      }
      const updatedData: SystemData = {
        huiGroups: cloudHui,
        batHoLoans: cloudBatHo || localData.batHoLoans,
        lastUpdated: new Date().toISOString(),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      }
      return updatedData;
    }

    const isCloudInitialized =
      typeof window !== 'undefined' &&
      localStorage.getItem(CLOUD_SYNC_INITIALIZED_KEY) === 'true';

    // Nếu Cloud trả về rỗng và đã từng khởi tạo Cloud trước đây:
    // Người dùng đã chủ động xóa hết các dây hụi, đồng bộ trạng thái rỗng này vào local
    if (isCloudInitialized && cloudHui && cloudHui.length === 0) {
      const updatedData: SystemData = {
        huiGroups: [],
        batHoLoans: cloudBatHo || localData.batHoLoans,
        lastUpdated: new Date().toISOString(),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      }
      return updatedData;
    }

    // Nếu trên Cloud còn trống và là lần đầu khởi tạo, đồng bộ dữ liệu local lên Cloud
    if (!isCloudInitialized && (localData.huiGroups.length > 0 || localData.batHoLoans.length > 0)) {
      for (const h of localData.huiGroups) {
        await syncHuiGroupToCloud(h);
      }
      for (const b of localData.batHoLoans) {
        await syncBatHoLoanToCloud(b);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(CLOUD_SYNC_INITIALIZED_KEY, 'true');
      }
    }
  } catch (e) {
    console.warn('Lỗi đồng bộ Supabase:', e);
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

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
