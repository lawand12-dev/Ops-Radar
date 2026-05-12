/**
 * Signature hero backdrop:
 *  - Soft indigo radial mesh, anchored under the product visual
 *  - Thin cyan EKG pulse line drawn across the top edge, looped
 *
 * The EKG shape echoes the brand logo (public/logo.svg) and is the
 * recurring visual signature across the marketing site.
 *
 * Renders as an absolutely-positioned, pointer-events-none layer.
 * Parent must be `relative`.
 */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]"
    >
      {/* Indigo radial mesh — anchored bottom-right, behind the product visual */}
      <div
        className="absolute -right-[10%] top-[10%] h-[820px] w-[820px] rounded-full opacity-[0.35]"
        style={{
          background:
            "radial-gradient(circle at center, var(--color-accent-200) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute -left-[15%] bottom-[-20%] h-[600px] w-[600px] rounded-full opacity-[0.25]"
        style={{
          background:
            "radial-gradient(circle at center, var(--color-accent-100) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
      />

      {/* EKG pulse line — drawn at top, animated forever */}
      <svg
        className="absolute left-0 right-0 top-[64px] h-[40px] w-full"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="ekgFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="15%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Baseline — flat then pulse then flat, repeated tastefully */}
        <path
          d="M 0 30
             L 480 30
             L 500 30 L 510 8 L 520 52 L 530 22 L 540 38 L 560 30
             L 900 30
             L 920 30 L 930 8 L 940 52 L 950 22 L 960 38 L 980 30
             L 1440 30"
          stroke="url(#ekgFade)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: "2000",
            strokeDashoffset: "2000",
            animation: "ekg-draw 8s linear infinite",
          }}
        />
        <style>{`
          @keyframes ekg-draw {
            0%   { stroke-dashoffset: 2000; }
            50%  { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -2000; }
          }
        `}</style>
      </svg>
    </div>
  );
}
