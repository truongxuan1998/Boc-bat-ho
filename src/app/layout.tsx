import type { Metadata, Viewport } from 'next';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import { AstryxProvider } from '@/components/AstryxProvider';
import { VisitTracker } from '@/components/VisitTracker';

export const metadata: Metadata = {
  title: 'Bốc Bát Họ - Quản Lý Hụi & Bát Họ Thông Minh',
  description: 'Trang web quản lý, thống kê và tính toán hụi, bát họ, dòng tiền chính xác và hiện đại nhất.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f5f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0f141c' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('BOC_BAT_HO_THEME_MODE');
                  var isDark = mode === 'dark' || (!mode && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  var theme = isDark ? 'dark' : 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.style.backgroundColor = isDark ? '#0f141c' : '#f3f5f9';
                } catch(e) {}
              })();
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                min-height: 100%;
                margin: 0;
                padding: 0;
              }
              html[data-theme="dark"], html[data-theme="dark"] body {
                background-color: #0f141c;
                color-scheme: dark;
              }
              html[data-theme="light"], html[data-theme="light"] body {
                background-color: #f3f5f9;
                color-scheme: light;
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <AstryxProvider>
          <VisitTracker />
          {children}
        </AstryxProvider>
      </body>
    </html>
  );
}
