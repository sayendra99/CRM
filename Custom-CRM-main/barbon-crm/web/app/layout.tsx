import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Barbon CRM',
  description: 'Authenticated CRM foundation',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
