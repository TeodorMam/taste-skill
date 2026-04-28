"use client";

import { ToastProvider } from "@/components/ToastProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
