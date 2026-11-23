import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Bộ nhớ đệm tạm thời (in-memory) lưu 100 logs gần nhất đề phòng khi Supabase chưa tạo bảng
export interface AccessLogItem extends Record<string, unknown> {
  id: string;
  ip: string;
  location: string;
  city?: string;
  region?: string;
  country?: string;
  device: string;
  os: string;
  browser: string;
  screen?: string;
  path?: string;
  referrer?: string;
  userAgent?: string;
  created_at: string;
  [key: string]: unknown;
}

const memoryLogs: AccessLogItem[] = [];

/**
 * Trích xuất IP người dùng từ các header proxy / CDN / Vercel
 */
function extractClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return '127.0.0.1';
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.31.')
  );
}

/**
 * Xác định vị trí địa lý dựa trên header Vercel hoặc GeoIP service
 */
async function resolveLocation(
  ip: string,
  req: NextRequest
): Promise<{ city: string; region: string; country: string; display: string }> {
  // 1. Vercel Geolocation Headers (Miễn phí, cực nhanh khi chạy trên Vercel)
  const vercelCountry = req.headers.get('x-vercel-ip-country');
  const vercelCity = req.headers.get('x-vercel-ip-city');
  const vercelRegion = req.headers.get('x-vercel-ip-country-region');

  if (vercelCountry || vercelCity) {
    const city = vercelCity ? decodeURIComponent(vercelCity) : '';
    const region = vercelRegion ? decodeURIComponent(vercelRegion) : '';
    const country = vercelCountry || '';
    const parts = [city, region, country].filter(Boolean);
    return {
      city,
      region,
      country,
      display: parts.join(', ') || 'Việt Nam',
    };
  }

  // 2. Mạng nội bộ / Localhost
  if (isPrivateIp(ip)) {
    return {
      city: 'Localhost',
      region: 'Nội bộ',
      country: 'VN',
      display: 'Mạng nội bộ (Localhost)',
    };
  }

  // 3. Fallback: tra cứu qua ip-api.com (timeout 1.5s để không làm chậm trang)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        const city = data.city || '';
        const region = data.regionName || '';
        const country = data.country || '';
        const parts = [city, region, country].filter(Boolean);
        return {
          city,
          region,
          country,
          display: parts.join(', ') || 'Việt Nam',
        };
      }
    }
  } catch {
    // Bỏ qua lỗi timeout hoặc mạng
  }

  return {
    city: '',
    region: '',
    country: '',
    display: 'Việt Nam (Ước tính)',
  };
}

/**
 * Phân tích User-Agent thành tên thiết bị, hệ điều hành và trình duyệt dễ đọc
 */
function parseUserAgent(ua: string): { device: string; os: string; browser: string; summary: string } {
  let os = 'Khác';
  let device = 'Máy tính';
  let browser = 'Trình duyệt web';

  if (!ua) {
    return { device: 'Không rõ', os: 'Không rõ', browser: 'Không rõ', summary: 'Không rõ' };
  }

  // Hệ điều hành & Thiết bị
  if (/iPhone/i.test(ua)) {
    device = 'iPhone';
    const match = ua.match(/OS\s+([0-9_]+)/i);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/iPad/i.test(ua)) {
    device = 'iPad';
    os = 'iPadOS';
  } else if (/Android/i.test(ua)) {
    const osMatch = ua.match(/Android\s+([0-9.]+)/i);
    os = osMatch ? `Android ${osMatch[1]}` : 'Android';

    const modelMatch = ua.match(/Android[^;]+;\s*([^;)]+)\s*Build/i);
    if (modelMatch && modelMatch[1]) {
      device = modelMatch[1].trim();
    } else {
      device = 'Thiết bị Android';
    }
  } else if (/Windows NT 10.0/i.test(ua)) {
    os = 'Windows 10/11';
    device = 'PC / Laptop';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
    device = 'PC';
  } else if (/Macintosh/i.test(ua)) {
    os = 'macOS';
    device = 'Mac / MacBook';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    device = 'Máy tính Linux';
  }

  // Trình duyệt
  if (/Zalo/i.test(ua)) {
    browser = 'Zalo App';
  } else if (/FBAN|FBAV/i.test(ua)) {
    browser = 'Facebook In-App';
  } else if (/CocCoc/i.test(ua)) {
    browser = 'Cốc Cốc';
  } else if (/Edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Opera|OPR/i.test(ua)) {
    browser = 'Opera';
  }

  const summary = `${device} (${os}) • ${browser}`;
  return { device, os, browser, summary };
}

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !url.startsWith('http')) return null;
  return createClient(url, key);
}

// -------------------------------------------------------------
// POST: Ghi log lượt truy cập mới
// -------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ip = extractClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';
    const location = await resolveLocation(ip, req);
    const uaInfo = parseUserAgent(userAgent);

    const logEntry: AccessLogItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      ip,
      location: location.display,
      city: location.city,
      region: location.region,
      country: location.country,
      device: uaInfo.device,
      os: uaInfo.os,
      browser: uaInfo.browser,
      screen: body.screen || '',
      path: body.pathname || '/',
      referrer: body.referrer || req.headers.get('referer') || '',
      userAgent,
      created_at: new Date().toISOString(),
    };

    // 1. In ra Server Console (Vercel stdout / terminal)
    console.log(
      `[ACCESS_LOG] ${new Date().toLocaleString('vi-VN')} | IP: ${logEntry.ip} | Vị trí: ${logEntry.location} | Thiết bị: ${uaInfo.summary} | Trang: ${logEntry.path}`
    );

    // 2. Lưu vào in-memory cache
    memoryLogs.unshift(logEntry);
    if (memoryLogs.length > 100) memoryLogs.pop();

    // 3. Thử lưu vào Supabase table `access_logs` nếu có
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('access_logs').insert([
          {
            ip: logEntry.ip,
            location_display: logEntry.location,
            city: logEntry.city,
            region: logEntry.region,
            country: logEntry.country,
            device: logEntry.device,
            os: logEntry.os,
            browser: logEntry.browser,
            screen: logEntry.screen,
            path: logEntry.path,
            user_agent: logEntry.userAgent,
          },
        ]);
      } catch (dbErr) {
        // Không làm gián đoạn nếu bảng chưa được tạo trên Supabase
        console.warn('Lưu vào Supabase access_logs chưa thành công (bảng có thể chưa tạo):', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: logEntry,
    });
  } catch (error) {
    console.error('Lỗi khi ghi log truy cập:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể ghi log' },
      { status: 500 }
    );
  }
}

// -------------------------------------------------------------
// GET: Lấy danh sách 50 lượt truy cập gần nhất để xem trên UI
// -------------------------------------------------------------
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const formatted: AccessLogItem[] = data.map((row) => ({
          id: String(row.id),
          ip: row.ip || '',
          location: row.location_display || row.city || row.country || 'Việt Nam',
          city: row.city,
          region: row.region,
          country: row.country,
          device: row.device || 'Thiết bị',
          os: row.os || 'Hệ điều hành',
          browser: row.browser || 'Trình duyệt',
          screen: row.screen,
          path: row.path,
          created_at: row.created_at,
        }));
        return NextResponse.json({
          success: true,
          source: 'supabase',
          logs: formatted,
        });
      }
    }

    // Nếu Supabase chưa có bảng, trả về in-memory cache
    return NextResponse.json({
      success: true,
      source: 'memory',
      logs: memoryLogs,
    });
  } catch (error) {
    console.error('Lỗi khi đọc danh sách access logs:', error);
    return NextResponse.json({
      success: true,
      source: 'memory',
      logs: memoryLogs,
    });
  }
}
