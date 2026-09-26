"use client";

import { useSwipeToClose } from "@/hooks/useSwipeToClose";

// Bottom sheet with a backdrop. Swipe down anywhere on the sheet to close it,
// tap the backdrop, or tap the handle. Mark a scrolling list inside with
// `data-sheet-scroll` so it scrolls first and only drags the sheet from the top.
export function BottomSheet({
  onClose,
  closeLabel,
  className = "",
  style,
  children,
}: {
  onClose: () => void;
  closeLabel: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { sheetRef, sheetStyle, backdropStyle } = useSwipeToClose(onClose);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/35" style={backdropStyle} onClick={onClose} />
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[560px] rounded-t-sheet bg-raised ${className}`}
        style={{ ...style, ...sheetStyle }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex h-6 w-full shrink-0 items-end justify-center"
        >
          <span className="block h-1 w-10 rounded-sm bg-[#B3AFA2]" />
        </button>
        {children}
      </div>
    </>
  );
}
