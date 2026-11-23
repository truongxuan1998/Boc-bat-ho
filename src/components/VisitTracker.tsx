'use client';

import { useEffect, useRef } from 'react';

/**
 * Component ngầm tự động gửi thông tin truy cập (IP, vị trí, thiết bị) lên API log
 * khi người dùng vào trang web.
 */
export function VisitTracker() {
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    // Tránh gửi lặp trong React 19 StrictMode (mount 2 lần)
    if (hasLoggedRef.current) return;
    hasLoggedRef.current = true;

    // Giới hạn tần suất ghi log trong cùng một phiên duyệt (5 phút/lần)
    try {
      const lastLogTime = sessionStorage.getItem('BOC_BAT_HO_LAST_LOG_TIME');
      const now = Date.now();
      if (lastLogTime && now - Number(lastLogTime) < 5 * 60 * 1000) {
        // Đã ghi log trong vòng 5 phút qua
        return;
      }
      sessionStorage.setItem('BOC_BAT_HO_LAST_LOG_TIME', String(now));
    } catch {
      // Bỏ qua lỗi sessionStorage nếu bị chặn
    }

    const payload = {
      pathname: window.location.pathname + window.location.search,
      referrer: document.referrer || '',
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      language: navigator.language || '',
    };

    fetch('/api/log-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // Giúp gửi dữ liệu ngầm không chặn luồng render
      keepalive: true,
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          const { ip, location, device, os, browser } = res.data;
          // In ra F12 DevTools Console của người dùng
          console.info(
            `%c[Bốc Bát Họ] 🌐 Lượt truy cập được ghi nhận: %cIP: ${ip} | Vị trí: ${location} | Thiết bị: ${device} (${os}) • ${browser}`,
            'color: #10b981; font-weight: bold;',
            'color: inherit;'
          );
        }
      })
      .catch((err) => {
        console.debug('Lỗi khi gửi visit log:', err);
      });
  }, []);

  return null;
}
