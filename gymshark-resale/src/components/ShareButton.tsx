"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or not supported - fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  }

  return (
    <button type="button" onClick={onShare} className="tbtn">
      <Icon name="del" size={18} />
      {copied ? "Kopiert!" : "Del"}
    </button>
  );
}
