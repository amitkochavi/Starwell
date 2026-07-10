import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Starwell Deal Hub',
  description: 'MSP / IT acquisition deal-analysis platform',
};

const NAV = [
  ['Deal Database', '/deals'],
  ['Platform', '/platform'],
  ['HoldCo', '/holdco'],
  ['Value Creation', '/value-creation'],
  ['Artifact Library', '/artifacts'],
  ['Settings', '/settings'],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f3f2ef] text-ink">
        <div className="flex">
          <aside className="w-52 shrink-0 bg-panel text-white min-h-screen p-4">
            <div className="font-semibold text-lg mb-6">Starwell Deal Hub</div>
            <nav className="space-y-1">
              {NAV.map(([label, href]) => (
                <Link key={href} href={href} className="block px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/10 hover:text-white">
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
