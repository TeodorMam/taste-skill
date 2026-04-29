"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavCounts } from "@/hooks/useNavCounts";

export function BottomNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const path = usePathname();
  const { inbox, varsler } = useNavCounts(isLoggedIn);

  const items = isLoggedIn
    ? [
        { href: "/browse", label: "Utforsk", icon: SearchIcon, badge: 0 },
        { href: "/varsler", label: "Varsler", icon: BellIcon, badge: varsler },
        { href: "/inbox", label: "Innboks", icon: InboxIcon, badge: inbox },
        { href: "/post", label: "Selg", icon: PlusIcon, badge: 0 },
        { href: "/profil", label: "Profil", icon: UserIcon, badge: 0 },
      ]
    : [
        { href: "/browse", label: "Utforsk", icon: SearchIcon, badge: 0 },
        { href: "/post", label: "Selg", icon: PlusIcon, badge: 0 },
        { href: "/login", label: "Logg inn", icon: UserIcon, badge: 0 },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {items.map((it) => {
          const active =
            path === it.href || (it.href !== "/" && path.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                active ? "text-[#5a6b32]" : "text-stone-500"
              }`}
            >
              <span className="relative">
                <Icon active={active} />
                {it.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {it.badge > 9 ? "9+" : it.badge}
                  </span>
                )}
              </span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function InboxIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
    </svg>
  );
}

function PlusIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
