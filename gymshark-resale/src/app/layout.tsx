import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gymshark Resale Oslo",
  description: "Buy and sell Gymshark in Oslo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Gymshark Oslo
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/browse" className="text-neutral-700 hover:text-black">
                Browse
              </Link>
              <Link
                href="/post"
                className="rounded-full bg-black px-3 py-1.5 font-medium text-white hover:bg-neutral-800"
              >
                Post item
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 py-10 text-xs text-neutral-500">
          Gymshark Resale Oslo — a community MVP. Not affiliated with Gymshark.
        </footer>
      </body>
    </html>
  );
}
