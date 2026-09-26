import Link from "next/link";
import { Icon } from "@/components/Icon";

// "← Tilbake" style link with a drawn arrow instead of the text character.
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-mt-2 inline-flex h-11 items-center gap-2 text-[15px] font-[550] text-ink-2 hover:text-ink">
      <Icon name="pil-v" size={18} />
      {children}
    </Link>
  );
}
