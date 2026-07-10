'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavGroup { g: string; items: [string, string | null][] }

export default function WorkspaceNav({ dealId, groups }: { dealId: string; groups: NavGroup[] }) {
  const path = usePathname();
  return (
    <nav className="bg-white border rounded-lg p-2 text-sm sticky top-4">
      {groups.map((grp) => (
        <div key={grp.g}>
          <div className="text-[10px] uppercase tracking-wide text-neutral-400 px-2 pt-3 pb-1">{grp.g}</div>
          {grp.items.map(([label, slug]) => {
            if (!slug) return <div key={label} className="px-2 py-1.5 rounded-md text-neutral-400 cursor-default">{label}</div>;
            const href = `/deals/${dealId}/${slug}`;
            const active = path === href;
            return (
              <Link key={label} href={href}
                className={`block px-2 py-1.5 rounded-md ${active ? 'bg-blue-50 text-accent font-semibold' : 'text-neutral-600 hover:bg-neutral-100'}`}>
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
