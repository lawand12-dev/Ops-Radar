'use client';
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResultsPage;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var image_1 = require("next/image");
var link_1 = require("next/link");
var AnimatedNumber_1 = require("../components/AnimatedNumber");
var RevealSection_1 = require("../components/RevealSection");
var supabase_1 = require("../../lib/supabase");
var button_1 = require("<npm>/components/ui/button");
var badge_1 = require("<npm>/components/ui/badge");
var framer_motion_1 = require("framer-motion");
var FadeInOnScroll_1 = require("<npm>/components/animations/FadeInOnScroll");
var StaggerChildren_1 = require("<npm>/components/animations/StaggerChildren");
var GlowCard_1 = require("<npm>/components/animations/GlowCard");
var TypewriterText_1 = require("<npm>/components/animations/TypewriterText");
var CountUp_1 = require("<npm>/components/animations/CountUp");
var WorkflowDiagram_1 = require("<npm>/components/WorkflowDiagram");
// ─── Constants ────────────────────────────────────────────────────────────────
var UNLOCK_KEY_PREFIX = 'opsradar_blueprint_unlocked';
var BUILD_PRICE = {
    easy: { range: '$1,500 – $2,500', delivery: 'Delivered in 5–7 days' },
    medium: { range: '$2,500 – $4,000', delivery: 'Delivered in 7–14 days' },
    complex: { range: '$4,000 – $7,000', delivery: 'Delivered in 14–21 days' },
};
// ─── Helpers ─────────────────────────────────────────────────────────────────
var DIFF_CONFIG = {
    easy: { label: 'Easy', pill: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
    medium: { label: 'Medium', pill: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
    complex: { label: 'Complex', pill: 'text-red-400', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
};
var RANK_COLORS = {
    1: '#3b82f6', 2: '#06b6d4', 3: '#8b5cf6', 4: '#10b981', 5: '#f59e0b',
};
var rankColor = function (r) { var _a; return (_a = RANK_COLORS[r]) !== null && _a !== void 0 ? _a : '#6b7280'; };
function fmtMoney(n) {
    if (n >= 1000000)
        return "$".concat((n / 1000000).toFixed(1), "M");
    if (n >= 1000)
        return "$".concat((n / 1000).toFixed(0), "K");
    return "$".concat(n.toLocaleString());
}
function getUnlockStorageKey(auditId) {
    return auditId ? "".concat(UNLOCK_KEY_PREFIX, ":").concat(auditId) : UNLOCK_KEY_PREFIX;
}
// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel(_a) {
    var num = _a.num, text = _a.text;
    return (<div className="flex items-center gap-3 mb-3">
      <span className="font-mono text-[10px] font-bold tracking-[3px] text-on-surface-variant/30">{num}</span>
      <span className="text-[10px] font-bold uppercase tracking-[2.5px] text-secondary">{text}</span>
    </div>);
}
// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider() {
    return (<div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(173,198,255,0.2) 30%, rgba(76,215,246,0.15) 70%, transparent 100%)' }}/>);
}
// ─── Lock icon ────────────────────────────────────────────────────────────────
function LockIcon(_a) {
    var _b = _a.size, size = _b === void 0 ? 18 : _b;
    return (<svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="3" y="8" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>);
}
// ─── Locked section ───────────────────────────────────────────────────────────
function LockedSection(_a) {
    var unlocked = _a.unlocked, onUnlock = _a.onUnlock, children = _a.children;
    if (unlocked)
        return <>{children}</>;
    return (<div className="relative rounded-[14px] overflow-hidden">
      <div style={{
            filter: 'blur(5px)',
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: 0.55,
            transition: 'filter 0.5s ease, opacity 0.5s ease',
        }}>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center locked-overlay-animated">
        <div className="flex flex-col items-center gap-3 px-6 py-5 text-center rounded-[16px]" style={{ background: 'rgba(173,198,255,0.04)', border: '1px solid rgba(173,198,255,0.14)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#adc6ff]" style={{ background: 'rgba(173,198,255,0.1)', border: '1px solid rgba(173,198,255,0.2)' }}>
            <LockIcon size={16}/>
          </div>
          <p className="text-[12px] font-semibold text-on-surface/90 max-w-[230px] leading-[1.55]">
            Book a free strategy call to unlock your full implementation blueprint
          </p>
          <button_1.Button onClick={onUnlock} variant="outline" className="px-4 py-2 h-auto rounded-[8px] text-[12px] font-bold text-primary border-primary/22 bg-primary/9 hover:bg-primary/15 hover:text-primary">
            Unlock Full Blueprint →
          </button_1.Button>
        </div>
      </div>
    </div>);
}
function PreviewBanner(_a) {
    var notice = _a.notice;
    return (<RevealSection_1.default>
      <section className="rounded-[20px] overflow-hidden border" style={{ background: 'rgba(173,198,255,0.04)', borderColor: 'rgba(173,198,255,0.15)' }}>
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #adc6ff, #4cd7f6)' }}/>
        <div className="p-6 sm:p-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider mb-4" style={{ background: 'rgba(173,198,255,0.08)', border: '1px solid rgba(173,198,255,0.18)', color: '#adc6ff' }}>
            <LockIcon size={12}/>
            FREE PREVIEW
          </div>
          <h2 className="font-headline font-bold text-[clamp(22px,3vw,32px)] tracking-[-0.025em] text-on-surface mb-2">
            Your high-level diagnosis is ready
          </h2>
          <p className="text-[14px] text-on-surface-variant leading-[1.75] max-w-[640px]">
            {notice !== null && notice !== void 0 ? notice : 'Unlock the full blueprint to get the implementation roadmap, detailed workflow logic, n8n nodes, and step-by-step build guidance.'}
          </p>
        </div>
      </section>
    </RevealSection_1.default>);
}
// ─── Readiness ring ───────────────────────────────────────────────────────────
function ReadinessRing(_a) {
    var score = _a.score;
    var r = 80;
    var circ = 2 * Math.PI * r;
    var _b = (0, react_1.useState)(0), progress = _b[0], setProgress = _b[1];
    var ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var el = ref.current;
        if (!el)
            return;
        var io = new IntersectionObserver(function (_a) {
            var e = _a[0];
            if (e.isIntersecting) {
                setTimeout(function () { return setProgress(score); }, 300);
                io.unobserve(el);
            }
        }, { threshold: 0.4 });
        io.observe(el);
        return function () { return io.disconnect(); };
    }, [score]);
    var offset = circ - (progress / 100) * circ;
    var color = score >= 60 ? '#10b981' : score >= 30 ? '#f59e0b' : '#ef4444';
    var label = score >= 60 ? 'Strong readiness' : score >= 30 ? 'Room to improve' : 'Urgent action needed';
    var ring2 = score >= 60 ? '#10b98140' : score >= 30 ? '#f59e0b40' : '#ef444440';
    return (<div ref={ref} className="flex flex-col items-center gap-5">
      <div className="relative w-[200px] h-[200px]">
        <div className="absolute inset-[-12px] rounded-full opacity-20 blur-[24px] pointer-events-none" style={{ background: color }}/>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 184 184">
          <circle cx="92" cy="92" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12"/>
          <circle cx="92" cy="92" r={r} fill="none" stroke={ring2} strokeWidth="12"/>
          <circle cx="92" cy="92" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="ring-glow" style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.34,1.56,0.64,1)', filter: "drop-shadow(0 0 12px ".concat(color, ") drop-shadow(0 0 4px ").concat(color, ")") }}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="font-headline text-[54px] font-extrabold leading-none tabular-nums" style={{ color: color, textShadow: "0 0 24px ".concat(color, "80") }}>{score}</span>
          <span className="text-[11px] font-semibold tracking-[2px] text-on-surface-variant/40 uppercase">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-headline text-[17px] font-bold text-on-surface">Automation Readiness Score</p>
        <p className="text-[13px] mt-1 font-medium" style={{ color: color }}>{label}</p>
      </div>
    </div>);
}
// ─── Stack rating bar ─────────────────────────────────────────────────────────
function StackRatingBar(_a) {
    var rating = _a.rating;
    var _b = (0, react_1.useState)(0), w = _b[0], setW = _b[1];
    var ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var el = ref.current;
        if (!el)
            return;
        var io = new IntersectionObserver(function (_a) {
            var e = _a[0];
            if (e.isIntersecting) {
                setTimeout(function () { return setW(rating * 10); }, 200);
                io.unobserve(el);
            }
        }, { threshold: 0.5 });
        io.observe(el);
        return function () { return io.disconnect(); };
    }, [rating]);
    var color = rating >= 7 ? '#10b981' : rating >= 5 ? '#3b82f6' : '#f59e0b';
    return (<div ref={ref} className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-on-surface-variant">Current Stack Efficiency</p>
        <p className="font-headline text-[20px] font-bold tabular-nums" style={{ color: color }}>
          {rating}<span className="text-[13px] font-normal text-on-surface-variant">/10</span>
        </p>
      </div>
      <div className="h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{
            width: "".concat(w, "%"),
            background: "linear-gradient(90deg, ".concat(color, "80, ").concat(color, ")"),
            boxShadow: "0 0 12px ".concat(color, "60"),
            transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}/>
      </div>
    </div>);
}
// ─── Labor Arbitrage Section ──────────────────────────────────────────────────
function LaborArbitrageSection(_a) {
    var data = _a.data;
    var stats = [
        { label: 'Estimated Hourly Rate', value: data.estimated_hourly_rate ? "$".concat(data.estimated_hourly_rate, "/hr") : '—', color: '#f59e0b' },
        { label: 'Hours Wasted / Week', value: data.hours_wasted_on_low_value_weekly ? "".concat(data.hours_wasted_on_low_value_weekly, "h") : '—', color: '#f87171' },
        { label: 'Annual Labor Waste', value: data.annual_labor_waste ? fmtMoney(data.annual_labor_waste) : '—', color: '#f87171' },
    ];
    return (<RevealSection_1.default>
      <section>
        <SectionLabel num="04" text="Labor Arbitrage"/>
        <h2 className="font-headline font-bold text-[clamp(22px,3vw,34px)] tracking-[-0.025em] text-on-surface mb-2">
          Where Your Skilled Team Does Low-Value Work
        </h2>
        <p className="text-[14px] text-[rgba(255,255,255,0.38)] mb-6 max-w-[520px]">
          Skilled labor performing repetitive tasks is the most expensive leak in any agency.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {stats.map(function (_a) {
            var label = _a.label, value = _a.value, color = _a.color;
            return (<div key={label} className="p-5 rounded-[16px]" style={{ background: "".concat(color, "08"), border: "1px solid ".concat(color, "20") }}>
              <p className="text-[10px] font-bold uppercase tracking-[2px] mb-3" style={{ color: "".concat(color, "bb") }}>{label}</p>
              <p className="font-headline text-[clamp(22px,3vw,30px)] font-extrabold tabular-nums leading-none" style={{ color: color, textShadow: "0 0 20px ".concat(color, "60") }}>
                {value}
              </p>
            </div>);
        })}
        </div>

        {data.explanation && (<div className="p-5 rounded-[16px] relative overflow-hidden" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[16px] bg-[#f59e0b]"/>
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#f59e0b] mb-2 pl-2">The Math</p>
            <p className="text-[14px] text-on-surface-variant leading-[1.7] pl-2">{data.explanation}</p>
          </div>)}
      </section>
    </RevealSection_1.default>);
}
// ─── Context Switching Section ────────────────────────────────────────────────
function ContextSwitchingSection(_a) {
    var data = _a.data;
    var stats = [
        { label: 'Tools in Stack', value: data.tools_count ? "".concat(data.tools_count) : '—', unit: 'tools', color: '#8b5cf6' },
        { label: 'Daily Context Switches', value: data.estimated_daily_switches ? "".concat(data.estimated_daily_switches) : '—', unit: 'switches', color: '#a78bfa' },
        { label: 'Time Lost Daily', value: data.time_lost_daily_minutes ? "".concat(data.time_lost_daily_minutes) : '—', unit: 'min/day', color: '#f87171' },
        { label: 'Annual Cost', value: data.annual_cost ? fmtMoney(data.annual_cost) : '—', unit: 'per year', color: '#f87171' },
    ];
    return (<RevealSection_1.default>
      <section>
        <SectionLabel num="05" text="Context Switching Tax"/>
        <h2 className="font-headline font-bold text-[clamp(22px,3vw,34px)] tracking-[-0.025em] text-on-surface mb-2">
          The Hidden Cost of Jumping Between Tools
        </h2>
        <p className="text-[14px] text-[rgba(255,255,255,0.38)] mb-6 max-w-[520px]">
          Each tool switch costs 15–23 minutes of refocus time. It compounds fast.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(function (_a) {
            var label = _a.label, value = _a.value, unit = _a.unit, color = _a.color;
            return (<div key={label} className="p-5 rounded-[16px] flex flex-col gap-2" style={{ background: "".concat(color, "08"), border: "1px solid ".concat(color, "20") }}>
              <p className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: "".concat(color, "bb") }}>{label}</p>
              <p className="font-headline text-[clamp(24px,3vw,32px)] font-extrabold tabular-nums leading-none" style={{ color: color, textShadow: "0 0 20px ".concat(color, "60") }}>
                {value}
              </p>
              <p className="text-[11px] text-on-surface-variant/50">{unit}</p>
            </div>);
        })}
        </div>
      </section>
    </RevealSection_1.default>);
}
// ─── Benchmark Section ───────────────────────────────────────────────────────
var VERDICT_CONFIG = {
    critical: { color: '#ef4444', label: 'Critical', border: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.1)' },
    'above average': { color: '#ef4444', label: 'Above Average', border: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.1)' },
    average: { color: '#f59e0b', label: 'On Par', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.1)' },
    'below average': { color: '#10b981', label: 'Below Average', border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.1)' },
};
function getVerdictConfig(verdict) {
    var _a;
    return (_a = VERDICT_CONFIG[verdict.toLowerCase()]) !== null && _a !== void 0 ? _a : { color: '#6b7280', label: verdict, border: 'rgba(107,114,128,0.3)', bg: 'rgba(107,114,128,0.1)' };
}
function BenchmarkBar(_a) {
    var label = _a.label, theirValue = _a.theirValue, avgValue = _a.avgValue, theirDisplay = _a.theirDisplay, avgDisplay = _a.avgDisplay, higherIsBetter = _a.higherIsBetter, _b = _a.animDelay, animDelay = _b === void 0 ? 0 : _b;
    var max = Math.max(theirValue, avgValue, 0.001);
    var theirPct = (theirValue / max) * 100;
    var avgPct = (avgValue / max) * 100;
    var theirIsGood = higherIsBetter ? theirValue >= avgValue : theirValue <= avgValue;
    var theirColor = theirIsGood
        ? '#10b981'
        : theirValue > avgValue * 1.4 || (!higherIsBetter && theirValue > avgValue * 1.2)
            ? '#ef4444'
            : '#f59e0b';
    return (<div className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-on-surface-variant/50">{label}</p>

      {/* Their bar */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-on-surface-variant">Your agency</span>
          <span className="font-headline font-extrabold text-[18px] tabular-nums" style={{ color: theirColor }}>
            {theirDisplay}
          </span>
        </div>
        <div className="h-[7px] rounded-full overflow-hidden bg-surface-container-high">
          <framer_motion_1.motion.div className="h-full rounded-full" initial={{ width: 0 }} whileInView={{ width: "".concat(theirPct, "%") }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: animDelay }} style={{ background: theirColor, boxShadow: "0 0 10px ".concat(theirColor, "70") }}/>
        </div>
      </div>

      {/* Industry avg bar */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-on-surface-variant/50">Industry average</span>
          <span className="text-[15px] font-semibold tabular-nums text-on-surface-variant/60">{avgDisplay}</span>
        </div>
        <div className="h-[7px] rounded-full overflow-hidden bg-surface-container-high">
          <framer_motion_1.motion.div className="h-full rounded-full" initial={{ width: 0 }} whileInView={{ width: "".concat(avgPct, "%") }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: animDelay + 0.15 }} style={{ background: 'rgba(255,255,255,0.14)' }}/>
        </div>
      </div>
    </div>);
}
function BenchmarkSection(_a) {
    var _b;
    var data = _a.data;
    var h = data.hours_wasted_vs_average;
    var ops = data.ops_cost_ratio;
    var mat = data.automation_maturity;
    var matCategory = (_b = mat === null || mat === void 0 ? void 0 : mat.category) !== null && _b !== void 0 ? _b : '';
    var matColor = matCategory.toLowerCase().includes('intelligent') ? '#10b981' :
        matCategory.toLowerCase().includes('systematized') ? '#22d3ee' :
            matCategory.toLowerCase().includes('partially') ? '#f59e0b' : '#ef4444';
    var opsBad = ops ? ops.their_ratio_percent > ops.healthy_ratio_percent : false;
    return (<FadeInOnScroll_1.default>
      <RevealSection_1.default>
        <section>
          <SectionLabel num="03" text="Industry Benchmarks"/>
          <h2 className="font-headline font-bold text-[clamp(22px,3vw,34px)] tracking-[-0.025em] text-on-surface mb-2">
            How You Compare
          </h2>
          <p className="text-[14px] text-[rgba(255,255,255,0.38)] mb-8 max-w-[520px]">
            Benchmarked against agencies your size. Numbers don&apos;t lie.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">

            {/* Hours wasted */}
            {h && (<div className="p-6 rounded-[18px] space-y-5" style={{ background: 'rgba(173,198,255,0.04)', border: '1px solid rgba(173,198,255,0.1)' }}>
                <BenchmarkBar label="Hours Wasted / Week" theirValue={h.their_hours} avgValue={h.industry_average} theirDisplay={"".concat(h.their_hours, "h")} avgDisplay={"".concat(h.industry_average, "h avg")} higherIsBetter={false} animDelay={0.1}/>
                {(function () {
                var vc = getVerdictConfig(h.verdict);
                return (<div className="flex items-center gap-2 pt-1">
                      <span className="px-2.5 py-[4px] rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: vc.bg, border: "1px solid ".concat(vc.border), color: vc.color }}>
                        {vc.label}
                      </span>
                      {Math.abs(h.percent_difference) > 1 && (<span className="text-[11px] text-on-surface-variant/50">
                          {h.percent_difference > 0 ? '+' : ''}{Math.round(h.percent_difference)}% vs avg
                        </span>)}
                    </div>);
            })()}
              </div>)}

            {/* Ops cost ratio */}
            {ops && (<div className="p-6 rounded-[18px] space-y-5" style={{ background: 'rgba(173,198,255,0.04)', border: '1px solid rgba(173,198,255,0.1)' }}>
                <BenchmarkBar label="Ops Time Ratio" theirValue={ops.their_ratio_percent} avgValue={ops.healthy_ratio_percent} theirDisplay={"".concat(ops.their_ratio_percent, "%")} avgDisplay={"".concat(ops.healthy_ratio_percent, "% healthy")} higherIsBetter={false} animDelay={0.25}/>
                <div className="pt-1">
                  <span className="px-2.5 py-[4px] rounded-full text-[10px] font-bold uppercase tracking-wider" style={{
                background: opsBad ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                border: opsBad ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)',
                color: opsBad ? '#ef4444' : '#10b981',
            }}>
                    {opsBad ? 'Ops-Heavy' : 'Healthy'}
                  </span>
                  <p className="text-[11px] text-on-surface-variant/50 mt-2 leading-[1.6]">{ops.verdict}</p>
                </div>
              </div>)}

            {/* Automation maturity */}
            {mat && (<div className="p-6 rounded-[18px] space-y-4" style={{ background: 'rgba(173,198,255,0.04)', border: '1px solid rgba(173,198,255,0.1)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-on-surface-variant/50">Automation Maturity</p>

                {/* Score arc / big number */}
                <div className="flex items-end gap-3">
                  <span className="font-headline text-[48px] font-extrabold leading-none tabular-nums" style={{ color: matColor, textShadow: "0 0 24px ".concat(matColor, "60") }}>
                    <CountUp_1.default target={mat.their_score} duration={1.4}/>
                  </span>
                  <span className="text-[14px] text-on-surface-variant/40 mb-1">/100</span>
                </div>

                {/* Maturity track */}
                <div className="space-y-2">
                  <div className="h-[7px] rounded-full overflow-hidden bg-surface-container-high">
                    <framer_motion_1.motion.div className="h-full rounded-full" initial={{ width: 0 }} whileInView={{ width: "".concat(mat.their_score, "%") }} viewport={{ once: true }} transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.4 }} style={{ background: "linear-gradient(90deg, #ef4444, #f59e0b 40%, ".concat(matColor, ")"), boxShadow: "0 0 10px ".concat(matColor, "60") }}/>
                  </div>
                  <div className="flex justify-between text-[9px] text-on-surface-variant/30 font-mono">
                    <span>Manual Chaos</span>
                    <span>Intelligent Ops</span>
                  </div>
                </div>

                <div className="pt-1 space-y-1.5">
                  <span className="inline-block px-2.5 py-[4px] rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "".concat(matColor, "18"), border: "1px solid ".concat(matColor, "40"), color: matColor }}>
                    {mat.category}
                  </span>
                  <p className="text-[11px] text-on-surface-variant/50 leading-[1.6]">{mat.percentile}</p>
                </div>
              </div>)}

          </div>
        </section>
      </RevealSection_1.default>
    </FadeInOnScroll_1.default>);
}
// ─── Onboarding Assessment Section ───────────────────────────────────────────
function OnboardingAssessmentSection(_a) {
    var data = _a.data, unlocked = _a.unlocked, onUnlock = _a.onUnlock;
    return (<RevealSection_1.default>
      <section>
        <SectionLabel num="07" text="Onboarding Assessment"/>
        <h2 className="font-headline font-bold text-[clamp(22px,3vw,34px)] tracking-[-0.025em] text-on-surface mb-6">
          Client Onboarding Audit
        </h2>

        <LockedSection unlocked={unlocked} onUnlock={onUnlock}>
          <div className="rounded-[20px] overflow-hidden bg-surface-container border border-outline-variant/10">
            <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #f59e0b, #f87171)' }}/>
            <div className="p-6 space-y-5">

              {data.current_state && (<div className="p-4 rounded-[12px]" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#f87171] mb-2">Current State</p>
                  <p className="text-[13px] text-on-surface-variant leading-[1.7]">{data.current_state}</p>
                </div>)}

              <div className="grid sm:grid-cols-2 gap-3">
                {data.time_per_client_current && (<div className="p-4 rounded-[12px]" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#f87171] mb-2">Time per Client Now</p>
                    <p className="font-headline text-[26px] font-extrabold text-[#f87171] leading-none">{data.time_per_client_current}</p>
                  </div>)}
                {data.time_per_client_automated && (<div className="p-4 rounded-[12px]" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-[2px] text-emerald-400 mb-2">Time per Client Automated</p>
                    <p className="font-headline text-[26px] font-extrabold text-emerald-400 leading-none">{data.time_per_client_automated}</p>
                  </div>)}
              </div>

              {data.revenue_impact && (<div className="p-4 rounded-[12px]" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#60a5fa] mb-2">Revenue Impact</p>
                  <p className="text-[13px] text-on-surface-variant leading-[1.7]">{data.revenue_impact}</p>
                </div>)}
            </div>
          </div>
        </LockedSection>
      </section>
    </RevealSection_1.default>);
}
// ─── Opportunity card ─────────────────────────────────────────────────────────
function OpportunityCard(_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var opp = _a.opp, unlocked = _a.unlocked, onUnlock = _a.onUnlock, onGetBuilt = _a.onGetBuilt;
    var diff = (_b = DIFF_CONFIG[opp.difficulty]) !== null && _b !== void 0 ? _b : DIFF_CONFIG.medium;
    var color = rankColor(opp.rank);
    var annualValue = (_c = opp.annual_savings) !== null && _c !== void 0 ? _c : (((_d = opp.monthly_savings) !== null && _d !== void 0 ? _d : 0) * 12);
    var monthlyVal = (_e = opp.monthly_savings) !== null && _e !== void 0 ? _e : (annualValue > 0 ? Math.round(annualValue / 12) : 0);
    var problemText = (_f = opp.hard_truth) !== null && _f !== void 0 ? _f : opp.problem;
    var isHardTruth = !!opp.hard_truth;
    var solutionText = (_g = opp.automated_process) !== null && _g !== void 0 ? _g : opp.solution;
    var tools = (_j = (_h = opp.tools_connected) !== null && _h !== void 0 ? _h : opp.tools_involved) !== null && _j !== void 0 ? _j : [];
    var buildPrice = (_k = BUILD_PRICE[opp.difficulty]) !== null && _k !== void 0 ? _k : BUILD_PRICE.medium;
    var hasLockedContent = !!opp.current_process ||
        !!solutionText ||
        (opp.n8n_nodes && opp.n8n_nodes.length > 0) ||
        (((_l = opp.implementation_steps) === null || _l === void 0 ? void 0 : _l.length) > 0) ||
        tools.length > 0;
    return (<div className="rounded-[18px] overflow-hidden transition-all duration-300 hover:-translate-y-1 bg-surface-container border border-outline-variant/10" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
      <div className="h-[2px]" style={{ background: "linear-gradient(90deg, ".concat(color, ", ").concat(color, "00 65%)") }}/>

      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-11 h-11 rounded-[12px] flex items-center justify-center font-headline text-[18px] font-extrabold shrink-0" style={{
            background: "linear-gradient(135deg, ".concat(color, "22 0%, ").concat(color, "08 100%)"),
            border: "1.5px solid ".concat(color, "40"),
            color: color,
            boxShadow: "0 0 20px ".concat(color, "25, inset 0 0 12px ").concat(color, "08"),
        }}>
              {opp.rank}
            </div>
            <div className="min-w-0">
              <h3 className="font-headline text-[17px] font-bold text-on-surface leading-snug">{opp.title}</h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {opp.quick_win && (<badge_1.Badge variant="outline" className="h-auto px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-400/10 border-emerald-400/25 text-emerald-400">
                    Quick Win
                  </badge_1.Badge>)}
                <badge_1.Badge variant="outline" className={"h-auto px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-wider ".concat(diff.pill)} style={{ background: diff.bg, border: "1px solid ".concat(diff.border) }}>
                  {diff.label}
                </badge_1.Badge>
                {opp.build_time_days != null && (<badge_1.Badge variant="outline" className="h-auto px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-wider text-sky-400" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                    {opp.build_time_days}d build
                  </badge_1.Badge>)}
              </div>
            </div>
          </div>

          {/* ROI stats */}
          <div className="flex gap-5 shrink-0 text-right">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-on-surface-variant mb-0.5">Saved/Week</p>
              <p className="font-headline text-[22px] font-extrabold leading-none tabular-nums" style={{ color: color }}>
                {opp.hours_saved_weekly}h
              </p>
            </div>
            {monthlyVal > 0 && (<div>
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-on-surface-variant mb-0.5">Monthly</p>
                <p className="font-headline text-[22px] font-extrabold leading-none tabular-nums text-on-surface">
                  {fmtMoney(monthlyVal)}
                </p>
              </div>)}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Hard truth (always visible) */}
        {problemText && (<div className="p-4 rounded-[12px]" style={isHardTruth
                ? { background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }
                : { background: 'rgba(173,198,255,0.03)', border: '1px solid rgba(173,198,255,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[2px] mb-2" style={{ color: isHardTruth ? '#f87171' : 'rgba(194,198,214,0.5)' }}>
              {isHardTruth ? 'The Hard Truth' : 'The Problem'}
            </p>
            <p className="text-[13px] leading-[1.7]" style={{ color: isHardTruth ? '#e0e2ee' : '#c2c6d6' }}>{problemText}</p>
          </div>)}

        {/* Build price (always visible — selling point) */}
        <div className="p-4 rounded-[12px]" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-emerald-400 mb-2">OpsRadar Build Price</p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="font-headline text-[20px] font-extrabold text-emerald-400 leading-none">{buildPrice.range}</p>
            <p className="text-[12px] text-on-surface-variant">{buildPrice.delivery}</p>
          </div>
        </div>

        {/* Workflow diagram (always visible teaser) */}
        {opp.technical_flow && (<div className="pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-3">Automation Flow</p>
            <WorkflowDiagram_1.default technicalFlow={opp.technical_flow}/>
          </div>)}

        {/* Locked: technical details */}
        {hasLockedContent && (<LockedSection unlocked={unlocked} onUnlock={onUnlock}>
            <div className="space-y-4">
              {/* Current process */}
              {opp.current_process && (<div className="p-4 rounded-[12px]" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#f59e0b] mb-2">Currently</p>
                  <p className="text-[13px] text-on-surface-variant leading-[1.7]">{opp.current_process}</p>
                </div>)}

              {/* Solution / automated process */}
              {solutionText && (<div className="p-4 rounded-[12px]" style={{ background: "".concat(color, "07"), border: "1px solid ".concat(color, "20") }}>
                  <p className="text-[10px] font-bold uppercase tracking-[2px] mb-2" style={{ color: color }}>
                    {opp.automated_process ? 'Automated Process' : 'The Solution'}
                  </p>
                  <p className="text-[13px] text-on-surface-variant leading-[1.7]">{solutionText}</p>
                </div>)}

              {/* n8n nodes */}
              {opp.n8n_nodes && opp.n8n_nodes.length > 0 && (<div>
                  <p className="text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-2">n8n Nodes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.n8n_nodes.map(function (node) { return (<span key={node} className="text-[11px] px-2.5 py-[4px] rounded-[6px] font-medium" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#c4b5fd' }}>
                        {node}
                      </span>); })}
                  </div>
                </div>)}

              {/* Implementation steps */}
              {((_m = opp.implementation_steps) === null || _m === void 0 ? void 0 : _m.length) > 0 && (<div>
                  <p className="text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-3">Implementation Steps</p>
                  <div className="space-y-2.5">
                    {opp.implementation_steps.map(function (step, i) { return (<div key={i} className="flex gap-3 items-start">
                        <span className="mt-[2px] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 tabular-nums" style={{ background: "".concat(color, "15"), border: "1px solid ".concat(color, "30"), color: color }}>
                          {i + 1}
                        </span>
                        <p className="text-[13px] text-on-surface-variant leading-[1.65]">{step}</p>
                      </div>); })}
                  </div>
                </div>)}

              {/* Tool chips */}
              {tools.length > 0 && (<div className="flex flex-wrap gap-1.5 pt-1">
                  {tools.map(function (t) { return (<span key={t} className="text-[11px] px-2.5 py-[4px] rounded-[6px] text-on-surface-variant" style={{ background: 'rgba(173,198,255,0.05)', border: '1px solid rgba(173,198,255,0.12)' }}>
                      {t}
                    </span>); })}
                </div>)}
            </div>
          </LockedSection>)}

        {/* Get this built CTA */}
        <div className="pt-3 mt-1 border-t border-[rgba(255,255,255,0.05)]">
          <button_1.Button onClick={onGetBuilt} variant="outline" className="h-auto px-4 py-2 rounded-[8px] text-[12px] font-semibold text-sky-400 border-sky-400/20 bg-sky-400/7 hover:bg-sky-400/13 hover:border-sky-400/40 hover:text-sky-400">
            Get This Built →
          </button_1.Button>
        </div>
      </div>
    </div>);
}
// ─── Build request modal ──────────────────────────────────────────────────────
function BuildRequestModal(_a) {
    var oppTitle = _a.oppTitle, contactName = _a.contactName, contactEmail = _a.contactEmail, auditId = _a.auditId, onClose = _a.onClose;
    var _b = (0, react_1.useState)({ name: contactName, email: contactEmail, budget: '', timeline: '', notes: '' }), form = _b[0], setForm = _b[1];
    var _c = (0, react_1.useState)('idle'), status = _c[0], setStatus = _c[1];
    var _d = (0, react_1.useState)(''), errMsg = _d[0], setErrMsg = _d[1];
    (0, react_1.useEffect)(function () {
        document.body.style.overflow = 'hidden';
        return function () { document.body.style.overflow = ''; };
    }, []);
    (0, react_1.useEffect)(function () {
        var handler = function (e) { if (e.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', handler);
        return function () { return window.removeEventListener('keydown', handler); };
    }, [onClose]);
    var canSubmit = form.name.trim() && form.email.trim() && form.budget && form.timeline;
    function handleSubmit(e) {
        return __awaiter(this, void 0, void 0, function () {
            var res, d, err_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        e.preventDefault();
                        if (!canSubmit)
                            return [2 /*return*/];
                        setStatus('submitting');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, fetch('/api/build-request', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(__assign({ audit_id: auditId, automation_title: oppTitle }, form)),
                            })];
                    case 2:
                        res = _b.sent();
                        if (!!res.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, res.json()];
                    case 3:
                        d = _b.sent();
                        throw new Error((_a = d.error) !== null && _a !== void 0 ? _a : 'Failed to submit');
                    case 4:
                        setStatus('success');
                        return [3 /*break*/, 6];
                    case 5:
                        err_1 = _b.sent();
                        setErrMsg(err_1 instanceof Error ? err_1.message : 'Something went wrong');
                        setStatus('error');
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }
    var inputStyle = { background: 'rgba(28,32,40,1)', border: '1px solid rgba(66,71,84,0.4)', color: '#e0e2ee' };
    return (<div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(5,8,16,0.82)', backdropFilter: 'blur(10px)' }} onClick={function (e) { if (e.target === e.currentTarget)
        onClose(); }}>
      <div className="w-full sm:max-w-[520px] rounded-t-[22px] sm:rounded-[22px] overflow-hidden bg-surface-container border border-outline-variant/20" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #adc6ff, #a78bfa)' }}/>
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-headline font-bold text-[19px] text-on-surface tracking-[-0.02em]">Get This Built</h2>
              <p className="text-[12px] text-on-surface-variant mt-0.5">We&apos;ll scope it and get back to you within 24 hours.</p>
            </div>
            <button_1.Button onClick={onClose} variant="ghost" size="icon-sm" className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high shrink-0 ml-4 rounded-[8px]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button_1.Button>
          </div>

          {status === 'success' ? (<div className="text-center py-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M4 11l5 5 9-9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="font-headline font-bold text-[18px] text-on-surface mb-2">Request Received!</h3>
              <p className="text-[13px] text-on-surface-variant leading-[1.7] max-w-[320px] mx-auto">
                We&apos;ll get back to you within 24 hours with a scoped plan and cost estimate.
              </p>
              <button_1.Button onClick={onClose} variant="outline" className="mt-6 px-6 py-2.5 h-auto rounded-[10px] text-[13px] font-semibold border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40 bg-transparent">
                Close
              </button_1.Button>
            </div>) : (<form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-2">Automation</label>
                <div className="px-3.5 py-2.5 rounded-[10px] text-[13px] font-medium text-[rgba(255,255,255,0.75)]" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  {oppTitle}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['name', 'email'].map(function (field) { return (<div key={field}>
                    <label className="block text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-2">
                      {field === 'name' ? 'Your Name' : 'Email'}
                    </label>
                    <input type={field === 'email' ? 'email' : 'text'} required value={form[field]} onChange={function (e) { return setForm(function (f) {
                var _a;
                return (__assign(__assign({}, f), (_a = {}, _a[field] = e.target.value, _a)));
            }); }} className="w-full px-3 py-2.5 rounded-[10px] text-[13px] text-on-surface placeholder:text-on-surface-variant/30 outline-none transition-colors duration-150" style={inputStyle} onFocus={function (e) { return (e.currentTarget.style.borderColor = 'rgba(173,198,255,0.4)'); }} onBlur={function (e) { return (e.currentTarget.style.borderColor = 'rgba(66,71,84,0.4)'); }}/>
                  </div>); })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                { field: 'budget', label: 'Budget Range', opts: ['Under $1K', '$1K–$3K', '$3K–$5K', '$5K+'] },
                { field: 'timeline', label: 'Timeline', opts: ['This week', 'This month', 'No rush'] },
            ].map(function (_a) {
                var field = _a.field, label = _a.label, opts = _a.opts;
                return (<div key={field}>
                    <label className="block text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-2">{label}</label>
                    <div className="relative">
                      <select required value={form[field]} onChange={function (e) { return setForm(function (f) {
                    var _a;
                    return (__assign(__assign({}, f), (_a = {}, _a[field] = e.target.value, _a)));
                }); }} className="w-full px-3 py-2.5 rounded-[10px] text-[13px] text-on-surface outline-none appearance-none transition-colors duration-150" style={inputStyle} onFocus={function (e) { return (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.45)'); }} onBlur={function (e) { return (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'); }}>
                        <option value="" disabled style={{ background: '#0d1229' }}>Select…</option>
                        {opts.map(function (o) { return <option key={o} value={o} style={{ background: '#0d1229' }}>{o}</option>; })}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <path d="M2 4l3.5 3.5L9 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>);
            })}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-2">
                  Notes <span className="font-normal normal-case tracking-normal text-[rgba(255,255,255,0.18)]">(optional)</span>
                </label>
                <textarea value={form.notes} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { notes: e.target.value })); }); }} placeholder="Any specific requirements or things to know…" rows={3} className="w-full px-3 py-2.5 rounded-[10px] text-[13px] text-on-surface placeholder:text-on-surface-variant/30 outline-none resize-none transition-colors duration-150" style={inputStyle} onFocus={function (e) { return (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.45)'); }} onBlur={function (e) { return (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'); }}/>
              </div>
              {status === 'error' && <p className="text-[12px] text-[#f87171]">{errMsg}</p>}
              <button_1.Button type="submit" disabled={!canSubmit || status === 'submitting'} className="w-full py-3 h-auto rounded-[12px] font-bold text-[14px] text-white border-0" style={{ background: 'linear-gradient(135deg, #adc6ff 0%, #a78bfa 100%)' }}>
                {status === 'submitting' ? 'Sending…' : 'Submit Request →'}
              </button_1.Button>
            </form>)}
        </div>
      </div>
    </div>);
}
// ─── Unlock section ───────────────────────────────────────────────────────────
function UnlockSection(_a) {
    var auditId = _a.auditId, defaultEmail = _a.defaultEmail, onUnlocked = _a.onUnlocked;
    var _b = (0, react_1.useState)(''), emailInput = _b[0], setEmailInput = _b[1];
    var _c = (0, react_1.useState)('idle'), emailStatus = _c[0], setEmailStatus = _c[1];
    (0, react_1.useEffect)(function () {
        setEmailInput(defaultEmail);
    }, [defaultEmail]);
    function handleEmailUnlock(e) {
        return __awaiter(this, void 0, void 0, function () {
            var email, response, data_1, _a;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        e.preventDefault();
                        email = emailInput.trim();
                        if (!email || !auditId) {
                            setEmailStatus('error');
                            return [2 /*return*/];
                        }
                        setEmailStatus('submitting');
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, fetch('/api/send-unlock-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: email, auditId: auditId }),
                            })];
                    case 2:
                        response = _c.sent();
                        return [4 /*yield*/, response.json()];
                    case 3:
                        data_1 = _c.sent();
                        if (!response.ok || !(data_1 === null || data_1 === void 0 ? void 0 : data_1.audit)) {
                            throw new Error((_b = data_1 === null || data_1 === void 0 ? void 0 : data_1.error) !== null && _b !== void 0 ? _b : 'Something went wrong');
                        }
                        setEmailStatus('success');
                        setTimeout(function () { var _a; return onUnlocked(data_1.audit, (_a = data_1.email) !== null && _a !== void 0 ? _a : email); }, 500);
                        return [3 /*break*/, 5];
                    case 4:
                        _a = _c.sent();
                        setEmailStatus('error');
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    var inputStyle = { background: 'rgba(28,32,40,1)', border: '1px solid rgba(66,71,84,0.4)', color: '#e0e2ee' };
    return (<RevealSection_1.default>
      <section className="rounded-[22px] overflow-hidden bg-surface-container border-2 border-primary/25 shadow-[0_0_60px_rgba(173,198,255,0.07)]">
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #adc6ff, #a78bfa, #4cd7f6)' }}/>
        <div className="p-7 sm:p-10">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider mb-5" style={{ background: 'rgba(173,198,255,0.07)', border: '1px solid rgba(173,198,255,0.2)', color: '#adc6ff' }}>
              <LockIcon size={12}/>
              UNLOCK YOUR FULL BLUEPRINT
            </div>
            <h3 className="font-headline font-extrabold text-[clamp(20px,2.8vw,30px)] tracking-[-0.025em] text-on-surface mb-3">
              Get the Complete Implementation Plan
            </h3>
            <p className="text-[14px] text-on-surface-variant leading-[1.7] max-w-[480px] mx-auto">
              Unlock automation flows, n8n nodes, step-by-step implementation guides, roadmap, and tool recommendations — everything you need to build or hand off.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">

            {/* Path 1: Book a call */}
            <div className="p-6 rounded-[18px] flex flex-col gap-4" style={{ background: 'rgba(173,198,255,0.04)', border: '1px solid rgba(173,198,255,0.15)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary mb-2">Option 1 — Fastest</p>
                <h4 className="font-headline font-bold text-[16px] text-on-surface mb-1">Book a Free Strategy Call</h4>
                <p className="text-[12px] text-on-surface-variant leading-[1.6]">
                  20 minutes. We&apos;ll scope your top automation and give you a timeline and cost.
                  No pitch, no commitment.
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <button_1.Button asChild className="w-full px-5 py-3 h-auto rounded-[11px] text-[13px] font-bold gap-2 shadow-[0_0_20px_rgba(173,198,255,0.2)] hover:shadow-[0_0_30px_rgba(173,198,255,0.35)] btn-spring">
                  <a href="https://calendly.com/opsradar-ai/ops-radar-strategy-call" target="_blank" rel="noopener noreferrer">
                    Book Free Strategy Call
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                </button_1.Button>
                <p className="text-[11px] text-on-surface-variant/50 leading-[1.6]">
                  Book if you want help prioritizing or scoping the build. Your full blueprint is unlocked through the email flow on the right.
                </p>
              </div>
            </div>

            {/* Path 2: Email */}
            <div className="p-6 rounded-[18px] flex flex-col gap-4" style={{ background: 'rgba(76,215,246,0.03)', border: '1px solid rgba(76,215,246,0.12)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-secondary mb-2">Option 2</p>
                <h4 className="font-headline font-bold text-[16px] text-on-surface mb-1">Email Me the Full Blueprint</h4>
                <p className="text-[12px] text-on-surface-variant leading-[1.6]">
                  We&apos;ll generate the full report only after you request it, then send you the unlocked link immediately.
                </p>
              </div>

              {emailStatus === 'success' ? (<div className="flex items-center gap-2.5 px-4 py-3 rounded-[10px]" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8l4.5 4.5 7.5-7.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[12px] font-semibold text-emerald-400">Building and emailing your blueprint…</p>
                </div>) : (<form onSubmit={handleEmailUnlock} className="flex flex-col gap-2.5">
                  <input type="email" required placeholder="your@email.com" value={emailInput} onChange={function (e) { return setEmailInput(e.target.value); }} className="w-full px-3.5 py-2.5 rounded-[10px] text-[13px] text-on-surface placeholder:text-on-surface-variant/30 outline-none transition-colors duration-150 focus:border-secondary/40" style={inputStyle} onFocus={function (e) { return (e.currentTarget.style.borderColor = 'rgba(76,215,246,0.4)'); }} onBlur={function (e) { return (e.currentTarget.style.borderColor = 'rgba(66,71,84,0.4)'); }}/>
                  {emailStatus === 'error' && (<p className="text-[11px] text-[#f87171]">
                      {auditId ? 'Something went wrong — try again.' : 'We could not find this audit. Please run a new audit.'}
                    </p>)}
                  <button_1.Button type="submit" disabled={!emailInput.trim() || emailStatus === 'submitting' || !auditId} variant="outline" className="px-5 py-2.5 h-auto rounded-[10px] text-[12px] font-bold text-secondary border-secondary/20 bg-secondary/8 hover:bg-secondary/15 hover:text-secondary">
                    {emailStatus === 'submitting' ? 'Building…' : 'Generate Full Blueprint →'}
                  </button_1.Button>
                </form>)}
            </div>
          </div>
        </div>
      </section>
    </RevealSection_1.default>);
}
// ─── Vertical roadmap timeline ────────────────────────────────────────────────
function VerticalRoadmap(_a) {
    var roadmap = _a.roadmap;
    var phases = [
        { id: 'p1', num: '01', timeline: 'Week 1–2', title: 'Quick Wins', desc: roadmap.week_1, color: '#10b981' },
        { id: 'p2', num: '02', timeline: 'Month 1', title: 'Core Systems', desc: roadmap.month_1, color: '#3b82f6' },
        { id: 'p3', num: '03', timeline: 'Month 3', title: 'Intelligence Layer', desc: roadmap.month_3, color: '#8b5cf6' },
    ];
    return (<div className="relative pl-[28px]">
      <div className="absolute left-[11px] top-[20px] bottom-[20px] w-[2px] rounded-full" style={{ background: 'linear-gradient(180deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)' }}/>
      <div className="space-y-5">
        {phases.map(function (_a) {
            var id = _a.id, num = _a.num, timeline = _a.timeline, title = _a.title, desc = _a.desc, color = _a.color;
            return (<div key={id} className="flex gap-5 relative">
            <div className="absolute -left-[28px] w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "".concat(color, "18"), border: "2px solid ".concat(color), boxShadow: "0 0 14px ".concat(color, "40"), top: '14px' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: color }}/>
            </div>
            <div className="flex-1 p-5 rounded-[14px] transition-all duration-300 hover:-translate-y-0.5 bg-surface-container border border-outline-variant/10" style={{ borderTopColor: "".concat(color, "40") }}>
              <div className="flex items-center gap-3 mb-2.5">
                <span className="font-mono text-[9px] font-bold tracking-[2.5px] text-on-surface-variant/30">{num}</span>
                <span className="px-2.5 py-[3px] rounded-full text-[10px] font-semibold" style={{ background: "".concat(color, "15"), border: "1px solid ".concat(color, "30"), color: color }}>
                  {timeline}
                </span>
              </div>
              <p className="font-headline text-[16px] font-bold text-on-surface mb-1.5">{title}</p>
              <p className="text-[13px] text-on-surface-variant leading-[1.7]">{desc}</p>
            </div>
          </div>);
        })}
      </div>
    </div>);
}
// ─── Main page ────────────────────────────────────────────────────────────────
function ResultsContent() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
    var _2 = (0, react_1.useState)(null), audit = _2[0], setAudit = _2[1];
    var _3 = (0, react_1.useState)(''), company = _3[0], setCompany = _3[1];
    var _4 = (0, react_1.useState)(''), contactName = _4[0], setContactName = _4[1];
    var _5 = (0, react_1.useState)(''), contactEmail = _5[0], setContactEmail = _5[1];
    var _6 = (0, react_1.useState)(false), error = _6[0], setError = _6[1];
    var dateStr = (0, react_1.useState)(function () {
        return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    })[0];
    var _7 = (0, react_1.useState)(null), modalOpp = _7[0], setModalOpp = _7[1];
    var _8 = (0, react_1.useState)(false), unlocked = _8[0], setUnlocked = _8[1];
    var unlockRef = (0, react_1.useRef)(null);
    var searchParams = (0, navigation_1.useSearchParams)();
    var auditId = searchParams.get('id');
    (0, react_1.useEffect)(function () {
        var storedUnlock = localStorage.getItem(getUnlockStorageKey(auditId)) === '1';
        if (auditId) {
            supabase_1.supabase
                .from('audits').select('result, company, name, email').eq('id', auditId).single()
                .then(function (_a) {
                var data = _a.data, dbError = _a.error;
                if (dbError || !(data === null || data === void 0 ? void 0 : data.result))
                    loadFromSession();
                else {
                    var nextAudit = data.result;
                    setAudit(nextAudit);
                    setUnlocked(nextAudit.report_stage !== 'preview' || storedUnlock);
                    if (data.company)
                        setCompany(data.company);
                    if (data.name)
                        setContactName(data.name);
                    if (data.email)
                        setContactEmail(data.email);
                }
            });
        }
        else {
            loadFromSession();
        }
        function loadFromSession() {
            try {
                var raw = sessionStorage.getItem('opsradar_audit');
                if (!raw) {
                    setError(true);
                    return;
                }
                var sessionAudit = JSON.parse(raw);
                setAudit(sessionAudit);
                setUnlocked(sessionAudit.report_stage !== 'preview' || storedUnlock);
            }
            catch (_a) {
                setError(true);
            }
        }
    }, [auditId]);
    function handleUnlocked(nextAudit, email) {
        localStorage.setItem(getUnlockStorageKey(auditId), '1');
        sessionStorage.setItem('opsradar_audit', JSON.stringify(nextAudit));
        setAudit(nextAudit);
        setContactEmail(email);
        setUnlocked(true);
        window.scrollBy({ top: -100, behavior: 'smooth' });
    }
    function scrollToUnlock() {
        var _a;
        (_a = unlockRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (!audit && !error) {
        return (<div className="min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 mx-auto animate-spin" style={{ borderColor: '#adc6ff', borderTopColor: 'transparent' }}/>
          <p className="text-on-surface-variant text-[13px]">Loading your report…</p>
        </div>
      </div>);
    }
    if (error) {
        return (<div className="min-h-screen bg-surface-container-lowest text-on-surface flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-on-surface-variant text-[15px]">No audit data found.</p>
        <button_1.Button asChild className="px-6 py-3 h-auto rounded-xl font-semibold text-[14px]">
          <link_1.default href="/audit">Start a New Audit →</link_1.default>
        </button_1.Button>
      </div>);
    }
    // ── Normalize old / new response shapes ─────────────────────────────────────
    var a = audit;
    var isPreview = a.report_stage === 'preview';
    var readiness = (_c = (_a = a.automation_readiness_score) !== null && _a !== void 0 ? _a : (_b = a.summary) === null || _b === void 0 ? void 0 : _b.automation_readiness_score) !== null && _c !== void 0 ? _c : 50;
    var headline = (_f = (_e = (_d = a.summary) === null || _d === void 0 ? void 0 : _d.headline) !== null && _e !== void 0 ? _e : a.executive_summary) !== null && _f !== void 0 ? _f : 'Your Automation Audit';
    var hoursWeekly = (_h = (_g = a.summary) === null || _g === void 0 ? void 0 : _g.total_hours_saved_weekly) !== null && _h !== void 0 ? _h : ((_j = a.opportunities) !== null && _j !== void 0 ? _j : []).reduce(function (s, o) { var _a; return s + ((_a = o.hours_saved_weekly) !== null && _a !== void 0 ? _a : 0); }, 0);
    var annualSavings = (_m = (_l = (_k = a.summary) === null || _k === void 0 ? void 0 : _k.total_annual_cost_savings) !== null && _l !== void 0 ? _l : a.estimated_annual_waste) !== null && _m !== void 0 ? _m : 0;
    var opportunities = Array.isArray(a.opportunities) ? a.opportunities : [];
    var toolsAnalysis = (_o = a.tools_analysis) !== null && _o !== void 0 ? _o : { current_stack_rating: 0 };
    var roadmap = a.roadmap
        ? { week_1: (_p = a.roadmap.phase_1_quick_wins) !== null && _p !== void 0 ? _p : '', month_1: (_q = a.roadmap.phase_2_core_systems) !== null && _q !== void 0 ? _q : '', month_3: (_r = a.roadmap.phase_3_intelligence_layer) !== null && _r !== void 0 ? _r : '' }
        : { week_1: (_t = (_s = a.priority_roadmap) === null || _s === void 0 ? void 0 : _s.week_1) !== null && _t !== void 0 ? _t : '', month_1: (_v = (_u = a.priority_roadmap) === null || _u === void 0 ? void 0 : _u.month_1) !== null && _v !== void 0 ? _v : '', month_3: (_x = (_w = a.priority_roadmap) === null || _w === void 0 ? void 0 : _w.month_3) !== null && _x !== void 0 ? _x : '' };
    var addedTools = (_z = (_y = toolsAnalysis.recommended_additions) !== null && _y !== void 0 ? _y : toolsAnalysis.missing_integrations) !== null && _z !== void 0 ? _z : [];
    var removedTools = (_0 = toolsAnalysis.redundant_tools) !== null && _0 !== void 0 ? _0 : [];
    var hasRoadmap = roadmap.week_1 || roadmap.month_1 || roadmap.month_3;
    var hasStack = toolsAnalysis.current_stack_rating > 0 || addedTools.length > 0 || removedTools.length > 0 || !!toolsAnalysis.biggest_friction_point;
    var pathToVision = (_1 = a.roadmap) === null || _1 === void 0 ? void 0 : _1.path_to_vision;
    return (<div className="min-h-screen bg-surface-container-lowest text-on-surface overflow-x-hidden">

      {/* ── Fixed nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-[13px] bg-slate-900/60 backdrop-blur-2xl border-b border-outline-variant/10">
        <link_1.default href="/" className="flex items-center gap-2.5">
          <image_1.default src="/logo.png" alt="OpsRadar" width={28} height={28} className="h-7 w-auto rounded-[6px] shrink-0"/>
          <span className="font-headline font-bold text-[16px] bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            OpsRadar
          </span>
        </link_1.default>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            <span className="text-[11px] font-semibold text-emerald-400">Audit Complete</span>
          </div>
          {!unlocked ? (<button_1.Button onClick={scrollToUnlock} variant="outline" className="h-auto px-4 py-[7px] rounded-[8px] text-[12px] font-bold text-primary border-primary/22 bg-primary/8 hover:bg-primary/15 hover:text-primary gap-1.5">
              <LockIcon size={12}/>
              Unlock Blueprint
            </button_1.Button>) : (<button_1.Button onClick={function () { return window.print(); }} variant="outline" className="h-auto px-4 py-[7px] rounded-[8px] text-[12px] font-semibold border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40 hover:text-on-surface bg-transparent gap-1.5">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M4 10H2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2M5 8l3 3 3-3M8 1v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download PDF
            </button_1.Button>)}
        </div>
      </nav>

      {/* ── Report header ──────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden pt-[73px]">
        <div className="absolute inset-0 grid-texture pointer-events-none"/>
        <div className="absolute top-0 left-[-10%] w-[500px] h-[300px] bg-primary/8 rounded-full blur-[120px] pointer-events-none"/>

        <div className="relative z-[2] max-w-[900px] mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <image_1.default src="/logo.png" alt="OpsRadar" width={48} height={48} className="h-12 w-auto rounded-[10px] shrink-0"/>
              <div>
                <p className="font-headline font-extrabold text-[22px] tracking-[-0.02em] text-on-surface">OpsRadar</p>
                <p className="text-[12px] text-on-surface-variant font-medium mt-0.5">Operations Audit Report</p>
              </div>
            </div>
            <div className="sm:text-right">
              {company && <p className="font-headline font-bold text-[18px] text-on-surface tracking-[-0.01em]">{company}</p>}
              {dateStr && <p className="text-[12px] text-on-surface-variant mt-0.5">{dateStr}</p>}
              <p className="text-[11px] text-on-surface-variant/40 mt-1 flex sm:justify-end items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary inline-block"/>
                Powered by OpsRadar AI
              </p>
            </div>
          </div>

          <div className="mt-10"><Divider /></div>

          <h1 className="font-headline font-extrabold text-[clamp(24px,3.8vw,44px)] leading-[1.1] tracking-[-0.03em] mt-8 max-w-[680px] text-on-surface">
            <TypewriterText_1.default text={headline} speed={28} delay={400}/>
          </h1>

          <div className="flex flex-wrap gap-6 mt-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[2px] text-on-surface-variant mb-1">Hours Recovered/Week</p>
              <p className="font-headline text-[28px] font-extrabold tabular-nums text-secondary leading-none">
                <AnimatedNumber_1.default target={hoursWeekly} suffix="h" duration={1400}/>
              </p>
            </div>
            <div className="w-px self-stretch bg-outline-variant/20"/>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[2px] text-on-surface-variant mb-1">Annual Savings Potential</p>
              <p className="font-headline text-[28px] font-extrabold tabular-nums text-primary leading-none">
                <AnimatedNumber_1.default target={annualSavings} prefix="$" formatter={function (n) { return n >= 1000 ? "".concat((n / 1000).toFixed(0), "K") : String(Math.round(n)); }} duration={1600}/>
              </p>
            </div>
            <div className="w-px self-stretch bg-outline-variant/20"/>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[2px] text-on-surface-variant mb-1">Opportunities Found</p>
              <p className="font-headline text-[28px] font-extrabold tabular-nums text-tertiary leading-none">
                {opportunities.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main sections ──────────────────────────────────────────────────── */}
      <main className="max-w-[900px] mx-auto px-6 pb-28 space-y-20 mt-4">

        {isPreview && <PreviewBanner notice={a.preview_notice}/>}

        {/* 01 · Executive Summary */}
        {a.executive_summary && (<FadeInOnScroll_1.default>
            <section>
              <SectionLabel num="01" text="Executive Summary"/>
              <div className="rounded-[20px] overflow-hidden bg-surface-container border border-outline-variant/10">
                <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #adc6ff, #a78bfa, #4cd7f6)' }}/>
                <div className="p-7">
                  <p className="text-[clamp(15px,1.8vw,19px)] text-on-surface leading-[1.75] font-medium max-w-[700px]">
                    {a.executive_summary}
                  </p>
                  {(!!a.estimated_monthly_waste || !!a.estimated_annual_waste) && (<div className="flex flex-wrap gap-4 mt-7 pt-7 border-t border-outline-variant/10">
                      {!!a.estimated_monthly_waste && (<div className="flex-1 min-w-[160px] p-5 rounded-[14px]" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#f87171] mb-2">Monthly Waste</p>
                          <p className="font-headline text-[clamp(28px,4vw,40px)] font-extrabold tabular-nums text-[#f87171] leading-none">
                            <AnimatedNumber_1.default target={a.estimated_monthly_waste} prefix="$" formatter={function (n) { return n >= 1000 ? "".concat((n / 1000).toFixed(0), "K") : String(Math.round(n)); }} duration={1800}/>
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-1.5">burned on manual work</p>
                        </div>)}
                      {!!a.estimated_annual_waste && (<div className="flex-1 min-w-[160px] p-5 rounded-[14px]" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#fbbf24] mb-2">Annual Waste</p>
                          <p className="font-headline text-[clamp(28px,4vw,40px)] font-extrabold tabular-nums text-[#fbbf24] leading-none">
                            <AnimatedNumber_1.default target={a.estimated_annual_waste} prefix="$" formatter={function (n) { return n >= 1000 ? "".concat((n / 1000).toFixed(0), "K") : String(Math.round(n)); }} duration={2000}/>
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-1.5">total annual cost of staying manual</p>
                        </div>)}
                    </div>)}
                </div>
              </div>
            </section>
          </FadeInOnScroll_1.default>)}

        {/* 02 · Readiness Score */}
        <FadeInOnScroll_1.default>
          <section>
            <SectionLabel num="02" text="Readiness Score"/>
            <div className="rounded-[20px] p-10 flex flex-col items-center relative overflow-hidden bg-surface-container border border-outline-variant/10">
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 70% at 50% 50%, ".concat(readiness >= 60 ? 'rgba(16,185,129,0.06)' : readiness >= 30 ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)', " 0%, transparent 70%)") }}/>
              <div className="relative z-[1]"><ReadinessRing score={readiness}/></div>
            </div>
          </section>
        </FadeInOnScroll_1.default>

        {/* 03 · Industry Benchmarks */}
        {a.benchmarks && (<BenchmarkSection data={a.benchmarks}/>)}

        {/* 04 · Labor Arbitrage */}
        {a.labor_arbitrage_breakdown && (<LaborArbitrageSection data={a.labor_arbitrage_breakdown}/>)}

        {/* 05 · Context Switching Tax */}
        {a.context_switching_analysis && (<ContextSwitchingSection data={a.context_switching_analysis}/>)}

        {/* 06 · Automation Opportunities */}
        <section>
          <RevealSection_1.default>
            <div className="flex items-center justify-between mb-6">
              <div>
                <SectionLabel num="06" text="Automation Opportunities"/>
                <h2 className="font-headline font-bold text-[clamp(22px,3vw,34px)] tracking-[-0.025em] text-on-surface">
                  Your Automation Blueprint
                </h2>
              </div>
              <span className="px-4 py-2 rounded-full text-[13px] font-semibold shrink-0" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                {opportunities.length} found
              </span>
            </div>
          </RevealSection_1.default>
          <StaggerChildren_1.default className="space-y-5">
            {opportunities.map(function (opp) {
            var _a;
            return (<StaggerChildren_1.StaggerItem key={opp.rank}>
                <GlowCard_1.default glowColor={"".concat((_a = RANK_COLORS[opp.rank]) !== null && _a !== void 0 ? _a : '#6b7280', "0d")} className="rounded-[18px]">
                  <OpportunityCard opp={opp} unlocked={unlocked} onUnlock={scrollToUnlock} onGetBuilt={function () { return setModalOpp(opp.title); }}/>
                </GlowCard_1.default>
              </StaggerChildren_1.StaggerItem>);
        })}
          </StaggerChildren_1.default>
        </section>

        {/* 06 · Onboarding Assessment */}
        {a.onboarding_assessment && (<OnboardingAssessmentSection data={a.onboarding_assessment} unlocked={unlocked} onUnlock={scrollToUnlock}/>)}

        {/* 07 · Implementation Roadmap */}
        {hasRoadmap && (<RevealSection_1.default>
            <section>
              <SectionLabel num="08" text="Implementation Roadmap"/>
              <h2 className="font-headline font-bold text-[clamp(22px,3vw,34px)] tracking-[-0.025em] text-on-surface mb-2">
                Your 90-Day Plan
              </h2>
              <p className="text-[14px] text-[rgba(255,255,255,0.38)] mb-8 max-w-[520px]">
                Phased to deliver quick wins first, then compound value over time.
              </p>

              <LockedSection unlocked={unlocked} onUnlock={scrollToUnlock}>
                <div className="space-y-5">
                  <VerticalRoadmap roadmap={roadmap}/>
                  {pathToVision && (<div className="p-6 rounded-[18px] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(173,198,255,0.04) 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #8b5cf6, #adc6ff, transparent)' }}/>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M9 2l1.8 3.6L15 6.6l-3 2.9.7 4.1L9 11.8l-3.7 1.8.7-4.1-3-2.9 4.2-.9L9 2z" stroke="#a78bfa" strokeWidth="1.4" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#a78bfa] mb-2">Path to Your Vision</p>
                          <p className="text-[14px] text-on-surface-variant leading-[1.75]">{pathToVision}</p>
                        </div>
                      </div>
                    </div>)}
                </div>
              </LockedSection>
            </section>
          </RevealSection_1.default>)}

        {/* 08 · Tools Analysis */}
        {hasStack && (<RevealSection_1.default>
            <section>
              <SectionLabel num="09" text="Tools Analysis"/>
              <h2 className="font-headline font-bold text-[clamp(22px,3vw,34px)] tracking-[-0.025em] text-on-surface mb-6">
                Stack Recommendations
              </h2>
              <div className="p-6 rounded-[16px] mb-4 bg-surface-container border border-outline-variant/10">
                <StackRatingBar rating={toolsAnalysis.current_stack_rating}/>
              </div>

              <LockedSection unlocked={unlocked} onUnlock={scrollToUnlock}>
                <div className="space-y-4">
                  {toolsAnalysis.biggest_friction_point && (<div className="p-5 rounded-[16px] relative overflow-hidden" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[16px] bg-[#f59e0b]"/>
                      <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#f59e0b] mb-2 pl-2">Biggest Friction Point</p>
                      <p className="text-[14px] text-on-surface-variant leading-[1.65] pl-2">{toolsAnalysis.biggest_friction_point}</p>
                    </div>)}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {addedTools.length > 0 && (<div className="p-5 rounded-[16px] bg-primary/5 border border-primary/15">
                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-4">Recommended Additions</p>
                        <div className="flex flex-wrap gap-2">
                          {addedTools.map(function (t) { return (<span key={t} className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}>
                              + {t}
                            </span>); })}
                        </div>
                      </div>)}
                    {removedTools.length > 0 && (<div className="p-5 rounded-[16px] bg-error/5 border border-error/12">
                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-on-surface-variant/50 mb-4">Potential Redundancies</p>
                        <div className="flex flex-wrap gap-2">
                          {removedTools.map(function (t) { return (<span key={t} className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                              {t}
                            </span>); })}
                        </div>
                      </div>)}
                  </div>
                </div>
              </LockedSection>
            </section>
          </RevealSection_1.default>)}

        {/* Unlock section */}
        {!unlocked && (<div ref={unlockRef}>
            <UnlockSection auditId={auditId} defaultEmail={contactEmail} onUnlocked={handleUnlocked}/>
          </div>)}

        {/* Final CTA */}
        <RevealSection_1.default>
          <section className="rounded-[22px] overflow-hidden relative p-10 sm:p-14 text-center bg-surface-container border-2 border-primary/30 shadow-[0_0_80px_rgba(173,198,255,0.1)]">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #adc6ff, #a78bfa, #4cd7f6)' }}/>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 100%, rgba(173,198,255,0.08) 0%, transparent 70%)' }}/>
            <div className="relative z-[1]">
              <badge_1.Badge variant="outline" className="inline-flex items-center gap-2 h-auto px-3.5 py-1.5 rounded-full border-primary/25 bg-primary/8 text-primary text-[11px] font-bold tracking-wider mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"/>
                DONE-FOR-YOU AUTOMATION
              </badge_1.Badge>
              <h2 className="font-headline font-extrabold text-[clamp(24px,3.5vw,40px)] tracking-[-0.03em] mb-4 text-on-surface">
                Want Us to Build This For You?
              </h2>
              <p className="text-[15px] text-on-surface-variant leading-[1.75] max-w-[480px] mx-auto mb-10">
                We take your audit results, design the exact workflows, and build them fully custom to your stack.
                You get running automations — not a to-do list.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button_1.Button asChild className="px-8 py-[15px] h-auto rounded-[13px] text-[15px] font-bold gap-2.5 shadow-[0_0_30px_rgba(173,198,255,0.3)] hover:shadow-[0_0_45px_rgba(173,198,255,0.5)] btn-spring">
                  <a href="https://calendly.com/opsradar-ai/ops-radar-strategy-call" target="_blank" rel="noopener noreferrer">
                    Book a Free Strategy Call →
                  </a>
                </button_1.Button>
                <button_1.Button onClick={function () { return setModalOpp('Full Automation Build'); }} variant="outline" className="px-7 py-[14px] h-auto rounded-[13px] text-[15px] font-semibold border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60 hover:text-on-surface bg-transparent">
                  Request a Build Quote →
                </button_1.Button>
              </div>
              <p className="mt-6 text-[12px] text-on-surface-variant/30">
                No pitch. No commitment. We&apos;ll scope the build and give you an exact price.
              </p>
            </div>
          </section>
        </RevealSection_1.default>

      </main>

      {modalOpp && (<BuildRequestModal oppTitle={modalOpp} contactName={contactName} contactEmail={contactEmail} auditId={auditId} onClose={function () { return setModalOpp(null); }}/>)}

      <footer className="py-8 px-6 text-center border-t border-outline-variant/10 bg-slate-950">
        <div className="max-w-[900px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-on-surface-variant/40">© 2026 OpsRadar</p>
          <p className="text-[12px] text-on-surface-variant/30">Generated {dateStr} · Powered by OpsRadar AI</p>
          <link_1.default href="/audit" className="text-[12px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
            Run Another Audit →
          </link_1.default>
        </div>
      </footer>
    </div>);
}
function ResultsPage() {
    return (<react_1.Suspense fallback={<div className="min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
      </div>}>
      <ResultsContent />
    </react_1.Suspense>);
}
