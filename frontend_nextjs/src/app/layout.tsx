import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MOIL AI: Geo-Spatial Reserve Explorer & Operations Control Room',
  description: 'AI & Space-Tech exploration platform for Manganese reserve identification and dynamic fleet control (Smart India Hackathon).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-[#070b12] text-slate-100 antialiased overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
