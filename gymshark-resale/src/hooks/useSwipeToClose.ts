"use client";

import { useEffect, useRef, useState } from "react";

// Swipe-down-to-close for bottom sheets. The whole sheet is draggable, not
// just the handle. A drag that starts inside a scrolled list only moves the
// sheet once that list is back at the top, so scrolling the list still works.
// Closes past 100 px, or on a quick flick.
const CLOSE_DISTANCE = 100;
const CLOSE_VELOCITY = 0.4; // px per ms, measured over the last moments of the drag
const START_SLOP = 6;

export function useSwipeToClose(onClose: () => void) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;
    let dy = 0;
    let armed = false;
    let active = false;
    let scroller: HTMLElement | null = null;

    function onStart(e: TouchEvent) {
      const target = e.target as HTMLElement;
      // Sliders and text fields keep their own gestures.
      if (target.closest("input, textarea, select")) {
        armed = false;
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      lastY = t.clientY;
      lastTime = performance.now();
      velocity = 0;
      dy = 0;
      active = false;
      scroller = target.closest<HTMLElement>("[data-sheet-scroll]");
      armed = !scroller || scroller.scrollTop <= 0;
    }

    function onMove(e: TouchEvent) {
      if (!armed) return;
      const t = e.touches[0];
      const moveY = t.clientY - startY;
      const moveX = t.clientX - startX;
      if (!active) {
        if (moveY < -START_SLOP || Math.abs(moveX) > Math.abs(moveY) + START_SLOP) {
          armed = false; // scrolling up or sideways: leave it to the browser
          return;
        }
        if (moveY < START_SLOP) return;
        if (scroller && scroller.scrollTop > 0) {
          armed = false;
          return;
        }
        active = true;
        setDragging(true);
      }
      e.preventDefault();
      dy = Math.max(0, moveY);
      setOffset(dy);
      // Smoothed speed of the most recent movement, so a quick flick at the
      // end closes the sheet even after a slow start.
      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      velocity = 0.6 * ((t.clientY - lastY) / dt) + 0.4 * velocity;
      lastY = t.clientY;
      lastTime = now;
    }

    function onEnd() {
      if (!active) return;
      active = false;
      armed = false;
      setDragging(false);
      if (dy > CLOSE_DISTANCE || (velocity > CLOSE_VELOCITY && dy > 30)) {
        setOffset(sheet!.offsetHeight);
        window.setTimeout(() => onCloseRef.current(), 160);
      } else {
        setOffset(0);
      }
    }

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const sheetStyle: React.CSSProperties = {
    transform: offset ? `translateY(${offset}px)` : undefined,
    transition: dragging ? "none" : "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };
  // The backdrop fades as the sheet is pulled down.
  const backdropStyle: React.CSSProperties = {
    opacity: offset ? Math.max(0, 1 - offset / 400) : undefined,
    transition: dragging ? "none" : "opacity 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  return { sheetRef, sheetStyle, backdropStyle };
}
