"use client";

import * as React from "react";

interface RevealOnScrollProps {
  children: React.ReactNode;
  delay?: number;
  offset?: number;
  className?: string;
}

export function RevealOnScroll({
  children,
  delay = 0,
  offset = 80,
  className,
}: RevealOnScrollProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // Set initial hidden state directly on the DOM element
    el.style.opacity = "0";
    el.style.transform = `translateY(${offset}px) scale(0.88)`;
    el.style.transition = "none";

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Force a reflow so the initial state is painted before we animate
            void el.offsetHeight;
            el.style.transition = `opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 1.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
            el.style.opacity = "1";
            el.style.transform = "translateY(0) scale(1)";
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -5% 0px" },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, offset]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
