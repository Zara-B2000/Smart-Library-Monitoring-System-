import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── helpers ──────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const drift = (v, lo, hi, step = 3) => clamp(v + rand(-step, step), lo, hi);

const initSensor = () => ({
  noise: rand(38, 72),
  light: rand(180, 900),
  students: rand(14, 60),
  entry: rand(80, 140),
  exit: rand(60, 120),
  librarianPresent: Math.random() > 0.3,
  temp: rand(21, 30),
  humidity: rand(38, 78),
  airQuality: rand(30, 180),
  motionZoneA: rand(0, 100),
  motionZoneB: rand(0, 100),
  motionZoneC: rand(0, 100),
  motionZoneD: rand(0, 100),
  wifiSignal: rand(-80, -40),
  latency: rand(4, 80),
});

const buildHistory = (lo, hi, len = 12) =>
  Array.from({ length: len }, (_, i) => ({ t: `${i - len + 1}m`, v: rand(lo, hi) }));

// ── SVG Icon ──────────────────────────────────────────────────────────────────
const Ico = ({ d, size = 18, sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const PATHS = {
  noise:  "M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z",
  light:  "M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M18.36 5.64l1.41-1.41M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z",
  people: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  temp:   "M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z",
  drop:   "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z",
  wind:   "M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2",
  wifi:   "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  signal: "M2 20h.01M7 20v-4M12 20V10M17 20V4M22 20V2",
  entry:  "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3",
  exit:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  user:   "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  grid:   "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  clock:  "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v5l3 3",
  alert:  "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  book:   "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  chevL:  "M15 18l-6-6 6-6",
  chevR:  "M9 18l6-6-6-6",
};

// ── Radial Gauge ──────────────────────────────────────────────────────────────
const RadialGauge = ({ value, max, color, unit }) => {
  const pct = clamp(value / max, 0, 1);
  const r = 38, cx = 50, cy = 50;
  const toRad = d => (d * Math.PI) / 180;
  const startAngle = -210, sweep = 240;
  const arc = a => ({ x: cx + r * Math.cos(toRad(a)), y: cy + r * Math.sin(toRad(a)) });
  const endAngle = startAngle + sweep * pct;
  const s = arc(startAngle), e = arc(endAngle), bg = arc(startAngle + sweep);
  return (
    <svg width="100" height="82" viewBox="0 0 100 82">
      <path d={`M${s.x},${s.y} A${r},${r} 0 ${sweep > 180 ? 1 : 0},1 ${bg.x},${bg.y}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M${s.x},${s.y} A${r},${r} 0 ${sweep * pct > 180 ? 1 : 0},1 ${e.x},${e.y}`}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
      )}
      <text x="50" y="52" textAnchor="middle" fontSize="17" fontWeight="800"
        fill="white" fontFamily="'DM Mono',monospace">{value}</text>
      <text x="50" y="64" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)"
        fontFamily="'DM Sans',sans-serif">{unit}</text>
    </svg>
  );
};

// ── Signal bars ───────────────────────────────────────────────────────────────
const SignalBars = ({ dbm }) => {
  const pct = clamp((dbm + 90) / 50, 0, 1);
  const bars = 5, active = Math.round(pct * bars);
  const color = pct > 0.6 ? "#34d399" : pct > 0.35 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 22 }}>
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} style={{ width: 5, height: 5 + i * 4, borderRadius: 2,
          background: i < active ? color : "rgba(255,255,255,0.1)",
          transition: "background 0.4s", boxShadow: i < active ? `0 0 5px ${color}66` : "none" }} />
      ))}
    </div>
  );
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
const MiniTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
      padding: "3px 9px", fontSize: 11, color: "white", fontFamily: "'DM Mono',monospace" }}>
      {payload[0].value}
    </div>
  );
};

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => {
  const map = {
    green:  { bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)",  text: "#34d399" },
    yellow: { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  text: "#fbbf24" },
    red:    { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", text: "#f87171" },
    blue:   { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  text: "#60a5fa" },
    purple: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", text: "#a78bfa" },
  };
  const s = map[color] || map.green;
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 999,
      padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10, color: s.text, fontFamily: "'DM Sans',sans-serif", fontWeight: 700,
      letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.text,
        boxShadow: `0 0 5px ${s.text}`, display: "inline-block" }} />
      {label}
    </span>
  );
};

