import type { Metadata } from "next";

// Seller pages hold real people's names + listing histories. Public
// enough to show a buyer who they're dealing with, but not something we
// want surfaced in Google (that was showing "Rita" as an aktivbruk.com
// sitelink). noindex applies to every /seller/<id> route without
// changing the client rendering.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
