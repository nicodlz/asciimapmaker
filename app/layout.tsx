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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-100">
        {children}
      </body>
    </html>
  );
} 