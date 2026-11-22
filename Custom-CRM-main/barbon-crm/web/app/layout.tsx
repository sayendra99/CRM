import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Barbon CRM — Every relationship, one clear picture',
  description: 'A calmer operating system for growth, built for focused teams.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
