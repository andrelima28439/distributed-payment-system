import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'PayFlow - Distributed Payment Processing System',
  description: 'Enterprise-grade distributed payment processing platform with real-time monitoring, fraud detection, and reconciliation.',
  keywords: ['payments', 'processing', 'fraud detection', 'reconciliation', 'fintech'],
  authors: [{ name: 'PayFlow Team' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
