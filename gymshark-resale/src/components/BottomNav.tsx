"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavCounts } from "@/hooks/useNavCounts";
import { Icon, type IconName } from "@/components/Icon";

export function BottomNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const path = usePathname();
  const { inbox, varsler, orders } = useNavCounts(isLoggedIn);

  const items = [
    { href: "/varer", label: "Utforsk", icon: "soek" as IconName, badge: 0 },
    { href: isLoggedIn ? "/ordre" : `/logg-inn?next=${encodeURIComponent("/ordre")}`, label: "Ordre", icon: "pakke" as IconName, badge: orders },
    { href: isLoggedIn ? "/meldinger" : `/logg-inn?next=${encodeURIComponent("/meldinger")}`, label: "Innboks", icon: "chat" as IconName, badge: inbox },
    { href: isLoggedIn ? "/selg" : `/logg-inn?next=${encodeURIComponent("/selg")}`, label: "Selg", icon: "selg" as IconName, badge: 0 },
    { href: isLoggedIn ? "/profil" : `/logg-inn?next=${encodeURIComponent("/profil")}`, label: "Profil", icon: "profil" as IconName, badge: varsler },
  ];

  return (
    <nav aria-label="Hovedmeny" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-raised pb-[max(6px,env(safe-area-inset-bottom))] sm:hidden">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {items.map((it) => {
          const active =
            path === it.href || (it.href !== "/" && path.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] leading-none ${
                active ? "font-[650] text-ink" : "font-medium text-ink-3"
              }`}
            >
              {active && <span aria-hidden className="absolute inset-x-[22%] top-0 h-0.5 bg-olive" />}
              <span className="relative">
                <Icon name={it.icon} size={22} strokeWidth={active ? 1.75 : 1.5} />
                {it.badge > 0 && (
                  <span className="count absolute -top-1.5 left-3.5">
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
