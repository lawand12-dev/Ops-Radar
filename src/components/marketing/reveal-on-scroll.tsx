"use client";

import * as React from "react";

interface RevealOnScrollProps {
  children: React.ReactNode;
  /** Extra delay in ms (on top of the in-viewport trigger). */
  delay?: number;
  /** Tweak the slide-up distance (px). Default 28. */
  offset?: number;
  /** Optional className passed through to the wrapping div. */
  className?: string;
}

/**
 * Fades + slides children into view when they enter the viewport.
 * Runs once per element; cleans up the observer after firing.
 *
 * The element is invisible until ~15% has crossed into view, then a
 * single 0.85s ease transition reveals it. Reduced-motion users get
 * the element with no animation.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  offset = 28,
  className,
}: RevealOnScrollProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion — show immediately, no animation.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);

    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${offset}px)`,
        transition: `opacity 0.85s cubic-bezier(0.22, 0.8, 0.22, 1) ${delay}ms, transform 0.85s cubic-bezier(0.22, 0.8, 0.22, 1) ${delay}ms`,
        willChange: visible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
