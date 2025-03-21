import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASCII Map Editor',
  description: 'A simple editor for creating ASCII maps',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        {children}
      </body>
    </html>
  );
} 