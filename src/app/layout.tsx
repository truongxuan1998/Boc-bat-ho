import type { Metadata } from 'next';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { AstryxProvider } from '@/components/AstryxProvider';

export const metadata: Metadata = {
  title: 'Bốc Bát Họ - Quản Lý Hụi & Bát Họ Thông Minh',
  description: 'Trang web quản lý, thống kê và tính toán hụi, bát họ, dòng tiền chính xác và hiện đại nhất.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AstryxProvider>{children}</AstryxProvider>
      </body>
    </html>
  );
}
