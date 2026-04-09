import type { Metadata } from 'next';
import { AppProvider } from '@/contexts/AppContext';
import { ToastProvider } from '@/components/common/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Calendar',
  description: '跨端日程待办管理系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AppProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