// ── Progress bar ──────────────────────────────────────────────────────────────
const Bar2 = ({ value, max, color, h = 6 }) => (
  <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 999, height: h, overflow: "hidden" }}>
    <div style={{ width: `${clamp((value / max) * 100, 0, 100)}%`, height: "100%",
      borderRadius: 999, background: color, transition: "width 0.6s ease",
      boxShadow: `0 0 8px ${color}44` }} />
  </div>
);

// ── Card ──────────────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18, padding: "18px 20px", backdropFilter: "blur(16px)", ...style,
  }}>{children}</div>
);

const SectionHead = ({ title, icon }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
    <span style={{ color: "#818cf8" }}><Ico d={PATHS[icon]} size={16} /></span>
    <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 11,
      letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
      {title}
    </span>
  </div>
);

const CardLabel = ({ text }) => (
  <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13,
    color: "rgba(255,255,255,0.75)", marginBottom: 14, letterSpacing: "0.01em" }}>{text}</div>
);

// ── Zone row ──────────────────────────────────────────────────────────────────
const ZoneRow = ({ name, value }) => {
  const busy = value > 65, mod = value > 35;
  const color = busy ? "#f87171" : mod ? "#fbbf24" : "#34d399";
  const label = busy ? "Busy" : mod ? "Moderate" : "Calm";
  const variant = busy ? "red" : mod ? "yellow" : "green";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600,
          fontFamily: "'DM Sans',sans-serif" }}>{name}</span>
        <Badge label={label} color={variant} />
      </div>
      <Bar2 value={value} max={100} color={color} h={5} />
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LibraryIoTDashboard() {
  const [sensor, setSensor] = useState(initSensor);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(new Date());
  const histRef = useRef({
    temp: buildHistory(21, 30), humidity: buildHistory(38, 78),
    aq: buildHistory(30, 180), noise: buildHistory(38, 72),
    latency: buildHistory(4, 80),
  });

  useEffect(() => {
    const id = setInterval(() => {
      setSensor(p => ({
        noise: drift(p.noise, 30, 90, 4),
        light: drift(p.light, 120, 1000, 30),
        students: drift(p.students, 5, 80, 2),
        entry: p.entry + (Math.random() > 0.7 ? rand(1, 3) : 0),
        exit: p.exit + (Math.random() > 0.75 ? rand(1, 2) : 0),
        librarianPresent: Math.random() > 0.06 ? p.librarianPresent : !p.librarianPresent,
        temp: drift(p.temp, 19, 34, 0.5),
        humidity: drift(p.humidity, 30, 85, 1),
        airQuality: drift(p.airQuality, 20, 200, 5),
        motionZoneA: drift(p.motionZoneA, 0, 100, 6),
        motionZoneB: drift(p.motionZoneB, 0, 100, 6),
        motionZoneC: drift(p.motionZoneC, 0, 100, 6),
        motionZoneD: drift(p.motionZoneD, 0, 100, 6),
        wifiSignal: drift(p.wifiSignal, -85, -35, 2),
        latency: drift(p.latency, 2, 120, 4),
      }));
      const h = histRef.current;
      const upd = (arr, v) => [...arr.slice(1), { t: "•", v }];
      h.temp = upd(h.temp, rand(21, 30));
      h.humidity = upd(h.humidity, rand(38, 78));
      h.aq = upd(h.aq, rand(30, 180));
      h.noise = upd(h.noise, rand(38, 72));
      h.latency = upd(h.latency, rand(4, 80));
      setNow(new Date());
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const s = sensor;
  const h = histRef.current;

  // derived
  const noiseColor = s.noise > 65 ? "#f87171" : s.noise > 50 ? "#fbbf24" : "#34d399";
  const noiseLabel = s.noise > 65 ? "Too Noisy" : s.noise > 50 ? "Moderate" : "Comfortable";
  const noiseV     = s.noise > 65 ? "red" : s.noise > 50 ? "yellow" : "green";
  const lightColor = s.light < 250 ? "#f87171" : s.light < 500 ? "#fbbf24" : "#fbbf24";
  const lightLabel = s.light < 250 ? "Too Dark" : s.light < 500 ? "Dim" : "Well Lit";
  const lightV     = s.light < 250 ? "red" : s.light < 500 ? "yellow" : "green";
  const tempColor  = s.temp > 30 ? "#f87171" : "#34d399";
  const tempV      = s.temp > 30 ? "red" : "green";
  const humColor   = s.humidity > 70 ? "#fbbf24" : "#60a5fa";
  const humV       = s.humidity > 70 ? "yellow" : "blue";
  const aqColor    = s.airQuality > 150 ? "#f87171" : "#a78bfa";
  const aqV        = s.airQuality > 150 ? "red" : "purple";
  const wifiPct    = clamp((s.wifiSignal + 90) / 50, 0, 1);
  const wifiLabel  = wifiPct > 0.6 ? "Excellent" : wifiPct > 0.35 ? "Fair" : "Poor";
  const wifiV      = wifiPct > 0.6 ? "green" : wifiPct > 0.35 ? "yellow" : "red";
  const latV       = s.latency > 60 ? "red" : s.latency > 30 ? "yellow" : "green";
  const latColor   = s.latency > 60 ? "#f87171" : s.latency > 30 ? "#fbbf24" : "#34d399";

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const NAV = [
    { id: "dashboard", icon: "grid",     label: "Dashboard" },
    { id: "comfort",   icon: "light",    label: "Comfort" },
    { id: "access",    icon: "people",   label: "Access" },
    { id: "env",       icon: "wind",     label: "Environment" },
    { id: "zones",     icon: "signal",   label: "Zones & Net" },
    { id: "activity",  icon: "activity", label: "Activity Log" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#07091a", minHeight: "100vh",
      display: "flex", color: "white", position: "relative", overflow: "hidden" }}>

      {/* mesh bg */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", width: 700, height: 700, top: -250, left: -250, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 65%)" }} />
        <div style={{ position: "absolute", width: 600, height: 600, bottom: -200, right: -100, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(16,185,129,0.07) 0%,transparent 65%)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, top: "35%", left: "55%", borderRadius: "50%",
          background: "radial-gradient(circle,rgba(248,113,113,0.05) 0%,transparent 65%)" }} />
        {/* subtle grid lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.025 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 L0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside style={{ width: collapsed ? 64 : 210, minHeight: "100vh", zIndex: 10, flexShrink: 0,
        background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)", transition: "width 0.28s ease",
        overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* logo */}
        <div style={{ padding: "18px 14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#818cf8 0%,#34d399 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(129,140,248,0.4)" }}>
            <Ico d={PATHS.book} size={17} sw={2} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.05em", color: "white" }}>LIBRARY</div>
              <div style={{ fontSize: 8, letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>IOT MONITOR</div>
            </div>
          )}
        </div>

        {/* nav items */}
        <nav style={{ padding: "10px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ id, icon, label }) => {
            const active = activeNav === id;
            return (
              <button key={id} onClick={() => setActiveNav(id)}
                title={collapsed ? label : ""}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: collapsed ? "10px" : "9px 12px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: 10, border: active ? "1px solid rgba(129,140,248,0.25)" : "1px solid transparent",
                  background: active ? "rgba(129,140,248,0.13)" : "transparent",
                  color: active ? "#a5b4fc" : "rgba(255,255,255,0.35)",
                  fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12.5,
                  cursor: "pointer", transition: "all 0.18s", textAlign: "left" }}>
                <span style={{ color: active ? "#818cf8" : "rgba(255,255,255,0.28)", flexShrink: 0 }}>
                  <Ico d={PATHS[icon]} size={17} />
                </span>
                {!collapsed && label}
              </button>
            );
          })}
        </nav>

        {/* collapse toggle */}
        <button onClick={() => setCollapsed(c => !c)}
          style={{ margin: "8px 10px", padding: 9, borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.3)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico d={collapsed ? PATHS.chevR : PATHS.chevL} size={14} />
        </button>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", zIndex: 1, minWidth: 0 }}>

        {/* HEADER */}
        <header style={{ height: 62, padding: "0 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.018)", backdropFilter: "blur(14px)", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em", color: "white" }}>
              Library IoT Dashboard
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.02em" }}>
              {dateStr}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* live clock */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 13px",
              borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#818cf8" }}><Ico d={PATHS.clock} size={14} /></span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600,
                color: "rgba(255,255,255,0.65)" }}>{timeStr}</span>
            </div>
            {/* status pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px",
              borderRadius: 999, background: "rgba(52,211,153,0.09)", border: "1px solid rgba(52,211,153,0.22)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399",
                boxShadow: "0 0 8px #34d399", animation: "blink 2s infinite", display: "inline-block" }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: "#34d399", letterSpacing: "0.05em" }}>SYSTEM ONLINE</span>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, overflowY: "auto", padding: "20px 22px 36px",
          display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ══ SECTION A: Study Comfort ═══════════════════════════════════════ */}
          <section>
            <SectionHead title="Study Comfort Monitoring" icon="noise" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

              {/* NOISE */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: noiseColor }}><Ico d={PATHS.noise} size={18} /></span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Noise Level</span>
                  </div>
                  <Badge label={noiseLabel} color={noiseV} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <RadialGauge value={s.noise} max={100} color={noiseColor} unit="dB" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Level</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "white" }}>{s.noise} dB</span>
                    </div>
                    <Bar2 value={s.noise} max={100} color={noiseColor} />
                    <div style={{ height: 60, marginTop: 10 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={h.noise}>
                          <Line type="monotone" dataKey="v" stroke={noiseColor} strokeWidth={2} dot={false} />
                          <Tooltip content={<MiniTip />} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </Card>

              {/* LIGHT */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: lightColor }}><Ico d={PATHS.light} size={18} /></span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Light Intensity</span>
                  </div>
                  <Badge label={lightLabel} color={lightV} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <RadialGauge value={s.light} max={1000} color={lightColor} unit="lux" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Intensity</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "white" }}>{s.light} lx</span>
                    </div>
                    <Bar2 value={s.light} max={1000} color={lightColor} />
                    <div style={{ height: 60, marginTop: 10 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={h.noise.map(() => ({ v: rand(200, 1000) }))}>
                          <Bar dataKey="v" fill={`${lightColor}33`} radius={[3,3,0,0]} />
                          <Tooltip content={<MiniTip />} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* ══ SECTION B + C: Access & Environment ═══════════════════════════ */}
          <section>
            <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr 1fr", gap: 14 }}>

              {/* ACCESS */}
              <Card>
                <CardLabel text="Library Access & Supervision" />

                {/* big occupancy */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 14,
                  background: "rgba(129,140,248,0.07)", border: "1px solid rgba(129,140,248,0.14)",
                  marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Currently Inside</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 38, fontWeight: 800,
                      color: "white", lineHeight: 1 }}>{s.students}</div>
                    <div style={{ fontSize: 10, color: "#818cf8", fontWeight: 700, marginTop: 2 }}>students</div>
                  </div>
                  <div style={{ width: 50, height: 50, borderRadius: "50%",
                    background: "rgba(129,140,248,0.12)", border: "2px solid rgba(129,140,248,0.28)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8" }}>
                    <Ico d={PATHS.people} size={22} />
                  </div>
                </div>

                {/* entry / exit */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "ENTRIES", icon: "entry", val: s.entry, color: "#34d399", bg: "rgba(52,211,153,0.07)", border: "rgba(52,211,153,0.14)" },
                    { label: "EXITS",   icon: "exit",  val: s.exit,  color: "#f87171", bg: "rgba(248,113,113,0.07)", border: "rgba(248,113,113,0.14)" },
                  ].map(({ label, icon, val, color, bg, border }) => (
                    <div key={label} style={{ padding: "10px 12px", borderRadius: 12, background: bg, border: `1px solid ${border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ color }}><Ico d={PATHS[icon]} size={14} /></span>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.06em" }}>{label}</span>
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, fontWeight: 800, color }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* librarian */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 13px", borderRadius: 12,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}><Ico d={PATHS.user} size={15} /></span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>Librarian</span>
                  </div>
                  <Badge label={s.librarianPresent ? "Present" : "Not Present"} color={s.librarianPresent ? "green" : "red"} />
                </div>
              </Card>

              {/* TEMPERATURE */}
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: tempColor }}><Ico d={PATHS.temp} size={16} /></span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Temperature</span>
                  </div>
                  <Badge label={s.temp > 30 ? "HIGH" : "Normal"} color={tempV} />
                </div>

                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 46, fontWeight: 800,
                    color: tempColor, lineHeight: 1, transition: "color 0.4s",
                    textShadow: `0 0 20px ${tempColor}44` }}>
                    {s.temp.toFixed(1)}
                  </span>
                  <sup style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans',sans-serif" }}>°C</sup>
                </div>

                <Bar2 value={s.temp} max={40} color={tempColor} />

                <div style={{ height: 72, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={h.temp}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                      <Line type="monotone" dataKey="v" stroke={tempColor} strokeWidth={2} dot={false} />
                      <Tooltip content={<MiniTip />} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {s.temp > 30 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10,
                    padding: "6px 10px", borderRadius: 8,
                    background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.18)" }}>
                    <span style={{ color: "#f87171" }}><Ico d={PATHS.alert} size={13} /></span>
                    <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700 }}>Above comfortable threshold</span>
                  </div>
                )}
              </Card>

              {/* HUMIDITY + AIR */}
              <Card>
                <CardLabel text="Humidity & Air Quality" />

                {/* humidity */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: humColor }}><Ico d={PATHS.drop} size={14} /></span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Humidity</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 800, color: humColor }}>{s.humidity}%</span>
                      {s.humidity > 70 && <Badge label="HIGH" color="yellow" />}
                    </div>
                  </div>
                  <Bar2 value={s.humidity} max={100} color={humColor} />
                  <div style={{ height: 48, marginTop: 6 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={h.humidity}>
                        <Line type="monotone" dataKey="v" stroke={humColor} strokeWidth={1.5} dot={false} />
                        <Tooltip content={<MiniTip />} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 14 }} />

                {/* air quality */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: aqColor }}><Ico d={PATHS.wind} size={14} /></span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Air Quality (PM2.5)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 800, color: aqColor }}>{s.airQuality}</span>
                      {s.airQuality > 150 && <Badge label="POOR" color="red" />}
                    </div>
                  </div>
                  <Bar2 value={s.airQuality} max={200} color={aqColor} />
                  <div style={{ height: 48, marginTop: 6 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={h.aq}>
                        <Bar dataKey="v" fill={`${aqColor}33`} radius={[2,2,0,0]} />
                        <Tooltip content={<MiniTip />} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* ══ SECTION D: Zones + Connectivity ═══════════════════════════════ */}
          <section>
            <SectionHead title="Zone Activity & Connectivity" icon="signal" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

              {/* ZONE ACTIVITY */}
              <Card>
                <CardLabel text="Zone Motion Activity" />
                <ZoneRow name="Zone A — Reading Hall"     value={s.motionZoneA} />
                <ZoneRow name="Zone B — Study Cubicles"   value={s.motionZoneB} />
                <ZoneRow name="Zone C — Computer Area"    value={s.motionZoneC} />
                <ZoneRow name="Zone D — Entrance Lobby"   value={s.motionZoneD} />

                {/* summary bar chart */}
                <div style={{ height: 80, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { z: "A", v: s.motionZoneA },
                      { z: "B", v: s.motionZoneB },
                      { z: "C", v: s.motionZoneC },
                      { z: "D", v: s.motionZoneD },
                    ]}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="z" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                      <Bar dataKey="v" fill="#818cf833" radius={[4,4,0,0]}
                        label={{ position: "top", fontSize: 9, fill: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace" }} />
                      <Tooltip content={<MiniTip />} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* CONNECTIVITY */}
              <Card>
                <CardLabel text="Network Connectivity" />

                {/* wifi */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 15px", borderRadius: 13,
                  background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.14)",
                  marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 5 }}>Wi-Fi Signal Strength</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <SignalBars dbm={s.wifiSignal} />
                      <Badge label={wifiLabel} color={wifiV} />
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11,
                      color: "rgba(255,255,255,0.4)", marginTop: 5 }}>{s.wifiSignal} dBm</div>
                  </div>
                  <span style={{ color: "#60a5fa", opacity: 0.6 }}><Ico d={PATHS.wifi} size={26} /></span>
                </div>

                {/* latency */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Network Latency</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 800, color: latColor }}>{s.latency} ms</span>
                      <Badge label={s.latency > 60 ? "High" : s.latency > 30 ? "Medium" : "Low"} color={latV} />
                    </div>
                  </div>
                  <Bar2 value={s.latency} max={120} color={latColor} />
                </div>

                <div style={{ height: 90 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={h.latency}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="t" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} width={24} />
                      <Line type="monotone" dataKey="v" stroke={latColor} strokeWidth={2} dot={false}
                        style={{ filter: `drop-shadow(0 0 4px ${latColor}66)` }} />
                      <Tooltip content={<MiniTip />} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </section>

        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;600;700;800&display=swap');
        @keyframes blink {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(0.8); }
        }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:999px; }
      `}</style>
    </div>
  );
}
